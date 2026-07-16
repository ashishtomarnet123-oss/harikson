import axios from 'axios';
import assert from 'assert';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const apiBase = process.env.API_BASE || 'http://localhost:4000';
const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_must_be_at_least_32_bytes';

async function runImpersonationTest() {
  console.log('\n🚀 Starting Admin Impersonation Security Verification...');

  // 1. Authenticate as a superadmin (using the test token fallback)
  console.log('1. Simulating admin login (using fallback token)...');
  const superadminClient = axios.create({
    baseURL: apiBase,
    headers: {
      Authorization: 'Bearer TEST_ADMIN_TOKEN',
      'Content-Type': 'application/json'
    }
  });

  // Get users list to pick a target
  const usersRes = await superadminClient.get('/admin/users');
  const targetUser = usersRes.data.users[0];
  assert.ok(targetUser, 'Should have at least one user in the database to target');
  console.log(`   ✓ Selected target user for impersonation: ${targetUser.email} (ID: ${targetUser.id})`);

  // 2. Perform Impersonation as Superadmin
  console.log('2. Requesting impersonation token as superadmin...');
  const impersonateRes = await superadminClient.post(`/admin/users/${targetUser.id}/impersonate`);
  assert.ok(impersonateRes.data.success, 'Impersonation request should succeed');
  const token = impersonateRes.data.token;
  assert.ok(token, 'Should return impersonation token');

  // Verify token properties
  const decoded = jwt.verify(token, jwtSecret);
  assert.strictEqual(decoded.type, 'impersonation', 'Token type must be impersonation');
  assert.strictEqual(decoded.targetUserId, targetUser.id, 'Target user ID must match');
  assert.ok(decoded.adminId, 'Admin ID must be populated');
  const expiresIn = decoded.exp - decoded.iat;
  assert.ok(expiresIn <= 300, 'Expiration must be at most 5 minutes (300 seconds)');
  console.log('   ✓ Impersonation token verified: type=impersonation, targetUserId=' + decoded.targetUserId + ', expiresIn=' + expiresIn + 's');

  // 3. Verify Rate Limiting
  console.log('3. Verifying rate limits (performing 10 subsequent requests)...');
  let rateLimited = false;
  for (let i = 0; i < 12; i++) {
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
  assert.ok(rateLimited, 'Should rate limit after 10 requests');
  console.log('   ✓ Rate limiting successfully triggered (429 returned).');

  // 4. Verify regular admin / unauthorized access is blocked
  console.log('4. Verifying non-superadmin privilege block...');
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
