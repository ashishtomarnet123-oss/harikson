import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import logger from './logger.js';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// PostgreSQL advisory lock ID dedicated to Xarwiz migration synchronization
const MIGRATION_ADVISORY_LOCK_ID = 742189;

/**
 * Calculates SHA-256 checksum of migration SQL contents
 */
export function calculateMigrationChecksum(sqlContent: string): string {
  return crypto.createHash('sha256').update(sqlContent.trim()).digest('hex');
}

/**
 * Validates integrity and executes pending database migrations sequentially.
 * Employs PostgreSQL advisory locks to guarantee atomic execution across clustered pods.
 */
export async function runMigrations(pool: pg.Pool) {
  logger.info('⚙️ Running database migrations...');
  const lockClient = await pool.connect();

  try {
    // If connected as least-privilege application runtime role, skip DDL execution
    const userRes = await lockClient.query('SELECT CURRENT_USER as u');
    const currentUser = userRes.rows[0]?.u;
    if (currentUser === 'xarwiz_tenant_app' || currentUser === 'xarwiz_admin_app') {
      logger.info(`[DB] Least-privilege role "${currentUser}" detected — DDL schema managed externally.`);
      return;
    }
    // 1. Acquire session-level advisory lock to serialize concurrent pod startups
    await lockClient.query('SELECT pg_advisory_lock($1)', [MIGRATION_ADVISORY_LOCK_ID]);

    // 2. Ensure migrations_meta exists with checksum column
    await lockClient.query(`
      CREATE TABLE IF NOT EXISTS migrations_meta (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        checksum VARCHAR(64) NOT NULL,
        executed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Read migration files from src/migrations
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      logger.info('⚠️ Migrations directory not found, skipping migrations.');
      return;
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql') && !f.startsWith('.'))
      .sort(); // Strictly sequential order (001, 002, ...)

    // 4. Query already applied migrations
    const { rows } = await lockClient.query('SELECT filename, checksum FROM migrations_meta');
    const appliedMap = new Map<string, string>(rows.map((r) => [r.filename, r.checksum]));

    // 5. Apply new migrations and backfill/validate checksums
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      const currentChecksum = calculateMigrationChecksum(sql);

      if (appliedMap.has(file)) {
        const storedChecksum = appliedMap.get(file);
        // Backfill legacy placeholder 'hash' with real SHA-256 checksum
        if (storedChecksum === 'hash') {
          await lockClient.query(
            'UPDATE migrations_meta SET checksum = $1 WHERE filename = $2',
            [currentChecksum, file]
          );
        } else if (storedChecksum && storedChecksum !== currentChecksum) {
          logger.warn(
            `🚨 [SCHEMA DRIFT] Migration file "${file}" has been modified since it was applied! (Stored: ${storedChecksum.substring(0, 8)}..., Current: ${currentChecksum.substring(0, 8)}...)`
          );
        }
        continue;
      }

      logger.info(`🚀 Applying migration: ${file}...`);

      // Strip manual standalone BEGIN/COMMIT so the migration runs cleanly within the runner's transaction block
      const sanitizedSql = sql
        .replace(/^\s*BEGIN\s*;/gim, '')
        .replace(/^\s*COMMIT\s*;/gim, '');

      // Execute migration inside a dedicated atomic transaction
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sanitizedSql);
        await client.query(
          'INSERT INTO migrations_meta (filename, checksum) VALUES ($1, $2)',
          [file, currentChecksum]
        );
        await client.query('COMMIT');
        logger.info(`   ✓ Migration applied successfully: ${file} (checksum: ${currentChecksum.substring(0, 8)}...)`);
      } catch (err: any) {
        try {
          await client.query('ROLLBACK');
        } catch (_) {}
        logger.error(`❌ Migration failed: ${file}. Transaction rolled back.`, err);
        throw err;
      } finally {
        client.release();
      }
    }

    logger.info('🎉 All database migrations are up to date and verified.');
  } catch (err: any) {
    logger.error('❌ Database migration runner failed:', err);
    throw err;
  } finally {
    try {
      await lockClient.query('SELECT pg_advisory_unlock($1)', [MIGRATION_ADVISORY_LOCK_ID]);
    } catch (_) {}
    lockClient.release();
  }
}

/**
 * Integrity inspection helper: checks migration files against applied database records
 */
export async function verifyMigrationIntegrity(pool: pg.Pool): Promise<{
  totalOnDisk: number;
  totalApplied: number;
  pending: string[];
  drifts: string[];
}> {
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    return { totalOnDisk: 0, totalApplied: 0, pending: [], drifts: [] };
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql') && !f.startsWith('.'))
    .sort();

  const { rows } = await pool.query('SELECT filename, checksum FROM migrations_meta');
  const appliedMap = new Map<string, string>(rows.map((r) => [r.filename, r.checksum]));

  const pending: string[] = [];
  const drifts: string[] = [];

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');
    const currentChecksum = calculateMigrationChecksum(sql);

    if (!appliedMap.has(file)) {
      pending.push(file);
    } else {
      const storedChecksum = appliedMap.get(file);
      if (storedChecksum && storedChecksum !== 'hash' && storedChecksum !== currentChecksum) {
        drifts.push(file);
      }
    }
  }

  return {
    totalOnDisk: files.length,
    totalApplied: appliedMap.size,
    pending,
    drifts,
  };
}
