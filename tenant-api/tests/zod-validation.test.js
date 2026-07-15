import axios from 'axios';
import assert from 'assert';

console.log('🧪 Starting Zod Input Validation Verification Tests...');

const baseUrl = 'http://localhost:3000';

async function runTests() {
  try {
    // Test 1: login validation with invalid email format
    console.log(
      '\n🔹 Test 1: Testing POST /api/auth/login with invalid email format...'
    );
    try {
      await axios.post(`${baseUrl}/api/auth/login`, {
        email: 'invalid-email',
        password: 'pwd',
      });
      assert.fail('Should have failed with 400 Bad Request');
    } catch (err) {
      if (err.code === 'ERR_ASSERTION') throw err;
      assert.strictEqual(err.response.status, 400);
      assert.strictEqual(err.response.data.error, 'Validation failed');
      const details = err.response.data.details;
      assert.ok(
        details.some((d) => d.path.includes('email')),
        'Error details must report email issue'
      );
      console.log('   ✓ Rejected correctly with 400 and validation details.');
    }

    // Test 2: register validation with short password
    console.log(
      '\n🔹 Test 2: Testing POST /api/auth/register with short password...'
    );
    try {
      await axios.post(`${baseUrl}/api/auth/register`, {
        email: 'test-user@test.com',
        password: '123',
      });
      assert.fail('Should have failed with 400 Bad Request');
    } catch (err) {
      if (err.code === 'ERR_ASSERTION') throw err;
      assert.strictEqual(err.response.status, 400);
      assert.strictEqual(err.response.data.error, 'Validation failed');
      const details = err.response.data.details;
      assert.ok(
        details.some((d) => d.path.includes('password')),
        'Error details must report password issue'
      );
      console.log(
        '   ✓ Rejected correctly with 400 and password error details.'
      );
    }

    // Test 3: validation with missing email
    console.log(
      '\n🔹 Test 3: Testing POST /api/auth/register with missing email...'
    );
    try {
      await axios.post(`${baseUrl}/api/auth/register`, {
        password: 'validpassword123',
      });
      assert.fail('Should have failed with 400 Bad Request');
    } catch (err) {
      if (err.code === 'ERR_ASSERTION') throw err;
      assert.strictEqual(err.response.status, 400);
      assert.strictEqual(err.response.data.error, 'Validation failed');
      const details = err.response.data.details;
      assert.ok(
        details.some((d) => d.path.includes('email')),
        'Error details must report email issue'
      );
      console.log(
        '   ✓ Rejected correctly with 400 and email validation details.'
      );
    }

    console.log('\n🎉 ALL ZOD INPUT VALIDATION TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ ZOD VALIDATION TEST SUITE FAILED:', err.message);
    process.exit(1);
  }
}

runTests();
