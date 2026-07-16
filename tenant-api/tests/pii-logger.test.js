import pino from 'pino';
import assert from 'assert';

let loggedData = '';
const captureStream = {
  write(chunk) {
    loggedData += chunk.toString();
  }
};

// Create a logger with a custom output stream
const logger = pino({
  level: 'info',
  redact: {
    paths: [
      'password', 'password_hash', 'token', 'refreshToken',
      'apiKey', 'key', 'secret', 'authorization',
      'email', 'phone', 'content', 'socialLinks'
    ],
    remove: true
  }
}, captureStream);

// Log object containing PII
logger.info({ password: 'secret123', email: 'test@example.com', name: 'Test User' });

console.log('\n--- Logger Test Verification ---');
console.log('Raw output:', loggedData.trim());

// Verify output
const logObj = JSON.parse(loggedData);

// Verify PII is redacted/removed
assert.strictEqual(logObj.password, undefined, 'Password should be removed');
assert.strictEqual(logObj.email, undefined, 'Email should be removed');
assert.strictEqual(logObj.name, 'Test User', 'Non-redacted fields should remain');

console.log('Output contains: [Redacted]');
console.log('✅ TEST PASSED: PII elements were successfully redacted.');
