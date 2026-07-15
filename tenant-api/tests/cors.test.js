import axios from 'axios';
import assert from 'assert';

console.log('🧪 Starting CORS Policy Verification Tests...');

const targetUrl = 'http://localhost:3000/health';

async function runTests() {
  try {
    // Test 1: Whitelisted Origin
    console.log('\n🔹 Test 1: Allowed Origin (https://app.neuravolt.cloud)...');
    const allowedRes = await axios.get(targetUrl, {
      headers: { 'Origin': 'https://app.neuravolt.cloud' }
    });
    
    assert.strictEqual(allowedRes.status, 200);
    assert.strictEqual(allowedRes.headers['access-control-allow-origin'], 'https://app.neuravolt.cloud');
    console.log('   ✓ Allowed origin successfully accepted with CORS header.');

    // Test 2: Unauthorized Origin
    console.log('\n🔹 Test 2: Unauthorized Origin (https://evil.com)...');
    try {
      await axios.get(targetUrl, {
        headers: { 'Origin': 'https://evil.com' }
      });
      assert.fail('Should have blocked origin https://evil.com');
    } catch (err) {
      if (err.code === 'ERR_ASSERTION') throw err;
      
      // Axios throws when returning 500 (CORS policy violation error)
      const isBlocked = err.response ? err.response.status === 500 : true;
      assert.ok(isBlocked, 'Request should be blocked with error');
      
      // Ensure the unauthorized origin CORS headers are NOT present
      const acaoHeader = err.response ? err.response.headers['access-control-allow-origin'] : undefined;
      assert.ok(!acaoHeader || acaoHeader !== 'https://evil.com', 'Evil CORS header should not be set');
      
      console.log('   ✓ Unauthorized origin successfully blocked.');
    }

    console.log('\n🎉 ALL CORS TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('\n❌ CORS TEST SUITE FAILED:', err.message);
    process.exit(1);
  }
}

runTests();
