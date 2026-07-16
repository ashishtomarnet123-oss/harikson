import axios from 'axios';
import assert from 'assert';
import Redis from 'ioredis';

const apiBase = process.env.API_BASE || 'http://localhost:3000';
const email = 'ashishtomar.net123@gmail.com';
const password = 'superadmin_pwd_2026';
const tenantSlug = 'system';

async function runConsistencyTest() {
  console.log('\n🚀 Starting Read-Your-Writes Consistency Integration Test...');

  const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');

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
  const loginRes = await client.post('/api/auth/login', { email, password });
  assert.strictEqual(loginRes.status, 200);
  
  // Login is a POST (write), so it should return X-Write-Timestamp!
  const loginWriteTs = loginRes.headers['x-write-timestamp'];
  assert.ok(loginWriteTs, 'Login response should contain X-Write-Timestamp header');
  console.log('   ✓ Login write timestamp returned:', loginWriteTs);

  // 2. Fetch profile to resolve userId
  console.log('2. Fetching profile info...');
  const profileRes = await client.get('/api/user/profile');
  assert.strictEqual(profileRes.status, 200);
  const userId = profileRes.data.id;
  assert.ok(userId, 'Resolved User ID from profile');

  // Since profile fetching is a GET, it should NOT return X-Write-Timestamp
  assert.strictEqual(profileRes.headers['x-write-timestamp'], undefined, 'GET requests should not return X-Write-Timestamp');
  console.log('   ✓ Profile GET correctly omitted X-Write-Timestamp.');

  // 3. Verify Redis stickiness key exists and has active TTL
  console.log('3. Verifying Redis session stickiness TTL...');
  // Note: the login POST set the stickiness key
  const stickyKey = `primary_stickiness:${tenantSlug}:${userId}`;
  const isSticky = await redis.get(stickyKey);
  assert.strictEqual(isSticky, 'true', 'Redis stickiness key should exist');
  
  const ttl = await redis.ttl(stickyKey);
  assert.ok(ttl > 0 && ttl <= 2, `Stickiness TTL should be <= 2 seconds (actual: ${ttl})`);
  console.log(`   ✓ Redis stickiness verified. Key: ${stickyKey}, TTL: ${ttl}s`);

  // 4. Trigger profile update PUT (write)
  console.log('4. Performing profile update write (PUT)...');
  const updateRes = await client.put('/api/user/profile', {
    name: 'Ashish Tomar',
    username: 'ashishtomar',
    phone: '+1 (555) 000-0000',
    company: 'Neuravolt',
    jobTitle: 'Super Admin',
    department: 'Engineering',
    country: 'India',
    bio: 'Architecting anti-gravity structures.'
  });
  
  assert.strictEqual(updateRes.status, 200);
  const updateWriteTs = updateRes.headers['x-write-timestamp'];
  assert.ok(updateWriteTs, 'Update response should contain X-Write-Timestamp header');
  console.log('   ✓ Update write timestamp returned:', updateWriteTs);

  // 5. Test consistency override with X-Last-Write header
  console.log('5. Testing read-your-writes replication bypass via header...');
  const consistencyRes = await client.get('/api/user/profile', {
    headers: {
      'x-last-write': updateWriteTs
    }
  });
  assert.strictEqual(consistencyRes.status, 200);
  console.log('   ✓ Replication bypass read request succeeded.');

  await redis.quit();
  console.log('\n🎉 ALL READ-YOUR-WRITES CONSISTENCY TESTS PASSED SUCCESSFULLY!');
}

runConsistencyTest().catch((err) => {
  console.error('❌ Consistency test failed:', err.response?.data?.toString() || err.response?.data || err.message);
  process.exit(1);
});
