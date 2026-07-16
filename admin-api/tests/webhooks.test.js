import pg from 'pg';
import assert from 'assert';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/harikson'
});

async function runWebhooksTest() {
  console.log('\n🚀 Starting Webhook Idempotency & Transactional Rollback Tests...');

  const testEventId = 'evt_test_' + Date.now();
  const provider = 'stripe';

  // 1. Verify Unique Constraint unique_event_provider exists
  console.log('1. Verifying UNIQUE constraint exists on (event_id, provider)...');
  const constraintRes = await pool.query(`
    SELECT conname 
    FROM pg_constraint 
    WHERE conname = 'unique_event_provider'
  `);
  assert.strictEqual(constraintRes.rows.length, 1, 'unique_event_provider constraint must exist');
  console.log('   ✓ UNIQUE constraint confirmed.');

  // 2. Test ON CONFLICT DO NOTHING RETURNING id behavior
  console.log('2. Testing INSERT ON CONFLICT DO NOTHING...');
  const firstInsert = await pool.query(
    `INSERT INTO payment_webhooks (event_id, provider, event_type, status, amount, signature_verified)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (event_id, provider) DO NOTHING
     RETURNING id`,
    [testEventId, provider, 'customer.subscription.created', 'active', 29.00, true]
  );
  assert.ok(firstInsert.rows.length > 0, 'First insert should succeed and return the new row ID');
  const firstRowId = firstInsert.rows[0].id;
  console.log('   ✓ First insert succeeded. Row ID:', firstRowId);

  const secondInsert = await pool.query(
    `INSERT INTO payment_webhooks (event_id, provider, event_type, status, amount, signature_verified)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (event_id, provider) DO NOTHING
     RETURNING id`,
    [testEventId, provider, 'customer.subscription.created', 'active', 29.00, true]
  );
  assert.strictEqual(secondInsert.rows.length, 0, 'Second duplicate insert must return empty rows due to conflict resolution');
  console.log('   ✓ Second duplicate insert resolved conflict correctly and returned 0 rows.');

  // 3. Test Transaction Rollback on Exception
  console.log('3. Testing Transactional Rollback behavior...');
  const client = await pool.connect();
  let rolledBack = false;
  try {
    await client.query('BEGIN');
    
    // Insert a dummy event ID
    await client.query(
      `INSERT INTO payment_webhooks (event_id, provider, event_type, status, amount, signature_verified)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['evt_rollback_test', 'stripe', 'invoice.paid', 'paid', 99.00, true]
    );

    // Force an error: try to insert null into a NOT NULL column (event_type)
    await client.query(
      `INSERT INTO payment_webhooks (event_id, provider, event_type, status)
       VALUES ($1, $2, $3, $4)`,
      ['evt_fail', 'stripe', null, 'failed']
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    rolledBack = true;
    console.log('   ✓ Transaction correctly threw an error and triggered ROLLBACK.');
  } finally {
    client.release();
  }

  assert.ok(rolledBack, 'Transaction should have aborted and rolled back');

  // Verify the dummy transaction data was NOT saved in database due to rollback
  const checkDummy = await pool.query(
    "SELECT id FROM payment_webhooks WHERE event_id = 'evt_rollback_test'"
  );
  assert.strictEqual(checkDummy.rows.length, 0, 'Rolled-back transaction insert should not exist in database');
  console.log('   ✓ Confirmed zero database contamination from rolled back transaction.');

  console.log('\n🎉 ALL WEBHOOK IDEMPOTENCY & TRANSACTION TESTS PASSED SUCCESSFULLY!');
  await pool.end();
}

runWebhooksTest().catch(async (err) => {
  console.error('❌ Webhooks test failed:', err);
  await pool.end();
  process.exit(1);
});
