import axios from 'axios';
import assert from 'assert';

const apiBase = process.env.API_BASE || 'http://localhost:3000';
const email = 'ashishtomar.net123@gmail.com';
const password = 'superadmin_pwd_2026';
const tenantSlug = 'system';

async function runWorkflowsTest() {
  console.log('\n🚀 Starting Workflows API Integration Test...');

  const client = axios.create({
    baseURL: apiBase,
    withCredentials: true,
    headers: {
      'x-tenant-slug': tenantSlug,
      'Content-Type': 'application/json',
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

  // 2. Fetch workflows (should initially return array, maybe empty or existing)
  console.log('2. Fetching existing workflows...');
  const getRes = await client.get('/api/workflows');
  assert.ok(Array.isArray(getRes.data), 'GET /api/workflows should return an array');
  const initialCount = getRes.data.length;
  console.log(`   ✓ Found ${initialCount} existing workflows.`);

  // 3. Create a new workflow
  console.log('3. Creating a new workflow...');
  const newWf = {
    name: 'Test Workflow Integration',
    description: 'Verifies triggers and step sequences',
    trigger_type: 'scheduled',
    status: 'active',
    steps: [{ id: 1, type: 'prompt', value: 'Generate a greeting' }]
  };
  const createRes = await client.post('/api/workflows', newWf);
  assert.strictEqual(createRes.status, 201, 'Should return status 201 Created');
  const workflow = createRes.data;
  assert.ok(workflow.id, 'Created workflow should have an ID');
  assert.strictEqual(workflow.name, newWf.name);
  assert.strictEqual(workflow.trigger_type, newWf.trigger_type);
  console.log('   ✓ Workflow created successfully. ID:', workflow.id);

  // 4. Update the workflow
  console.log('4. Editing the workflow...');
  const updateWf = {
    name: 'Updated Test Workflow Name',
    status: 'disabled'
  };
  const updateRes = await client.put(`/api/workflows/${workflow.id}`, updateWf);
  assert.strictEqual(updateRes.status, 200, 'Should return status 200 OK');
  assert.strictEqual(updateRes.data.name, updateWf.name);
  assert.strictEqual(updateRes.data.status, updateWf.status);
  console.log('   ✓ Workflow updated successfully.');

  // 5. Get workflow executions (should be empty array for new workflow)
  console.log('5. Fetching execution history...');
  const execsRes = await client.get(`/api/workflows/${workflow.id}/executions`);
  assert.ok(Array.isArray(execsRes.data), 'Should return executions array');
  console.log('   ✓ Executions count:', execsRes.data.length);

  // 6. Delete the workflow
  console.log('6. Deleting workflow...');
  const deleteRes = await client.delete(`/api/workflows/${workflow.id}`);
  assert.strictEqual(deleteRes.status, 200);
  assert.ok(deleteRes.data.success, 'Delete operation should report success');
  console.log('   ✓ Workflow deleted successfully.');

  // 7. Verify deletion
  const verifyGetRes = await client.get('/api/workflows');
  const finalCount = verifyGetRes.data.length;
  assert.strictEqual(finalCount, initialCount, 'Workflow count should return to initial state');
  console.log('   ✓ Verified deleted workflow is no longer in list.');

  console.log('\n🎉 ALL WORKFLOWS INTEGRATION TESTS PASSED SUCCESSFULLY!');
}

runWorkflowsTest().catch((err) => {
  console.error('❌ Workflows test failed:', err.response?.data || err.message);
  process.exit(1);
});
