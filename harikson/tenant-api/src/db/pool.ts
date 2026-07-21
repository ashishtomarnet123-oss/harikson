import pg from 'pg';
import { RequestContext, requestContext } from '../utils/context.js';
import logger from '../utils/logger.js';
import { traceQuery } from '../utils/queryLogger.js';

const { Pool } = pg;

export { RequestContext, requestContext };

export const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://neuravolt:neuravolt_dev_pwd@postgres:5432/neuravolt',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export const readPool = new Pool({
  connectionString:
    process.env.DATABASE_READ_URL ||
    process.env.DATABASE_URL ||
    'postgresql://neuravolt:neuravolt_dev_pwd@postgres:5432/neuravolt',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Wrap pool query functions for tracing
const wrapPoolQuery = (p: pg.Pool, name: string) => {
  const originalQuery = p.query;
  // @ts-ignore
  p.query = function (text: any, params: any, callback: any) {
    return traceQuery(logger, name, text, originalQuery, p, Array.from(arguments));
  };
};

wrapPoolQuery(pool, 'PrimaryPool');
wrapPoolQuery(readPool, 'ReadReplicaPool');

// Log any pool errors to prevent crashes, letting pg pool reconnect on demand
pool.on('error', (err) => {
  logger.error('Unexpected DB pool error:', err);
});

readPool.on('error', (err) => {
  logger.error('Unexpected DB read pool error:', err);
});

export async function checkDbHealth(): Promise<boolean> {
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      return true;
    } finally {
      client.release();
    }
  } catch (err) {
    logger.error('Database health check failed:', err);
    return false;
  }
}

// Helper: Acquire a verified clean connection from the pool
export async function connectWithValidation(useReplica = false): Promise<pg.PoolClient> {
  let client: pg.PoolClient | undefined;
  let retries = 3;

  const store = RequestContext.getStore();
  const req = store?.req;
  const usePrimaryDb = RequestContext.isUsePrimaryDb() || req?.usePrimaryDb || false;

  let shouldReadFromReplica = useReplica;

  if (usePrimaryDb) {
    shouldReadFromReplica = false;
  } else if (req && req.method === 'GET') {
    const isCriticalPath =
      req.path?.startsWith('/api/auth') ||
      req.path?.startsWith('/api/billing') ||
      req.path?.startsWith('/api/subscription') ||
      req.path?.startsWith('/api/invoices') ||
      req.path?.startsWith('/api/user/security') ||
      req.path?.startsWith('/api/user/2fa');

    if (!isCriticalPath && !usePrimaryDb) {
      shouldReadFromReplica = true;
    }
  }

  const targetPool = shouldReadFromReplica ? readPool : pool;
  let delay = 500;
  while (retries > 0) {
    try {
      client = await targetPool.connect();

      // Wrap client query function for tracing
      const originalClientQuery = client.query;
      // @ts-ignore
      client.query = function (text: any, params: any, callback: any) {
        return traceQuery(logger, 'Client', text, originalClientQuery, client, Array.from(arguments));
      };

      const valRes = await client.query(
        "SELECT current_setting('app.current_tenant', true) AS tenant"
      );
      const currentTenant = valRes.rows[0]?.tenant;
      if (currentTenant && currentTenant.trim() !== '') {
        throw new Error(
          `Connection pollution detected: app.current_tenant is already set to "${currentTenant}"`
        );
      }
      return client;
    } catch (err: any) {
      if (err.message.includes('unrecognized configuration parameter')) {
        if (client) return client;
      }
      try {
        if (client) client.release(true); // Discard on error
      } catch (releaseErr) {
        // Ignored
      }
      retries--;
      if (retries === 0) {
        throw new Error(`Failed to acquire a clean database connection: ${err.message}`);
      }
      logger.warn(`Database connection failed: ${err.message}. Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
  throw new Error('Failed to acquire a clean database connection');
}

export async function executeTenantQuery<T>(
  tenantId: string,
  callback: (client: pg.PoolClient) => Promise<T>,
  useReplica = false
): Promise<T> {
  const isPrimaryForced = RequestContext.isUsePrimaryDb();
  const effectiveUseReplica = isPrimaryForced ? false : useReplica;

  const client = await connectWithValidation(effectiveUseReplica);
  let contextSet = false;
  try {
    // Set RLS context on the connection
    await client.query("SELECT set_config('app.current_tenant', $1, false)", [
      tenantId,
    ]);
    contextSet = true;

    // Assert tenant context is set correctly
    await client.query('SELECT assert_tenant_context()');

    // Run the queries
    const result = await callback(client);
    return result;
  } catch (err) {
    throw err;
  } finally {
    if (contextSet) {
      try {
        // Clear context to prevent leakage to subsequent checkouts of this connection
        await client.query(
          "SELECT set_config('app.current_tenant', '', false)"
        );
        client.release();
      } catch (resetErr) {
        logger.error(
          '[DB FATAL] Failed to reset tenant context, destroying connection:',
          resetErr
        );
        // Mark connection as bad and discard it from pool
        client.release(true);
      }
    } else {
      client.release();
    }
  }
}

// Replication Lag Monitoring
async function checkReplicationLag() {
  try {
    const res = await readPool.query(`
      SELECT 
        CASE 
          WHEN pg_is_in_recovery() THEN 
            COALESCE(EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())), 0)
          ELSE 0 
        END AS lag_seconds
    `);
    const lag = parseFloat(res.rows[0]?.lag_seconds || '0');
    if (lag > 5) {
      logger.error(`🚨 [ALERT] Replication lag is too high: ${lag} seconds!`);
    }
  } catch (err: any) {
    if (!err.message.includes('pg_last_xact_replay_timestamp') && !err.message.includes('pg_is_in_recovery')) {
      logger.error('Failed to check replication lag:', err);
    }
  }
}
setInterval(checkReplicationLag, 5000);
