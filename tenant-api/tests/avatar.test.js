import axios from 'axios';
import assert from 'assert';

const apiBase = process.env.API_BASE || 'http://localhost:3000';
const email = 'ashishtomar.net123@gmail.com';
const password = 'superadmin_pwd_2026';
const tenantSlug = 'system';

async function runAvatarTest() {
  console.log('\n🚀 Starting Avatar Upload API Integration Test...');

  const client = axios.create({
    baseURL: apiBase,
    withCredentials: true,
    headers: {
      'x-tenant-slug': tenantSlug,
    }
  });

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

  // 1. Login to get session
  console.log('1. Logging in...');
  await client.post('/api/auth/login', { email, password });
  console.log('   ✓ Login successful.');

  // 2. Fetch profile to find userId
  console.log('2. Fetching profile info...');
  const profileRes = await client.get('/api/user/profile');
  const userId = profileRes.data.email.split('@')[0]; // Wait, we can get user ID from response, but user profile doesn't return ID.
  const actualUserId = profileRes.data.id;
  assert.ok(actualUserId, 'User ID should be resolved from profile info');
  console.log(`   ✓ Resolved User ID: ${actualUserId}`);

  // 3. Create a 1x1 pixel mock PNG image
  console.log('3. Preparing mock PNG buffer...');
  const pngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  // 4. Submit upload request as multipart/form-data
  console.log('4. Uploading avatar via multipart/form-data...');
  const FormData = (await import('form-data')).default;
  const form = new FormData();
  form.append('avatar', pngBuffer, {
    filename: 'avatar.png',
    contentType: 'image/png',
  });

  const uploadRes = await client.post('/api/user/avatar', form, {
    headers: {
      ...form.getHeaders(),
    }
  });

  assert.strictEqual(uploadRes.status, 200, 'Upload should return 200 OK');
  assert.ok(uploadRes.data.success, 'Upload response should report success');
  assert.strictEqual(
    uploadRes.data.avatarUrl,
    `https://cdn.neuravolt.cloud/avatars/${actualUserId}.jpg`,
    'Avatar URL should conform to spec'
  );
  console.log('   ✓ Avatar uploaded successfully. URL:', uploadRes.data.avatarUrl);

  // 5. Test CDN route locally
  console.log('5. Verifying CDN route locally...');
  const cdnRes = await client.get(`/avatars/${actualUserId}.jpg`, {
    responseType: 'arraybuffer'
  });
  assert.strictEqual(cdnRes.status, 200, 'CDN route should return 200 OK');
  assert.strictEqual(cdnRes.headers['content-type'], 'image/jpeg', 'CDN response should be image/jpeg');
  assert.ok(cdnRes.data.length > 0, 'CDN should return image buffer');
  console.log('   ✓ CDN local route verified successfully.');

  console.log('\n🎉 ALL AVATAR UPLOAD INTEGRATION TESTS PASSED SUCCESSFULLY!');
}

runAvatarTest().catch((err) => {
  console.error('❌ Avatar test failed:', err.response?.data?.toString() || err.response?.data || err.message);
  process.exit(1);
});
