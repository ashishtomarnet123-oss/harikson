import pg from 'pg';
import assert from 'assert';

const { Pool } = pg;

// Use the local port 5435 when running from the host machine, or fall back to standard DATABASE_URL
const dbUrl = process.env.DATABASE_URL || 'postgresql://neuravolt:neuravolt_dev_pwd@localhost:5435/neuravolt';

console.log('🧪 Connecting to test database at:', dbUrl);

const pool = new Pool({
  connectionString: dbUrl,
  max: 5,
  idleTimeoutMillis: 1000
});

// Implement local versions of the exact helpers we are testing to run them in isolation
async function connectWithValidation() {
  let client;
  let retries = 3;
  while (retries > 0) {
    client = await pool.connect();
    try {
      const valRes = await client.query("SELECT current_setting('app.current_tenant', true) AS tenant");
      const currentTenant = valRes.rows[0]?.tenant;
      if (currentTenant && currentTenant.trim() !== '') {
        client.release(true); // Discard from pool
        throw new Error(`Connection pollution detected: app.current_tenant is already set to "${currentTenant}"`);
      }
      return client;
    } catch (err) {
      if (err.message.includes('unrecognized configuration parameter')) {
        return client;
      }
      client.release(true); // Discard on error
      throw err;
    }
  }
  throw new Error('Failed to acquire a clean database connection.');
}

async function executeTenantQuery(tenantId, callback) {
  const client = await connectWithValidation();
  let contextSet = false;
  try {
    await client.query("SELECT set_config('app.current_tenant', $1, false)", [tenantId]);
    contextSet = true;
    
    // Assert tenant context is set correctly
    await client.query("SELECT assert_tenant_context()");

    const result = await callback(client);
    return result;
  } finally {
    if (contextSet) {
      try {
        await client.query("SELECT set_config('app.current_tenant', '', false)");
        client.release();
      } catch (resetErr) {
        client.release(true);
      }
    } else {
      client.release();
    }
  }
}

async function runTests() {
  console.log('\n🚀 Starting RLS Multi-Query & Connection Pollution Tests...');

  const tenantA = 'a0000000-0000-0000-0000-000000000000';
  const tenantB = 'b0000000-0000-0000-0000-000000000000';
  const userA = 'a0000000-0000-0000-0000-000000000001';
  const userB = 'b0000000-0000-0000-0000-000000000001';

  try {
    // Setup test records
    console.log('🔹 Setting up test database records...');
    const setupClient = await pool.connect();
    try {
      // Temporarily bypass RLS for setup by using superuser role without RLS context checks on insert
      await setupClient.query('SET row_security = off;');
      
      // Clean up previous runs
      await setupClient.query('DELETE FROM conversations WHERE tenant_id IN ($1, $2)', [tenantA, tenantB]);
      await setupClient.query('DELETE FROM users WHERE id IN ($1, $2)', [userA, userB]);
      await setupClient.query('DELETE FROM tenants WHERE id IN ($1, $2)', [tenantA, tenantB]);

      // Insert tenants
      await setupClient.query("INSERT INTO tenants (id, name, slug) VALUES ($1, 'Tenant A', 'tenant-a'), ($2, 'Tenant B', 'tenant-b')", [tenantA, tenantB]);
      // Insert users
      await setupClient.query("INSERT INTO users (id, tenant_id, email, password_hash, role) VALUES ($1, $2, 'user-a@test.com', 'pwd', 'user'), ($3, $4, 'user-b@test.com', 'pwd', 'user')", [userA, tenantA, userB, tenantB]);
      // Insert conversations
      await setupClient.query("INSERT INTO conversations (tenant_id, user_id, title, model) VALUES ($1, $2, 'Conv Tenant A', 'model'), ($3, $4, 'Conv Tenant B', 'model')", [tenantA, userA, tenantB, userB]);
      
      await setupClient.query('SET row_security = on;');
    } finally {
      setupClient.release();
    }

    // Test 1: Context Persistence across multiple queries inside the callback
    console.log('\n🔹 Test 1: Context Persistence across multiple queries...');
    await executeTenantQuery(tenantA, async (client) => {
      const res1 = await client.query("SELECT current_setting('app.current_tenant') AS tenant");
      assert.strictEqual(res1.rows[0].tenant, tenantA);
      console.log('   ✓ Query 1 returned correct tenant:', res1.rows[0].tenant);

      const res2 = await client.query("SELECT current_setting('app.current_tenant') AS tenant");
      assert.strictEqual(res2.rows[0].tenant, tenantA);
      console.log('   ✓ Query 2 returned correct tenant:', res2.rows[0].tenant);
    });

    // Test 2: RLS Isolation Enforcement
    console.log('\n🔹 Test 2: RLS Isolation Enforcement...');
    // Querying as Tenant A
    const rowsA = await executeTenantQuery(tenantA, async (client) => {
      const res = await client.query('SELECT title FROM conversations');
      return res.rows;
    });
    assert.strictEqual(rowsA.length, 1);
    assert.strictEqual(rowsA[0].title, 'Conv Tenant A');
    console.log('   ✓ Tenant A context only returned Tenant A conversations.');

    // Querying as Tenant B
    const rowsB = await executeTenantQuery(tenantB, async (client) => {
      const res = await client.query('SELECT title FROM conversations');
      return res.rows;
    });
    assert.strictEqual(rowsB.length, 1);
    assert.strictEqual(rowsB[0].title, 'Conv Tenant B');
    console.log('   ✓ Tenant B context only returned Tenant B conversations.');

    // Test 3: Assert Context raises exception if empty
    console.log('\n🔹 Test 3: assert_tenant_context() raises error when empty...');
    const assertClient = await pool.connect();
    try {
      await assertClient.query("SELECT set_config('app.current_tenant', '', false)");
      await assertClient.query("SELECT assert_tenant_context()");
      assert.fail('Should have thrown an exception');
    } catch (err) {
      assert.ok(err.message.includes('tenant context is not set'));
      console.log('   ✓ Correctly rejected empty context with error:', err.message);
    } finally {
      assertClient.release();
    }

    // Test 4: Connection Pollution Detection
    console.log('\n🔹 Test 4: Connection Pollution Detection...');
    // Manually pollute a client and return it to the pool
    const pollutedClient = await pool.connect();
    await pollutedClient.query("SELECT set_config('app.current_tenant', $1, false)", [tenantA]);
    pollutedClient.release(); // Return to pool while polluted!

    try {
      await connectWithValidation();
      assert.fail('Should have detected polluted connection and thrown an error');
    } catch (err) {
      assert.ok(err.message.includes('Connection pollution detected'));
      console.log('   ✓ Connection pollution safety check succeeded:', err.message);
    }

    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('\n❌ TEST SUITE FAILED:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runTests();
