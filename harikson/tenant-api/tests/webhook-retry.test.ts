import { describe, it, expect, after } from './test-utils.js';
import { enqueueWebhookEvent, processWebhookPayload, webhookRetryQueue, webhookDeadLetterQueue, webhookRedisConnection } from '../src/services/webhookRetryService.js';
import { pool, readPool, redis } from '../src/db/pool.js';

describe('Reliable Webhook Retry Queue & Idempotency Test Suite', () => {
  after(async () => {
    try {
      await webhookRetryQueue.close();
      await webhookDeadLetterQueue.close();
      if (webhookRedisConnection && webhookRedisConnection.status !== 'end') {
        webhookRedisConnection.disconnect();
      }
      await pool.end();
      await readPool.end();
      if (redis.status !== 'end') {
        redis.disconnect();
      }
    } catch {
      // ignore
    }
  });

  it('1. Immediately stores webhook as pending and enqueues event', async () => {
    const eventId = 'evt_test_' + Date.now();
    const provider = 'stripe';
    const eventType = 'checkout.session.completed';
    const payload = { id: eventId, type: eventType, data: { object: { amount_total: 5000 } } };

    const record = await enqueueWebhookEvent(provider, eventId, eventType, payload, 50);

    expect(record).toBeDefined();
    expect(record.status).toEqual('pending');
  });

  it('2. Handles idempotency cleanly on duplicate event receipt', async () => {
    const eventId = 'evt_idempotent_test_123';
    const provider = 'stripe';
    const eventType = 'checkout.session.completed';
    const payload = { id: eventId, type: eventType };

    const first = await enqueueWebhookEvent(provider, eventId, eventType, payload);
    const second = await enqueueWebhookEvent(provider, eventId, eventType, payload);

    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(second.status).toEqual('pending');
  });

  it('3. Processes webhook payload for subscription activation', async () => {
    const tenantRes = await pool.query('SELECT id FROM tenants LIMIT 1');
    const tenantId = tenantRes.rows[0]?.id || '73aa1c8e-64f1-4f2a-927a-ee55345b9e43';

    const payload = {
      data: {
        object: {
          id: 'cs_test_checkout_123',
          subscription: 'sub_stripe_12345',
          currency: 'inr',
          amount_total: 499900,
          metadata: {
            tenantId,
            planId: 'professional',
          },
        },
      },
    };

    await expect(
      processWebhookPayload('stripe', 'checkout.session.completed', payload)
    ).resolves.not.toThrow();
  });
});
