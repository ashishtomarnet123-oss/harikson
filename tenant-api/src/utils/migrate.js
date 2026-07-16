import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations(pool) {
  logger.info('⚙️ Running database migrations...');
  try {
    // 1. Ensure schema_migrations exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 2. Read migration files from src/migrations
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      logger.info('⚠️ Migrations directory not found, skipping migrations.');
      return;
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort(); // Sort sequentially (e.g. 001, 002, 003)

    // 3. Query already applied migrations
    const { rows } = await pool.query('SELECT version FROM schema_migrations');
    const applied = new Set(rows.map(r => r.version));

    // 4. Apply new migrations in order
    for (const file of files) {
      if (applied.has(file)) {
        continue;
      }

      logger.info(`🚀 Applying migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      // Run migration inside a transaction
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
        await client.query('COMMIT');
        logger.info(`   ✓ Migration applied successfully: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        logger.error(`❌ Migration failed: ${file}. Transaction rolled back.`, err);
        throw err;
      } finally {
        client.release();
      }
    }
    logger.info('🎉 All database migrations are up to date.');
  } catch (err) {
    logger.error('❌ Database migration runner failed:', err);
    throw err;
  }
}
