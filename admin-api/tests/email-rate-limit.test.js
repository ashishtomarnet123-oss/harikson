import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Email Rate Limiting & Admin Bypass Logic', () => {
  // Mock Redis store
  const redisStore = new Map();

  async function mockCheckEmailRateLimit(email, maxLimit = 50) {
    const key = `ratelimit:emails:${email.toLowerCase().trim()}`;
    const current = (redisStore.get(key) || 0) + 1;
    redisStore.set(key, current);
    if (current > maxLimit) {
      return false;
    }
    return true;
  }

  async function mockResetEmailRateLimit(email) {
    const key = `ratelimit:emails:${email.toLowerCase().trim()}`;
    redisStore.delete(key);
    return true;
  }

  async function mockSendPasswordReset(to, resetUrl, options = {}) {
    const bypassRateLimit = options.bypassRateLimit ?? true;
    const maxLimit = options.maxLimit ?? 50;
    if (!bypassRateLimit && !(await mockCheckEmailRateLimit(to, maxLimit))) {
      return { success: false, error: `Rate limit exceeded. Max ${maxLimit} emails per hour.` };
    }
    return { success: true };
  }

  it('should block consumer after consumer limit (e.g. 3 attempts) when bypass is false', async () => {
    const email = 'user@example.com';
    await mockResetEmailRateLimit(email);

    for (let i = 0; i < 3; i++) {
      const res = await mockSendPasswordReset(email, 'https://example.com/reset', { bypassRateLimit: false, maxLimit: 3 });
      assert.equal(res.success, true);
    }

    const fourth = await mockSendPasswordReset(email, 'https://example.com/reset', { bypassRateLimit: false, maxLimit: 3 });
    assert.equal(fourth.success, false);
    assert.ok(fourth.error.includes('Rate limit exceeded'));
  });

  it('should allow admin-initiated requests with bypassRateLimit = true regardless of count', async () => {
    const email = 'ashishtomar.net123@gmail.com';
    // Artificially flood the rate limit store to 10 attempts
    redisStore.set(`ratelimit:emails:${email}`, 10);

    const res = await mockSendPasswordReset(email, 'https://example.com/reset', { bypassRateLimit: true });
    assert.equal(res.success, true, 'Admin requests with bypassRateLimit must succeed');
  });

  it('should clear the rate limit counter upon resetEmailRateLimit', async () => {
    const email = 'ashishtomar.net123@gmail.com';
    redisStore.set(`ratelimit:emails:${email}`, 50);

    await mockResetEmailRateLimit(email);
    assert.equal(redisStore.has(`ratelimit:emails:${email}`), false);

    const res = await mockSendPasswordReset(email, 'https://example.com/reset', { bypassRateLimit: false, maxLimit: 10 });
    assert.equal(res.success, true);
  });
});
