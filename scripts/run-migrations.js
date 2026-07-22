import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationsDir = path.join(__dirname, '../harikson/tenant-api/src/migrations');

// Database Connection Configuration
const pool = new Pool({
  host: process.env.DB_HOST || process.env.PGHOST || 'localhost',
  port: parseInt(process.env.DB_PORT || process.env.PGPORT || '5432', 10),
  user: process.env.DB_USER || process.env.PGUSER || 'postgres',
  password: process.env.DB_PASSWORD || process.env.PGPASSWORD || 'postgres',
  database: process.env.DB_NAME || process.env.PGDATABASE || 'neuravolt',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

export async function runMigrations() {
  console.log('🚀 Starting Database Migration Runner...');
  const client = await pool.connect();

  try {
    // 1. Ensure migrations_meta tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations_meta (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          filename VARCHAR(255) UNIQUE NOT NULL,
          checksum VARCHAR(64) NOT NULL,
          executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Read and sort all SQL migration files
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    console.log(`📂 Found ${files.length} migration files in ${migrationsDir}`);

    let executedCount = 0;
    let skippedCount = 0;

    for (const filename of files) {
      const filePath = path.join(migrationsDir, filename);
      const sqlContent = fs.readFileSync(filePath, 'utf8');
      const checksum = crypto.createHash('sha256').update(sqlContent).digest('hex');

      // Check execution history
      const res = await client.query(
        'SELECT checksum FROM migrations_meta WHERE filename = $1',
        [filename]
      );

      if (res.rows.length > 0) {
        const storedChecksum = res.rows[0].checksum;
        if (storedChecksum !== checksum) {
          console.error(
            `❌ FATAL: Checksum mismatch for migration "${filename}"!`
          );
          console.error(`   Stored:   ${storedChecksum}`);
          console.error(`   Computed: ${checksum}`);
          console.error('   Aborting migrations due to detected file tampering.');
          process.exit(1);
        }
        console.log(`  [SKIP] ${filename} (Already executed)`);
        skippedCount++;
        continue;
      }

      // Execute migration in an isolated transaction
      await client.query('BEGIN');
      try {
        await client.query(sqlContent);
        await client.query(
          'INSERT INTO migrations_meta (filename, checksum) VALUES ($1, $2)',
          [filename, checksum]
        );
        await client.query('COMMIT');
        console.log(`  [OK] ${filename} executed successfully.`);
        executedCount++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`❌ ERROR executing migration "${filename}":`, err.message);
        throw err;
      }
    }

    console.log(`\n✅ Migration run complete. Executed: ${executedCount}, Skipped: ${skippedCount}`);
  } catch (err) {
    console.error('❌ Migration runner failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

if (process.argv[1] === __filename) {
  runMigrations();
}
