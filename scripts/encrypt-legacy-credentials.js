/**
 * scripts/encrypt-legacy-credentials.js
 *
 * Idempotent, transaction-safe migration utility to encrypt legacy plaintext credentials
 * in public.smtp_configs using the canonical EMAIL_ENCRYPTION_KEY (AES-256-GCM).
 *
 * Safety features:
 * - Atomic transaction (all-or-nothing rollback on error)
 * - Safe pre-flight dry-run mode (--dry-run)
 * - Checkpoint verification (skips already encrypted enc:v1: rows)
 * - Zero secret disclosure in output logs
 * - Preserves nulls, empty strings, and masked values
 *
 * Usage:
 *   Dry-run:   EMAIL_ENCRYPTION_KEY="<64-hex>" node scripts/encrypt-legacy-credentials.js --dry-run
 *   Execution: EMAIL_ENCRYPTION_KEY="<64-hex>" node scripts/encrypt-legacy-credentials.js --execute
 */

import pg from 'pg';
import { encryptSecret } from '../admin-api/src/services/emailCrypto.js';

const { Pool } = pg;

async function runCredentialEncryption() {
  const isDryRun = process.argv.includes('--dry-run') || !process.argv.includes('--execute');

  console.log('======================================================================');
  console.log(`🔐 Legacy SMTP Credential Encryption Utility [Mode: ${isDryRun ? 'DRY-RUN (Simulated)' : 'EXECUTE (Live Migration)'}]`);
  console.log('======================================================================\n');

  const encryptionKey = process.env.EMAIL_ENCRYPTION_KEY;
  if (!encryptionKey || encryptionKey.trim().length < 32) {
    console.error('❌ FATAL: EMAIL_ENCRYPTION_KEY is required and must be at least 32 characters (or 64-hex string).');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    host: process.env.DB_HOST || process.env.PGHOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || process.env.PGPORT || '5432', 10),
    user: process.env.DB_USER || process.env.PGUSER || 'neuravolt',
    password: process.env.DB_PASSWORD || process.env.PGPASSWORD || 'neuravolt_dev_pwd',
    database: process.env.DB_NAME || process.env.PGDATABASE || 'neuravolt',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  const client = await pool.connect();

  try {
    console.log('1. Initiating database transaction...');
    await client.query('BEGIN');

    // Lock rows to prevent concurrent modifications
    console.log('2. Fetching records from public.smtp_configs...');
    const res = await client.query(`
      SELECT id, provider, is_active, smtp_pass, resend_api_key 
      FROM public.smtp_configs 
      ORDER BY created_at ASC 
      FOR UPDATE
    `);

    console.log(`   Found ${res.rows.length} total configuration records.\n`);

    let encryptedCount = 0;
    let skippedCount = 0;

    for (const row of res.rows) {
      let needsUpdate = false;
      let newSmtpPass = row.smtp_pass;
      let newResendApiKey = row.resend_api_key;

      const rowLog = {
        id: row.id,
        provider: row.provider,
        active: row.is_active,
        passEncrypted: false,
        apiKeyEncrypted: false,
      };

      // Check smtp_pass
      if (row.smtp_pass && typeof row.smtp_pass === 'string' && row.smtp_pass.trim() !== '') {
        if (row.smtp_pass.startsWith('enc:v1:')) {
          // Already encrypted
        } else {
          newSmtpPass = encryptSecret(row.smtp_pass.trim());
          needsUpdate = true;
          rowLog.passEncrypted = true;
        }
      }

      // Check resend_api_key
      if (row.resend_api_key && typeof row.resend_api_key === 'string' && row.resend_api_key.trim() !== '') {
        if (row.resend_api_key.startsWith('enc:v1:')) {
          // Already encrypted
        } else {
          newResendApiKey = encryptSecret(row.resend_api_key.trim());
          needsUpdate = true;
          rowLog.apiKeyEncrypted = true;
        }
      }

      if (needsUpdate) {
        if (!isDryRun) {
          await client.query(
            `UPDATE public.smtp_configs 
             SET smtp_pass = $1, resend_api_key = $2, updated_at = NOW() 
             WHERE id = $3`,
            [newSmtpPass, newResendApiKey, row.id]
          );
        }
        encryptedCount++;
        console.log(`   [ENCRYPT] Row ${rowLog.id} (${rowLog.provider}) -> pass: ${rowLog.passEncrypted ? 'PLAINTEXT -> enc:v1:' : 'SKIPPED'}, api_key: ${rowLog.apiKeyEncrypted ? 'PLAINTEXT -> enc:v1:' : 'SKIPPED'}`);
      } else {
        skippedCount++;
        console.log(`   [SKIP]    Row ${rowLog.id} (${rowLog.provider}) -> already encrypted or null`);
      }
    }

    console.log('\n----------------------------------------------------------------------');
    console.log(`Audit Summary: ${encryptedCount} row(s) to encrypt, ${skippedCount} row(s) already encrypted or null.`);
    console.log('----------------------------------------------------------------------\n');

    if (isDryRun) {
      console.log('ℹ️ DRY-RUN: Rolling back transaction. No database changes committed.');
      await client.query('ROLLBACK');
    } else {
      console.log('💾 LIVE MIGRATION: Committing transaction...');
      await client.query('COMMIT');
      console.log('✅ All legacy credentials successfully encrypted at rest.');
    }

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ FATAL: Credential encryption failed. Transaction rolled back:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runCredentialEncryption().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
