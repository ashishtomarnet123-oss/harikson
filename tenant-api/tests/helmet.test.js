import axios from 'axios';
import assert from 'assert';

console.log('🧪 Starting Helmet Security Headers Verification Tests...');

const targetUrl = 'http://localhost:3000/health';

async function runTests() {
  try {
    console.log('\n🔹 Fetching /health API headers...');
    const res = await axios.get(targetUrl);
    
    assert.strictEqual(res.status, 200);

    // 1. Verify X-Frame-Options: DENY
    const xfo = res.headers['x-frame-options'];
    assert.strictEqual(xfo, 'DENY', 'X-Frame-Options should be DENY');
    console.log('   ✓ X-Frame-Options: DENY is active.');

    // 2. Verify X-Content-Type-Options: nosniff
    const xcto = res.headers['x-content-type-options'];
    assert.strictEqual(xcto, 'nosniff', 'X-Content-Type-Options should be nosniff');
    console.log('   ✓ X-Content-Type-Options: nosniff is active.');

    // 3. Verify Content-Security-Policy exists
    const csp = res.headers['content-security-policy'];
    assert.ok(csp, 'Content-Security-Policy header should exist');
    assert.ok(csp.includes("default-src 'self'"), 'CSP should contain default-src self');
    console.log('   ✓ Content-Security-Policy is active with correct directives.');

    // 4. Verify Strict-Transport-Security (HSTS) - since NODE_ENV=production on VM
    const hsts = res.headers['strict-transport-security'];
    assert.ok(hsts, 'Strict-Transport-Security header should exist in production');
    console.log('   ✓ Strict-Transport-Security is active: ' + hsts);

    console.log('\n🎉 ALL HELMET SECURITY HEADERS VERIFIED SUCCESSFULLY!');
  } catch (err) {
    console.error('\n❌ HELMET TESTS FAILED:', err.message);
    process.exit(1);
  }
}

runTests();
