import { Pool } from 'pg';

let primaryPool: Pool | null = null;

export function getDbPool(): Pool {
  if (!primaryPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required');
    }

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
