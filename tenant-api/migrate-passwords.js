import pg from 'pg';
import bcrypt from 'bcrypt';

const { Pool } = pg;
const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://neuravolt:neuravolt_dev_pwd@postgres:5432/neuravolt';

async function main() {
  const pool = new Pool({ connectionString });

  try {
    console.log('🔄 Checking database for plaintext passwords...');
    const result = await pool.query(
      'SELECT id, email, password_hash FROM users'
    );

    let updatedCount = 0;

    for (const row of result.rows) {
      // If it doesn't start with $2a$ or $2b$, hash it
      if (!row.password_hash.startsWith('$')) {
        console.log(`  Hashing plaintext password for user: ${row.email}`);
        const hashed = await bcrypt.hash(row.password_hash, 10);
        await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [
          hashed,
          row.id,
        ]);
        updatedCount++;
      }
    }

    console.log(
      `✅ Password migration complete. Hashed and updated ${updatedCount} users.`
    );
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
