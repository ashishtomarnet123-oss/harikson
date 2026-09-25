import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { runMigrations } from './migrate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '..', '..', '..', '.env') });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('❌ Error: DATABASE_URL environment variable is required.');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: dbUrl,
  connectionTimeoutMillis: 10000,
});

async function main() {
  console.log(`[Migrate CLI] Connecting to PostgreSQL at ${dbUrl.replace(/:[^:@]*@/, ':****@')}...`);
  try {
    await runMigrations(pool);
    console.log('✅ [Migrate CLI] Migrations completed successfully.');
    await pool.end();
    process.exit(0);
  } catch (err: any) {
    console.error('❌ [Migrate CLI] Migration failed:', err?.message || err);
    await pool.end();
    process.exit(1);
  }
}

main();
