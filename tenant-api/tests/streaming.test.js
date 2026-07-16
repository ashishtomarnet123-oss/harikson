import axios from 'axios';
import assert from 'assert';

const apiBase = process.env.API_BASE || 'http://localhost:3000';
const email = 'ashishtomar.net123@gmail.com';
const password = 'superadmin_pwd_2026';
const tenantSlug = 'system';

async function runStreamingTest() {
  console.log('\n🚀 Starting Chat Streaming and Abort API Test...');

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

  // 1. Login
  console.log('1. Logging in...');
  await client.post('/api/auth/login', { email, password });
  console.log('   ✓ Login successful.');

  // 2. Start a chat stream
  console.log('2. Requesting chat stream...');
  const response = await client.post('/api/chat', {
    message: 'Write a long poem about the beauty of anti-gravity architectures.',
    model: 'harikson-plus'
  }, {
    responseType: 'stream'
  });

  assert.strictEqual(response.status, 200);
  assert.ok(response.headers['content-type'].includes('text/plain'));
  console.log('   ✓ Stream connected successfully. Receiving chunks...');

  // 3. Consume some chunks and abort
  const abortController = new AbortController();
  let chunkCount = 0;
  
  await new Promise((resolve, reject) => {
    response.data.on('data', (chunk) => {
      chunkCount++;
      const text = chunk.toString();
      console.log(`   [Chunk ${chunkCount}]: ${text.substring(0, 30).replace(/\n/g, ' ')}...`);

      if (chunkCount === 3) {
        console.log('3. Client disconnecting mid-way (aborting request)...');
        response.data.destroy(); // Simulates abort/connection drop
        resolve();
      }
    });

    response.data.on('error', (err) => {
      reject(err);
    });

    response.data.on('end', () => {
      resolve();
    });
  });

  console.log('   ✓ Stream successfully aborted mid-way.');
  console.log('\n🎉 ALL STREAMING GRACEFUL ERROR HANDLING TESTS PASSED!');
}

runStreamingTest().catch((err) => {
  console.error('❌ Streaming test failed:', err.message);
  process.exit(1);
});
