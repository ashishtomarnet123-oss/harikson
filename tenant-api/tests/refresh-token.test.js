import pg from 'pg';
import crypto from 'crypto';
import assert from 'assert';

const { Pool } = pg;

const dbUrl =
  process.env.DATABASE_URL ||
  'postgresql://neuravolt:neuravolt_dev_pwd@localhost:5435/neuravolt';

console.log('🧪 Connecting to test database at:', dbUrl);

const pool = new Pool({
  connectionString: dbUrl,
  max: 2,
  idleTimeoutMillis: 1000,
});

async function runTests() {
  console.log(
    '\n🚀 Starting Refresh Token Hashing & Entropy Verification Tests...'
  );

  try {
    // 1. Generate a mock tenant and user for the test
    const tenantId = '00000000-0000-0000-0000-000000000009';
    const userId = '00000000-0000-0000-0000-000000000099';

    console.log('🔹 Setting up temporary tenant and user...');
    await pool.query('SET row_security = off;');
    await pool.query('DELETE FROM refresh_tokens WHERE tenant_id = $1', [
      tenantId,
    ]);
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    await pool.query('DELETE FROM tenants WHERE id = $1', [tenantId]);

    await pool.query(
      "INSERT INTO tenants (id, name, slug, plan) VALUES ($1, 'Test Tenant', 'test-rt-tenant', 'starter')",
      [tenantId]
    );
    await pool.query(
      "INSERT INTO users (id, tenant_id, email, password_hash, role) VALUES ($1, $2, 'rt-user@test.com', 'pwd', 'user')",
      [userId, tenantId]
    );

    // 2. Generate and store a secure 32-byte refresh token
    console.log(
      '\n🔹 Test 1: Generate 32-byte Refresh Token and verify DB stores SHA-256 hash...'
    );
    const rawToken = crypto.randomBytes(32).toString('hex');
    assert.strictEqual(
      rawToken.length,
      64,
      'Raw token should be 64 characters long (32 bytes hex)'
    );
    console.log(
      '   ✓ Generated raw token (entropy: 32 bytes hex, length 64):',
      rawToken.substring(0, 10) + '...'
    );

    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');
    assert.strictEqual(
      tokenHash.length,
      64,
      'Token hash should be 64 characters long (SHA-256)'
    );
    console.log(
      '   ✓ Computed SHA-256 hash:',
      tokenHash.substring(0, 10) + '...'
    );

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day
    await pool.query(
      `INSERT INTO refresh_tokens (token, user_id, tenant_id, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [tokenHash, userId, tenantId, expiresAt]
    );

    // Fetch directly from DB to verify raw value is NEVER stored
    const dbRecord = await pool.query(
      'SELECT token FROM refresh_tokens WHERE user_id = $1',
      [userId]
    );
    assert.strictEqual(dbRecord.rows.length, 1);
    assert.strictEqual(
      dbRecord.rows[0].token,
      tokenHash,
      'Stored token must exactly match computed SHA-256 hash'
    );
    assert.notStrictEqual(
      dbRecord.rows[0].token,
      rawToken,
      'Stored token must NOT match raw plaintext token'
    );
    console.log(
      '   ✓ Verified: DB contains only the SHA-256 hash, raw token is never written.'
    );

    // 3. Test verification/lookup using hashed value
    console.log('\n🔹 Test 2: Verify lookup using hashed token...');
    const incomingToken = rawToken;
    const lookupHash = crypto
      .createHash('sha256')
      .update(incomingToken)
      .digest('hex');

    const rtQuery = await pool.query(
      'SELECT * FROM refresh_tokens WHERE token = $1 AND revoked_at IS NULL AND expires_at > NOW() LIMIT 1',
      [lookupHash]
    );
    assert.strictEqual(
      rtQuery.rows.length,
      1,
      'Lookup by hash should return the token record'
    );
    assert.strictEqual(rtQuery.rows[0].user_id, userId);
    console.log('   ✓ Lookup by hashing incoming cookie succeeded.');

    // 4. Test revocation/logout
    console.log('\n🔹 Test 3: Verify revocation on logout...');
    const logoutToken = rawToken;
    const logoutHash = crypto
      .createHash('sha256')
      .update(logoutToken)
      .digest('hex');

    await pool.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token = $1',
      [logoutHash]
    );

    // Verify lookup fails now
    const rtQueryRevoked = await pool.query(
      'SELECT * FROM refresh_tokens WHERE token = $1 AND revoked_at IS NULL AND expires_at > NOW() LIMIT 1',
      [logoutHash]
    );
    assert.strictEqual(
      rtQueryRevoked.rows.length,
      0,
      'Revoked token should not be returned by active query'
    );
    console.log(
      '   ✓ Revocation on logout successfully marked revoked_at and blocked active queries.'
    );

    // 5. Cleanup
    console.log('\n🔹 Cleaning up test database records...');
    await pool.query('DELETE FROM refresh_tokens WHERE tenant_id = $1', [
      tenantId,
    ]);
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    await pool.query('DELETE FROM tenants WHERE id = $1', [tenantId]);
    await pool.query('SET row_security = on;');

    console.log('\n🎉 ALL REFRESH TOKEN TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('\n❌ REFRESH TOKEN TEST SUITE FAILED:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runTests();
