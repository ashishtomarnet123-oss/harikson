import { Pool } from 'pg';

let primaryPool: Pool | null = null;

export function getDbPool(): Pool {
  if (!primaryPool) {
    const connectionString =
      process.env.DATABASE_URL ||
      'postgresql://neuravolt:neuravolt_dev_pwd@localhost:5432/neuravolt';

    primaryPool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return primaryPool;
}

export default getDbPool;
