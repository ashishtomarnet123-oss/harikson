import axios from 'axios';
import speakeasy from 'speakeasy';
import assert from 'assert';

const apiBase = process.env.API_BASE || 'http://localhost:3000';
const email = 'ashishtomar.net123@gmail.com';
const password = 'superadmin_pwd_2026';
const tenantSlug = 'system';

async function run2FATest() {
  console.log('\n🚀 Starting Two-Factor Authentication Integration Test...');

  // Create an axios instance that persists cookies
  const client = axios.create({
    baseURL: apiBase,
    withCredentials: true,
    headers: {
      'x-tenant-slug': tenantSlug,
      'Content-Type': 'application/json',
    }
  });

  // Helper to extract cookies from responses and add them to subsequent request headers
  let cookieHeader = '';
  client.interceptors.response.use(
    (response) => {
      const setCookies = response.headers['set-cookie'];
      if (setCookies) {
        cookieHeader = setCookies.map(c => c.split(';')[0]).join('; ');
      }
      return response;
    },
    (error) => Promise.reject(error)
  );
  client.interceptors.request.use(
    (config) => {
      if (cookieHeader) {
        config.headers.Cookie = cookieHeader;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // 1. Initial Login (should succeed directly since 2FA is currently disabled)
  console.log('1. Logging in with credentials...');
  const loginRes = await client.post('/api/auth/login', { email, password });
  assert.ok(loginRes.data.success, 'Login should succeed');
  assert.ok(!loginRes.data.requires2FA, 'Should not require 2FA initially');
  console.log('   ✓ Login successful.');

  // 2. Trigger 2FA Setup
  console.log('2. Starting 2FA setup...');
  const setupRes = await client.post('/api/user/2fa/setup');
  assert.ok(setupRes.data.success, '2FA setup generation should succeed');
  const secret = setupRes.data.secret;
  assert.ok(secret, 'Should return base32 secret');
  assert.ok(setupRes.data.qrCodeUrl, 'Should return QR code data URL');
  console.log('   ✓ 2FA secret generated successfully:', secret);

  // 3. Verify TOTP Code and Enable 2FA
  console.log('3. Verifying setup TOTP code...');
  const code = speakeasy.totp({
    secret: secret,
    encoding: 'base32'
  });
  console.log('   Generated TOTP code:', code);
  const verifyRes = await client.post('/api/user/2fa/verify', { code });
  assert.ok(verifyRes.data.success, 'Verification should succeed');
  const backupCodes = verifyRes.data.backupCodes;
  assert.strictEqual(backupCodes.length, 10, 'Should generate 10 backup codes');
  console.log('   ✓ 2FA verified and enabled. Backup codes generated:', backupCodes);

  // 4. Log out (clear cookies)
  console.log('4. Logging out...');
  cookieHeader = '';

  // 5. Try Logging In again (should require 2FA)
  console.log('5. Trying to log in with password (should prompt for 2FA)...');
  const loginWith2FARes = await client.post('/api/auth/login', { email, password });
  assert.ok(!loginWith2FARes.data.success, 'Direct login should be blocked');
  assert.ok(loginWith2FARes.data.requires2FA, 'Login response should indicate requires2FA');
  const userId = loginWith2FARes.data.userId;
  assert.ok(userId, 'Should return userId');
  console.log('   ✓ Successfully blocked and requested 2FA.');

  // 6. Complete 2FA login verification
  console.log('6. Submitting TOTP code to complete login...');
  const currentTotp = speakeasy.totp({
    secret: secret,
    encoding: 'base32'
  });
  const login2FARes = await client.post('/api/auth/login/2fa', { userId, code: currentTotp });
  assert.ok(login2FARes.data.success, '2FA verification should complete login');
  assert.ok(cookieHeader.includes('hk_access_token'), 'Should set access token cookie');
  console.log('   ✓ Logged in successfully with TOTP.');

  // 7. Log out again
  console.log('7. Logging out...');
  cookieHeader = '';

  // 8. Log in with a single-use Backup Code
  console.log('8. Logging in with backup code...');
  const loginWithBackupRes = await client.post('/api/auth/login', { email, password });
  const bCode = backupCodes[0];
  const loginBackupRes = await client.post('/api/auth/login/2fa', { userId, code: bCode });
  assert.ok(loginBackupRes.data.success, 'Backup code should complete login');
  console.log(`   ✓ Logged in successfully using backup code: ${bCode}`);

  // 9. Disable 2FA
  console.log('9. Disabling 2FA...');
  const disableRes = await client.post('/api/user/2fa/disable', { password });
  assert.ok(disableRes.data.success, 'Should disable 2FA successfully');
  console.log('   ✓ 2FA disabled.');

  // 10. Verify login works directly again
  console.log('10. Logging out...');
  cookieHeader = '';
  console.log('11. Verifying direct login works...');
  const finalLoginRes = await client.post('/api/auth/login', { email, password });
  assert.ok(finalLoginRes.data.success, 'Direct login should succeed');
  assert.ok(!finalLoginRes.data.requires2FA, 'Should not require 2FA');
  console.log('   ✓ Verified direct login is restored.');

  console.log('\n🎉 ALL 2FA INTEGRATION TESTS PASSED SUCCESSFULLY!');
}

run2FATest().catch((err) => {
  console.error('❌ 2FA Test failed:', err.response?.data || err.message);
  process.exit(1);
});
