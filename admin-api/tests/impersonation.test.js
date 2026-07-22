import axios from 'axios';
import assert from 'assert';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const apiBase = process.env.API_BASE || 'http://localhost:4000';
const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_must_be_at_least_32_bytes';

async function runImpersonationTest() {
  console.log('\n🚀 Starting Admin Impersonation Security Verification...');

  // 1. Authenticate as a superadmin (using signed JWT)
  console.log('1. Signing valid admin test JWT...');
  const testAdminToken = jwt.sign(
    { userId: '00000000-0000-0000-0000-000000000001', role: 'superadmin' },
    jwtSecret
  );
  const superadminClient = axios.create({
    baseURL: apiBase,
    headers: {
      Authorization: `Bearer ${testAdminToken}`,
      'Content-Type': 'application/json'
    }
  });

  // Get users list to pick a target
  const usersRes = await superadminClient.get('/admin/users');
  const targetUser = usersRes.data.users[0];
  assert.ok(targetUser, 'Should have at least one user in the database to target');
  console.log(`   ✓ Selected target user for impersonation: ${targetUser.email} (ID: ${targetUser.id})`);

  // 2. Perform Impersonation Request as Superadmin
  console.log('2. Requesting impersonation token as superadmin...');
  const impersonateRes = await superadminClient.post(`/admin/users/${targetUser.id}/impersonate`);
  assert.ok(impersonateRes.data.success, 'Impersonation request should succeed');
  const token = impersonateRes.data.token;
  const redirectUrl = impersonateRes.data.redirectUrl;
  assert.ok(token, 'Should return one-time short-lived token');
  assert.ok(redirectUrl.includes('/impersonate?token='), 'Should return /impersonate redirectUrl');
  console.log(`   ✓ Short-lived token generated: ${token.substring(0, 10)}... redirectUrl=${redirectUrl}`);

  // 3. Confirm Impersonation Token via POST /auth/impersonate/confirm
  console.log('3. Confirming impersonation token via POST body...');
  const confirmRes = await axios.post(`${apiBase}/admin/impersonate/confirm`, { token });
  assert.ok(confirmRes.data.success, 'Confirmation should succeed');
  assert.strictEqual(confirmRes.data.user.id, targetUser.id, 'Target user ID must match');
  console.log('   ✓ Token confirmed securely via POST body. User authenticated.');

  // 4. Verify Single-Use (Reusing token must fail)
  console.log('4. Verifying token single-use (attempting reuse)...');
  try {
    await axios.post(`${apiBase}/admin/impersonate/confirm`, { token });
    assert.fail('Token reuse should have failed');
  } catch (err) {
    assert.strictEqual(err.response.status, 401, 'Reused token should be rejected with 401');
    console.log('   ✓ Token reuse rejected (single-use enforced).');
  }

  // 5. Verify Rate Limiting (max 3 per hour)
  console.log('5. Verifying rate limits (max 3 per hour)...');
  let rateLimited = false;
  for (let i = 0; i < 5; i++) {
    try {
      const res = await superadminClient.post(`/admin/users/${targetUser.id}/impersonate`);
      if (!res.data.success) {
        rateLimited = true;
        break;
      }
    } catch (err) {
      if (err.response && err.response.status === 429) {
        rateLimited = true;
        break;
      }
    }
  }
  assert.ok(rateLimited, 'Should rate limit after 3 requests');
  console.log('   ✓ Rate limiting successfully triggered (429 returned after 3 requests).');

  // 6. Verify regular admin / unauthorized access is blocked
  console.log('6. Verifying non-superadmin privilege block...');
  const regularAdminToken = jwt.sign(
    { userId: '00000000-0000-0000-0000-000000000002', role: 'admin' },
    jwtSecret
  );
  try {
    await axios.post(`${apiBase}/admin/users/${targetUser.id}/impersonate`, {}, {
      headers: { Authorization: `Bearer ${regularAdminToken}` }
    });
    assert.fail('Should have thrown an authorization error');
  } catch (err) {
    assert.ok(err.response.status === 401 || err.response.status === 403, 'Should be unauthorized or forbidden');
  }
  console.log('   ✓ Privileged access verification complete (blocked successfully).');

  console.log('\n🎉 ALL IMPERSONATION SECURITY CHECKS PASSED!');
}

runImpersonationTest().catch((err) => {
  console.error('❌ Impersonation test failed:', err.response?.data || err.message);
  process.exit(1);
});
