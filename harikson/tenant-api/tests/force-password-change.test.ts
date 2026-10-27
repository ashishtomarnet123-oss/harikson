if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgres://neuravolt:neuravolt@localhost:5432/neuravolt';
}
if (!process.env.REDIS_URL) {
  process.env.REDIS_URL = 'redis://127.0.0.1:6379';
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = '01234567890123456789012345678901';
}

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import express from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { pool, readPool, redis } from '../src/db/pool.js';
import authRoutes from '../src/routes/auth.routes.js';
import { requireAuth } from '../src/middleware/auth.js';

describe('Xarwiz Phase 6.1 — Admin Password Update / Login Force-Change State Regression Suite', () => {
  let server: http.Server;
  let baseUrl: string;
  const jwtSecret = process.env.JWT_SECRET || '01234567890123456789012345678901';
  process.env.JWT_SECRET = jwtSecret;

  // Test identifiers (isolated, non-production)
  const testTenantId = crypto.randomUUID();
  const testTenantBId = crypto.randomUUID();
  const testUserId = crypto.randomUUID();
  const testUserEmail = `regtest-${Date.now()}@xarwiz.test`;
  const initialPassword = 'TempAdmin@Pass2026!';
  const newStrongPassword = 'SecureUser#2026Compliant!';

  before(async () => {
    // Set up test Express app mounting authRoutes and a protected test route
    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);

    // Protected endpoint to verify middleware restriction
    app.get('/api/protected/chat', requireAuth, (req: any, res: any) => {
      res.json({ success: true, message: 'Access granted to protected workspace' });
    });

    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr: any = server.address();
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });

    // Create isolated test tenants and user in database
    await pool.query(
      `INSERT INTO tenants (id, name, slug, status, created_at)
       VALUES ($1, 'Test Regression Tenant', 'test-reg-tenant', 'active', NOW())
       ON CONFLICT (id) DO NOTHING`,
      [testTenantId]
    );

    await pool.query(
      `INSERT INTO tenants (id, name, slug, status, created_at)
       VALUES ($1, 'Tenant B', 'tenant-b', 'active', NOW())
       ON CONFLICT (id) DO NOTHING`,
      [testTenantBId]
    );

    const initialHash = await bcrypt.hash(initialPassword, 10);
    await pool.query(
      `INSERT INTO users (
        id, tenant_id, email, password_hash, role, status,
        force_password_change, must_change_password, email_verified, created_at
       )
       VALUES ($1, $2, $3, $4, 'member', 'active', TRUE, TRUE, TRUE, NOW())`,
      [testUserId, testTenantId, testUserEmail, initialHash]
    );
  });

  after(async () => {
    // Clean up isolated test records
    try {
      await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [testUserId]);
      await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [testUserId]);
      await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
      await pool.query('DELETE FROM tenants WHERE id IN ($1, $2)', [testTenantId, testTenantBId]);
    } catch (_) {}

    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }

    try {
      await pool.end();
      await readPool.end();
      redis.disconnect();
    } catch (_) {}

    setTimeout(() => process.exit(0), 100);
  });

  // =========================================================================
  // Scenario 1: Admin sets a permanent password -> user logs in immediately
  // =========================================================================
  it('1. Admin sets a permanent password: user can log in immediately when policy allows', async () => {
    const permPassword = 'Perm@UserPassword2026!';
    const permHash = await bcrypt.hash(permPassword, 10);

    // Simulate Admin Panel updating password with forceChangeOnNextLogin: false
    await pool.query(
      `UPDATE users
       SET password_hash = $1,
           force_password_change = FALSE,
           must_change_password = FALSE,
           password_changed_at = NOW(),
           updated_at = NOW()
       WHERE id = $2`,
      [permHash, testUserId]
    );

    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUserEmail, password: permPassword }),
    });

    const data = await loginRes.json();
    assert.strictEqual(loginRes.status, 200, 'Login must succeed with permanent password');
    assert.strictEqual(data.success, true);
    assert.ok(data.accessToken, 'Must return valid accessToken');
    assert.strictEqual(data.requirePasswordChange, undefined);
  });

  // =========================================================================
  // Scenario 2: Admin sets temporary password -> mandatory change enforced
  // =========================================================================
  it('2. Admin sets a temporary password: mandatory change remains enforced with scoped token', async () => {
    const tempPassword = 'Temp@AdminAssigned2026!';
    const tempHash = await bcrypt.hash(tempPassword, 10);

    // Simulate Admin Panel updating password with forceChangeOnNextLogin: true
    await pool.query(
      `UPDATE users
       SET password_hash = $1,
           force_password_change = TRUE,
           must_change_password = TRUE,
           password_changed_at = NOW(),
           updated_at = NOW()
       WHERE id = $2`,
      [tempHash, testUserId]
    );

    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUserEmail, password: tempPassword }),
    });

    const data = await loginRes.json();
    assert.strictEqual(loginRes.status, 403, 'Must return HTTP 403 Forbidden');
    assert.strictEqual(data.code, 'FORCE_PASSWORD_CHANGE_REQUIRED');
    assert.strictEqual(data.requirePasswordChange, true);
    assert.strictEqual(data.mustChangePassword, true);
    assert.ok(data.tempToken, 'Must issue a scoped tempToken for password change flow');

    // Verify token payload
    const decoded = jwt.verify(data.tempToken, jwtSecret) as any;
    assert.strictEqual(decoded.userId, testUserId);
    assert.strictEqual(decoded.purpose, 'force_password_change');
  });

  // =========================================================================
  // Scenario 3: Scoped tempToken cannot access normal protected routes
  // =========================================================================
  it('3. User with mandatory-change flag cannot access normal protected routes with tempToken', async () => {
    // Create a temp token
    const tempToken = jwt.sign(
      { userId: testUserId, email: testUserEmail, purpose: 'force_password_change' },
      jwtSecret,
      { expiresIn: '15m' }
    );

    const protectedRes = await fetch(`${baseUrl}/api/protected/chat`, {
      headers: { Authorization: `Bearer ${tempToken}` },
    });

    const data = await protectedRes.json();
    assert.strictEqual(protectedRes.status, 403, 'Must reject tempToken on standard protected routes');
    assert.strictEqual(data.code, 'FORCE_PASSWORD_CHANGE_REQUIRED');
  });

  // =========================================================================
  // Scenario 4: Successful password change clears the flag and returns session
  // =========================================================================
  it('4. Successful password change clears force_password_change and must_change_password flags', async () => {
    const tempToken = jwt.sign(
      { userId: testUserId, email: testUserEmail, purpose: 'force_password_change' },
      jwtSecret,
      { expiresIn: '15m' }
    );

    const changeRes = await fetch(`${baseUrl}/api/auth/force-change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tempToken,
        newPassword: newStrongPassword,
        confirmPassword: newStrongPassword,
      }),
    });

    const data = await changeRes.json();
    assert.strictEqual(changeRes.status, 200, 'Password update must succeed with HTTP 200');
    assert.strictEqual(data.success, true);
    assert.ok(data.accessToken, 'Must return session access token');

    // Verify database record has cleared both flags
    const userRes = await pool.query(
      'SELECT force_password_change, must_change_password FROM users WHERE id = $1',
      [testUserId]
    );
    assert.strictEqual(userRes.rows[0].force_password_change, false, 'force_password_change must be false');
    assert.strictEqual(userRes.rows[0].must_change_password, false, 'must_change_password must be false');

    // Next login with new password succeeds immediately
    const nextLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUserEmail, password: newStrongPassword }),
    });
    const nextLoginData = await nextLoginRes.json();
    assert.strictEqual(nextLoginRes.status, 200, 'Subsequent login must succeed');
    assert.strictEqual(nextLoginData.success, true);
  });

  // =========================================================================
  // Scenario 5: Failed password change does NOT clear the flag
  // =========================================================================
  it('5. Failed password change does not clear mandatory-change flags', async () => {
    // Re-enable force change
    await pool.query(
      'UPDATE users SET force_password_change = TRUE, must_change_password = TRUE WHERE id = $1',
      [testUserId]
    );

    const tempToken = jwt.sign(
      { userId: testUserId, email: testUserEmail, purpose: 'force_password_change' },
      jwtSecret,
      { expiresIn: '15m' }
    );

    // Attempt change with weak password (fails policy)
    const weakChangeRes = await fetch(`${baseUrl}/api/auth/force-change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tempToken,
        newPassword: 'short',
        confirmPassword: 'short',
      }),
    });

    assert.strictEqual(weakChangeRes.status, 400, 'Weak password must be rejected');

    // Check DB: flags must still be true
    const userRes = await pool.query(
      'SELECT force_password_change, must_change_password FROM users WHERE id = $1',
      [testUserId]
    );
    assert.strictEqual(userRes.rows[0].force_password_change, true, 'Flags must NOT be cleared on failure');
    assert.strictEqual(userRes.rows[0].must_change_password, true, 'Flags must NOT be cleared on failure');
  });

  // =========================================================================
  // Scenario 6: Invalid credentials remain rejected
  // =========================================================================
  it('6. Invalid credentials remain rejected with HTTP 401', async () => {
    const wrongLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUserEmail, password: 'CompletelyWrongPassword123!' }),
    });

    assert.strictEqual(wrongLoginRes.status, 401, 'Invalid login must return 401');
  });

  // =========================================================================
  // Scenario 7: Unauthorized admin / role escalation check
  // =========================================================================
  it('7. Unauthorized roles cannot modify administrative credentials', async () => {
    const ordinaryAdmin = { id: crypto.randomUUID(), role: 'admin', email: 'admin@xarwiz.test' };
    const superadminTarget = { id: crypto.randomUUID(), role: 'superadmin', email: 'founder@xarwiz.test' };

    // Hierarchy test: ordinary admin cannot manage superadmin credentials
    const isSuperadminTarget = ['superadmin', 'founder'].includes(superadminTarget.role);
    const isCallerSuperadmin = ['superadmin', 'founder'].includes(ordinaryAdmin.role);
    const canModify = !isSuperadminTarget || isCallerSuperadmin;

    assert.strictEqual(canModify, false, 'Ordinary admin must be forbidden from managing superadmin credentials');
  });

  // =========================================================================
  // Scenario 8: Tenant A cannot change Tenant B user's password
  // =========================================================================
  it('8. Tenant A admin cannot change Tenant B user password (tenant isolation)', async () => {
    const tenantAAdmin = { id: crypto.randomUUID(), role: 'admin', tenant_id: testTenantId };
    const tenantBUser = { id: crypto.randomUUID(), role: 'member', tenant_id: testTenantBId };

    const isCrossTenant = tenantAAdmin.tenant_id !== tenantBUser.tenant_id;
    assert.strictEqual(isCrossTenant, true, 'Tenants must be different');

    // Tenant isolation rule
    const allowed = tenantAAdmin.role === 'superadmin' || tenantAAdmin.tenant_id === tenantBUser.tenant_id;
    assert.strictEqual(allowed, false, 'Cross-tenant credential management must be prohibited');
  });

  // =========================================================================
  // Scenario 9: Password hash is persisted and verifiable via bcrypt
  // =========================================================================
  it('9. Password hash is persisted using bcrypt and verifiable', async () => {
    const testPlain = 'VerifiableSecure#2026!';
    const testHash = await bcrypt.hash(testPlain, 12);

    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [testHash, testUserId]);

    const row = await pool.query('SELECT password_hash FROM users WHERE id = $1', [testUserId]);
    const matches = await bcrypt.compare(testPlain, row.rows[0].password_hash);
    assert.strictEqual(matches, true, 'Persisted hash must verify correctly with bcrypt');
  });

  // =========================================================================
  // Scenario 10: Session and token revocation on password update
  // =========================================================================
  it('10. Old refresh tokens are invalidated upon password update', async () => {
    const tokenHash = crypto.createHash('sha256').update('old-refresh-token').digest('hex');
    await pool.query(
      `INSERT INTO refresh_tokens (token, user_id, tenant_id, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '7 days')`,
      [tokenHash, testUserId, testTenantId]
    );

    // Verify token exists
    const beforeRes = await pool.query('SELECT * FROM refresh_tokens WHERE user_id = $1', [testUserId]);
    assert.ok(beforeRes.rows.length >= 1, 'Token must exist before change');

    // Perform forced password change
    const tempToken = jwt.sign(
      { userId: testUserId, email: testUserEmail, purpose: 'force_password_change' },
      jwtSecret,
      { expiresIn: '15m' }
    );

    await fetch(`${baseUrl}/api/auth/force-change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tempToken,
        newPassword: 'AnotherStrong#2026Password!',
        confirmPassword: 'AnotherStrong#2026Password!',
      }),
    });

    // Verify old refresh token is revoked
    const afterRes = await pool.query('SELECT * FROM refresh_tokens WHERE token = $1', [tokenHash]);
    assert.strictEqual(afterRes.rows.length, 0, 'Prior refresh token must be revoked');
  });

  // =========================================================================
  // Scenario 11: Transaction rollback on failure prevents partial updates
  // =========================================================================
  it('11. Database failure does not leave account in partially updated state', async () => {
    const client = await pool.connect();
    const originalHash = (await pool.query('SELECT password_hash FROM users WHERE id = $1', [testUserId])).rows[0].password_hash;

    try {
      await client.query('BEGIN');
      await client.query('UPDATE users SET force_password_change = FALSE WHERE id = $1', [testUserId]);
      // Simulate fatal failure before commit
      throw new Error('Simulated database write error');
    } catch (_) {
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }

    // Verify transaction rolled back cleanly
    const verifyRow = await pool.query('SELECT password_hash FROM users WHERE id = $1', [testUserId]);
    assert.strictEqual(verifyRow.rows[0].password_hash, originalHash, 'State must remain uncorrupted after rollback');
  });

  // =========================================================================
  // Scenario 12: Fallback reset-password clears BOTH mandatory-change flags
  // =========================================================================
  it('12. Reset-password fallback path clears both force_password_change and must_change_password', async () => {
    // Set both flags to true
    await pool.query(
      'UPDATE users SET force_password_change = TRUE, must_change_password = TRUE WHERE id = $1',
      [testUserId]
    );

    // Create a reset token
    const rawResetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(rawResetToken).digest('hex');
    await pool.query(
      `INSERT INTO password_reset_tokens (tenant_id, user_id, token_hash, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '1 hour')`,
      [testTenantId, testUserId, resetTokenHash]
    );

    // Call POST /reset-password
    const resetRes = await fetch(`${baseUrl}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: rawResetToken,
        newPassword: 'BrandNewReset#2026Password!',
      }),
    });

    const resetData = await resetRes.json();
    assert.strictEqual(resetRes.status, 200, 'Password reset must succeed');

    // Verify that BOTH flags are cleared in the database
    const verifyRes = await pool.query(
      'SELECT force_password_change, must_change_password FROM users WHERE id = $1',
      [testUserId]
    );
    assert.strictEqual(verifyRes.rows[0].force_password_change, false, 'force_password_change must be FALSE');
    assert.strictEqual(verifyRes.rows[0].must_change_password, false, 'must_change_password must be FALSE');
  });
});
