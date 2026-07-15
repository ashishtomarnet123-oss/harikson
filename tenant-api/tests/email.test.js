import { sendPasswordReset, sendWelcomeEmail, sendInvoiceReceipt } from '../src/services/email.js';
import assert from 'assert';
import Redis from 'ioredis';

console.log('🧪 Starting Resend Integration & Rate Limiting Tests...');

const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');
const testEmail = 'test_rate_limiting_' + Date.now() + '@example.com';

async function runTests() {
  try {
    // Clean up any existing keys for the test email
    const limitKey = `ratelimit:emails:${testEmail.toLowerCase()}`;
    await redis.del(limitKey);

    console.log('\n🔹 Test 1: Rate Limiting (Max 3 emails per hour)...');
    
    // First 3 emails should proceed (we expect Resend to try sending them, even if the API key is not active, but the rate limit itself will not block it)
    console.log('   Sending Email 1...');
    const res1 = await sendPasswordReset(testEmail, 'http://localhost/reset');
    
    console.log('   Sending Email 2...');
    const res2 = await sendWelcomeEmail(testEmail, 'Test User');
    
    console.log('   Sending Email 3...');
    const res3 = await sendInvoiceReceipt(testEmail, { amount: 1000, currency: 'USD', status: 'paid' });
    
    // Email 4 should be blocked by our rate limiter
    console.log('   Sending Email 4...');
    const res4 = await sendPasswordReset(testEmail, 'http://localhost/reset');
    
    assert.strictEqual(res4.success, false);
    assert.ok(res4.error.includes('Rate limit exceeded'), 'Should trigger rate limit error');
    console.log('   ✓ Email 4 successfully blocked by rate limiter.');

    // 2. Graceful Error Handling test (with invalid email or bad API key)
    console.log('\n🔹 Test 2: Graceful Error Handling...');
    const badRes = await sendWelcomeEmail('invalid-email-address', 'No Name');
    assert.strictEqual(badRes.success, false, 'Should fail gracefully');
    console.log('   ✓ Email call failed gracefully as expected: ' + badRes.error);

    console.log('\n🎉 ALL EMAIL TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ EMAIL TEST SUITE FAILED:', err.message);
    process.exit(1);
  }
}

runTests();
