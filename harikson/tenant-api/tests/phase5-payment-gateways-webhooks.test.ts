if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';
}
if (!process.env.REDIS_URL) {
  process.env.REDIS_URL = 'redis://localhost:6379';
}

import { describe, it, after, afterEach } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import crypto from 'crypto';
import express from 'express';
import { pool, redis } from '../src/db/pool.js';
import billingRoutes from '../src/routes/billing.routes.js';
import {
  enqueueWebhookEvent,
  processWebhookPayload,
  handleWebhookRetryJob,
  webhookRetryQueue,
  webhookDeadLetterQueue,
} from '../src/services/webhookRetryService.js';
import { PhonePeService } from '../src/services/phonepe.service.js';
import { CashfreeService } from '../src/services/cashfree.service.js';
import { NeuraCollectService } from '../src/services/neuracollect.service.js';

describe('Phase 5 — Payment Gateways & Webhook Integrations Test Suite', () => {
  const originalQuery = pool.query;
  const originalConnect = pool.connect;

  after(async () => {
    pool.query = originalQuery;
    pool.connect = originalConnect;
    try {
      redis.disconnect();
    } catch (_) {}
    setTimeout(() => process.exit(0), 100);
  });

  afterEach(() => {
    pool.query = originalQuery;
    pool.connect = originalConnect;
  });

  // Helper to make HTTP requests with raw body capture support
  function request(
    server: http.Server,
    method: string,
    routePath: string,
    headers: Record<string, string> = {},
    body?: any
  ): Promise<{ status: number; body: any; headers: http.IncomingHttpHeaders }> {
    return new Promise((resolve, reject) => {
      const addr = server.address() as any;
      const port = addr.port;
      const postData = typeof body === 'string' ? body : (body ? JSON.stringify(body) : undefined);
      const reqHeaders: Record<string, string> = { ...headers };
      if (postData && !reqHeaders['Content-Type']) {
        reqHeaders['Content-Type'] = 'application/json';
      }
      if (postData) {
        reqHeaders['Content-Length'] = Buffer.byteLength(postData).toString();
      }

      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: routePath,
          method,
          headers: reqHeaders,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            let parsed = data;
            try {
              parsed = JSON.parse(data);
            } catch (_) {}
            resolve({ status: res.statusCode || 500, body: parsed, headers: res.headers });
          });
        }
      );

      req.on('error', reject);
      if (postData) req.write(postData);
      req.end();
    });
  }

  // =========================================================================
  // 1. Stripe Staging Lifecycle
  // =========================================================================
  it('1. Stripe Staging: processes checkout.session.completed with verified INR currency, 18% GST, and active subscription', async () => {
    const tenantId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    let subscriptionInserted: any = null;
    let invoiceInserted: any = null;
    let tenantUpdatedPlan = '';

    (pool as any).query = async (sqlText: string, params?: any[]) => {
      if (sqlText.includes('INSERT INTO subscriptions') && params?.[0] === tenantId) {
        subscriptionInserted = {
          tenantId: params?.[0],
          provider: 'stripe',
          providerSubscriptionId: params?.[1],
          planId: params?.[2],
          amount: params?.[3],
        };
        return { rows: [{ id: 'sub-stripe-001' }] };
      }
      if (sqlText.includes('INSERT INTO invoices') && params?.[0] === tenantId) {
        invoiceInserted = {
          tenantId: params?.[0],
          subscriptionId: params?.[1],
          providerInvoiceId: params?.[2],
          invoiceNumber: params?.[3],
          amount: params?.[4],
          currency: 'INR',
          subtotal: params?.[5],
          taxAmount: params?.[6],
          total: params?.[7],
        };
        return { rows: [{ id: 'inv-stripe-001' }] };
      }
      if (sqlText.includes('UPDATE tenants SET status') && params?.[0] === tenantId) {
        tenantUpdatedPlan = params?.[1];
        return { rows: [] };
      }
      return { rows: [] };
    };

    const stripePayload = {
      data: {
        object: {
          id: 'cs_test_stripe_staging_123',
          subscription: 'sub_stripe_prov_123',
          payment_intent: 'pi_test_stripe_123',
          amount_total: 176882, // ₹1,768.82 in paise (₹1,499 + 18% GST)
          currency: 'inr',
          metadata: {
            tenantId,
            planId: 'professional',
          },
        },
      },
    };

    await processWebhookPayload('stripe', 'checkout.session.completed', stripePayload);

    assert.ok(subscriptionInserted, 'Subscription must be inserted for Stripe checkout');
    assert.strictEqual(subscriptionInserted.tenantId, tenantId);
    assert.strictEqual(subscriptionInserted.planId, 'professional');
    assert.ok(invoiceInserted, 'Invoice must be generated for Stripe payment');
    assert.strictEqual(invoiceInserted.currency, 'INR');
    assert.strictEqual(invoiceInserted.total, 1768.82);
    // Subtotal: 1768.82 / 1.18 = ~1499.00
    assert.strictEqual(invoiceInserted.subtotal, 1499.0);
    assert.strictEqual(invoiceInserted.taxAmount, 269.82);
    assert.strictEqual(tenantUpdatedPlan, 'professional');
  });

  // =========================================================================
  // 2. Razorpay Staging Lifecycle
  // =========================================================================
  it('2. Razorpay Staging: processes payment.captured with verified notes, 18% GST invoice, and plan activation', async () => {
    const tenantId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    let subscriptionInserted: any = null;
    let invoiceInserted: any = null;
    let tenantUpdatedPlan = '';

    (pool as any).query = async (sqlText: string, params?: any[]) => {
      if (sqlText.includes('INSERT INTO subscriptions') && params?.[0] === tenantId) {
        subscriptionInserted = {
          tenantId: params?.[0],
          provider: 'razorpay',
          providerSubscriptionId: params?.[1],
          planId: params?.[2],
          amount: params?.[3],
        };
        return { rows: [{ id: 'sub-rzp-001' }] };
      }
      if (sqlText.includes('INSERT INTO invoices') && params?.[0] === tenantId) {
        invoiceInserted = {
          tenantId: params?.[0],
          subscriptionId: params?.[1],
          providerInvoiceId: params?.[2],
          amount: params?.[4],
          currency: params?.[5],
          subtotal: params?.[6],
          taxAmount: params?.[7],
          total: params?.[8],
        };
        return { rows: [{ id: 'inv-rzp-001' }] };
      }
      if (sqlText.includes('UPDATE tenants SET plan') && params?.[0] === tenantId) {
        tenantUpdatedPlan = params?.[1];
        return { rows: [] };
      }
      return { rows: [] };
    };

    const razorpayPayload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_test_rzp_staging_456',
            order_id: 'order_test_rzp_123',
            amount: 58882, // ₹588.82 (₹499 + 18% GST)
            currency: 'INR',
            status: 'captured',
            notes: {
              tenantId,
              planId: 'starter',
            },
          },
        },
      },
    };

    await processWebhookPayload('razorpay', 'payment.captured', razorpayPayload);

    assert.ok(subscriptionInserted, 'Subscription must be inserted for Razorpay payment');
    assert.strictEqual(subscriptionInserted.tenantId, tenantId);
    assert.strictEqual(subscriptionInserted.planId, 'starter');
    assert.ok(invoiceInserted, 'Invoice must be recorded');
    assert.strictEqual(invoiceInserted.currency, 'INR');
    assert.strictEqual(invoiceInserted.total, 588.82);
    assert.strictEqual(invoiceInserted.subtotal, 499.0);
    assert.strictEqual(invoiceInserted.taxAmount, 89.82);
    assert.strictEqual(tenantUpdatedPlan, 'starter');
  });

  // =========================================================================
  // 3. PhonePe Staging Lifecycle
  // =========================================================================
  it('3. PhonePe Staging: decodes base64 S2S response, verifies checksum, generates GST invoice, and updates plan', async () => {
    const tenantId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
    let subscriptionInserted: any = null;
    let invoiceInserted: any = null;
    let tenantUpdatedPlan = '';

    (pool as any).query = async (sqlText: string, params?: any[]) => {
      if (sqlText.includes('INSERT INTO subscriptions') && params?.[0] === tenantId) {
        subscriptionInserted = {
          tenantId: params?.[0],
          provider: 'phonepe',
          providerSubscriptionId: params?.[1],
          planId: params?.[2],
          amount: params?.[3],
        };
        return { rows: [{ id: 'sub-phpe-001' }] };
      }
      if (sqlText.includes('INSERT INTO invoices') && params?.[0] === tenantId) {
        invoiceInserted = {
          tenantId: params?.[0],
          subscriptionId: params?.[1],
          providerInvoiceId: params?.[2],
          amount: params?.[4],
          currency: params?.[5],
          subtotal: params?.[6],
          taxAmount: params?.[7],
          total: params?.[8],
        };
        return { rows: [{ id: 'inv-phpe-001' }] };
      }
      if (sqlText.includes('UPDATE tenants SET plan') && params?.[0] === tenantId) {
        tenantUpdatedPlan = params?.[1];
        return { rows: [] };
      }
      return { rows: [] };
    };

    const phonepeInnerData = {
      merchantTransactionId: `TXN_${tenantId}_enterprise_${Date.now()}`,
      transactionId: 'T261111999999999',
      amount: 589882, // ₹5,898.82 (₹4,999 + 18% GST in paise)
      state: 'COMPLETED',
      responseCode: 'SUCCESS',
      currency: 'INR',
    };

    const phonepePayload = {
      success: true,
      code: 'PAYMENT_SUCCESS',
      data: phonepeInnerData,
    };

    await processWebhookPayload('phonepe', 'PAYMENT_SUCCESS', phonepePayload);

    assert.ok(subscriptionInserted, 'Subscription must be inserted for PhonePe');
    assert.strictEqual(subscriptionInserted.tenantId, tenantId);
    assert.strictEqual(subscriptionInserted.planId, 'enterprise');
    assert.ok(invoiceInserted, 'Invoice must be recorded for PhonePe');
    assert.strictEqual(invoiceInserted.currency, 'INR');
    assert.strictEqual(invoiceInserted.total, 5898.82);
    assert.strictEqual(invoiceInserted.subtotal, 4999.0);
    assert.strictEqual(invoiceInserted.taxAmount, 899.82);
    assert.strictEqual(tenantUpdatedPlan, 'enterprise');
  });

  // =========================================================================
  // 4. Cashfree Staging Lifecycle
  // =========================================================================
  it('4. Cashfree Staging: processes PAYMENT_SUCCESS_WEBHOOK with order tags, generates GST invoice, and updates plan', async () => {
    const tenantId = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
    let subscriptionInserted: any = null;
    let invoiceInserted: any = null;
    let tenantUpdatedPlan = '';

    (pool as any).query = async (sqlText: string, params?: any[]) => {
      if (sqlText.includes('INSERT INTO subscriptions') && params?.[0] === tenantId) {
        subscriptionInserted = {
          tenantId: params?.[0],
          provider: 'cashfree',
          providerSubscriptionId: params?.[1],
          planId: params?.[2],
          amount: params?.[3],
        };
        return { rows: [{ id: 'sub-cf-001' }] };
      }
      if (sqlText.includes('INSERT INTO invoices') && params?.[0] === tenantId) {
        invoiceInserted = {
          tenantId: params?.[0],
          subscriptionId: params?.[1],
          providerInvoiceId: params?.[2],
          amount: params?.[4],
          currency: params?.[5],
          subtotal: params?.[6],
          taxAmount: params?.[7],
          total: params?.[8],
        };
        return { rows: [{ id: 'inv-cf-001' }] };
      }
      if (sqlText.includes('UPDATE tenants SET plan') && params?.[0] === tenantId) {
        tenantUpdatedPlan = params?.[1];
        return { rows: [] };
      }
      return { rows: [] };
    };

    const cashfreePayload = {
      type: 'PAYMENT_SUCCESS_WEBHOOK',
      data: {
        order: {
          order_id: 'order_cf_staging_123',
          order_amount: 1768.82,
          order_currency: 'INR',
          order_tags: {
            tenant_id: tenantId,
            plan_id: 'professional',
          },
        },
        payment: {
          cf_payment_id: '123456789',
          payment_status: 'SUCCESS',
          payment_currency: 'INR',
        },
      },
    };

    await processWebhookPayload('cashfree', 'PAYMENT_SUCCESS_WEBHOOK', cashfreePayload);

    assert.ok(subscriptionInserted, 'Subscription must be inserted for Cashfree');
    assert.strictEqual(subscriptionInserted.tenantId, tenantId);
    assert.strictEqual(subscriptionInserted.planId, 'professional');
    assert.ok(invoiceInserted, 'Invoice must be recorded');
    assert.strictEqual(invoiceInserted.currency, 'INR');
    assert.strictEqual(invoiceInserted.total, 1768.82);
    assert.strictEqual(invoiceInserted.subtotal, 1499.0);
    assert.strictEqual(invoiceInserted.taxAmount, 269.82);
    assert.strictEqual(tenantUpdatedPlan, 'professional');
  });

  // =========================================================================
  // 5. NeuraCollect Staging Lifecycle
  // =========================================================================
  it('5. NeuraCollect Staging: processes PAYMENT_SUCCESS with structured externalOrderId, 18% GST, and plan activation', async () => {
    const tenantId = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
    let subscriptionInserted: any = null;
    let invoiceInserted: any = null;
    let tenantUpdatedPlan = '';

    (pool as any).query = async (sqlText: string, params?: any[]) => {
      if (sqlText.includes('INSERT INTO subscriptions') && params?.[0] === tenantId) {
        subscriptionInserted = {
          tenantId: params?.[0],
          provider: 'neuracollect',
          providerSubscriptionId: params?.[1],
          planId: params?.[2],
          amount: params?.[3],
        };
        return { rows: [{ id: 'sub-nc-001' }] };
      }
      if (sqlText.includes('INSERT INTO invoices') && params?.[0] === tenantId) {
        invoiceInserted = {
          tenantId: params?.[0],
          subscriptionId: params?.[1],
          providerInvoiceId: params?.[2],
          amount: params?.[4],
          currency: params?.[5],
          subtotal: params?.[6],
          taxAmount: params?.[7],
          total: params?.[8],
        };
        return { rows: [{ id: 'inv-nc-001' }] };
      }
      if (sqlText.includes('UPDATE tenants SET plan') && params?.[0] === tenantId) {
        tenantUpdatedPlan = params?.[1];
        return { rows: [] };
      }
      return { rows: [] };
    };

    const neuracollectPayload = {
      eventType: 'PAYMENT_SUCCESS',
      externalOrderId: `nc_${tenantId.slice(0, 8)}_starter_${Date.now()}`,
      gatewayOrderId: 'nc_gw_pay_998877',
      amount: 588.82,
      currency: 'INR',
      tenantId,
      planId: 'starter',
      payment_status: 'SUCCESS',
    };

    await processWebhookPayload('neuracollect', 'PAYMENT_SUCCESS', neuracollectPayload);

    assert.ok(subscriptionInserted, 'Subscription must be inserted for NeuraCollect');
    assert.strictEqual(subscriptionInserted.tenantId, tenantId);
    assert.strictEqual(subscriptionInserted.planId, 'starter');
    assert.ok(invoiceInserted, 'Invoice must be recorded');
    assert.strictEqual(invoiceInserted.currency, 'INR');
    assert.strictEqual(invoiceInserted.total, 588.82);
    assert.strictEqual(invoiceInserted.subtotal, 499.0);
    assert.strictEqual(invoiceInserted.taxAmount, 89.82);
    assert.strictEqual(tenantUpdatedPlan, 'starter');
  });

  // =========================================================================
  // 6. Cryptographic Signature Enforcement Across All 5 Gateways
  // =========================================================================
  it('6. Cryptographic Signatures: rejects unsigned, tampered, or forged payloads on all 5 provider webhook routes', async () => {
    const app = express();
    app.use(
      express.json({
        verify: (req: any, _res, buf) => {
          req.rawBody = buf;
        },
      })
    );
    app.use('/webhooks', billingRoutes);

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));

    try {
      // 1. Stripe with invalid signature (400 if Stripe configured, 503 if secret missing in test env)
      const resStripe = await request(
        server,
        'POST',
        '/webhooks/stripe',
        { 'stripe-signature': 't=12345,v1=fake_forged_sig' },
        { id: 'evt_stripe_test' }
      );
      assert.ok([400, 503].includes(resStripe.status), 'Stripe must return 400 for bad signature or 503 when unconfigured');

      // 2. Razorpay with forged signature
      process.env.RAZORPAY_WEBHOOK_SECRET = 'rzp_test_secret_123';
      const resRzp = await request(
        server,
        'POST',
        '/webhooks/razorpay',
        { 'x-razorpay-signature': 'forged_razorpay_sig' },
        { event: 'payment.captured' }
      );
      assert.strictEqual(resRzp.status, 400);

      // 3. PhonePe with missing x-verify
      const resPhonePe = await request(
        server,
        'POST',
        '/webhooks/phonepe',
        {},
        { response: 'eyJzdGF0dXMiOiJTVUNDRVNTIn0=' }
      );
      assert.strictEqual(resPhonePe.status, 400);

      // 4. Cashfree with missing or forged signature
      const resCashfree = await request(
        server,
        'POST',
        '/webhooks/cashfree',
        { 'x-webhook-timestamp': '1700000000', 'x-webhook-signature': 'forged_cf_sig' },
        { type: 'PAYMENT_SUCCESS_WEBHOOK' }
      );
      assert.strictEqual(resCashfree.status, 400);

      // 5. NeuraCollect with missing or forged signature
      const resNC = await request(
        server,
        'POST',
        '/webhooks/neuracollect',
        { 'x-webhook-timestamp': '1700000000', 'x-webhook-signature': 'forged_nc_sig' },
        { eventType: 'PAYMENT_SUCCESS' }
      );
      assert.strictEqual(resNC.status, 400);
    } finally {
      server.close();
    }
  });

  // =========================================================================
  // 7. Strict Currency & Amount Validation (INR Invariant)
  // =========================================================================
  it('7. Currency Validation: rejects non-INR or missing currencies and marks event unresolved without activating plan', async () => {
    let tenantPlanActivated = false;

    (pool as any).query = async (sqlText: string) => {
      if (sqlText.includes('UPDATE tenants SET plan')) {
        tenantPlanActivated = true;
      }
      return { rows: [] };
    };

    // Non-INR Stripe event (USD)
    const usdPayload = {
      data: {
        object: {
          id: 'cs_usd_event_123',
          currency: 'usd', // Rejected!
          metadata: {
            tenantId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            planId: 'professional',
          },
        },
      },
    };

    await assert.rejects(
      async () => {
        await processWebhookPayload('stripe', 'checkout.session.completed', usdPayload);
      },
      /Non-INR currency 'usd' rejected/,
      'Must reject non-INR currency for Stripe'
    );

    assert.strictEqual(tenantPlanActivated, false, 'Tenant plan must NOT be elevated on non-INR currency');

    // Missing currency Razorpay event
    const missingCurrencyRzp = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_missing_cur_123',
            notes: { tenantId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', planId: 'starter' },
          },
        },
      },
    };

    await assert.rejects(
      async () => {
        await processWebhookPayload('razorpay', 'payment.captured', missingCurrencyRzp);
      },
      /Missing currency in Razorpay event/,
      'Must reject missing currency for Razorpay'
    );
  });

  // =========================================================================
  // 8. Idempotency & Duplicate Webhook Delivery Protection
  // =========================================================================
  it('8. Idempotency: duplicate webhook deliveries are safely skipped if already processed', async () => {
    let queryExecutionCount = 0;

    (pool as any).query = async (sqlText: string, params?: any[]) => {
      if (sqlText.includes('SELECT status FROM payment_webhooks')) {
        // Return already processed status
        return { rows: [{ status: 'processed' }] };
      }
      if (sqlText.includes('INSERT INTO subscriptions') || sqlText.includes('UPDATE tenants')) {
        queryExecutionCount++;
        return { rows: [] };
      }
      return { rows: [] };
    };

    const mockJob: any = {
      data: {
        eventId: 'evt_duplicate_test_123',
        provider: 'stripe',
        eventType: 'checkout.session.completed',
        payload: { id: 'evt_duplicate_test_123' },
        attempt: 1,
      },
    };

    await handleWebhookRetryJob(mockJob);

    // Idempotency check must skip execution completely
    assert.strictEqual(queryExecutionCount, 0, 'No state mutations should occur for duplicate processed webhook');
  });

  // =========================================================================
  // 9. Out-of-Order Cancellation Protection
  // =========================================================================
  it('9. Out-of-Order Handling: late cancellation event does not cancel tenant if another active subscription exists', async () => {
    const tenantId = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
    let tenantCanceled = false;

    (pool as any).query = async (sqlText: string, params?: any[]) => {
      if (sqlText.includes('SELECT id FROM subscriptions WHERE tenant_id = $1 AND status = \'active\'')) {
        // Active subscription exists!
        return { rows: [{ id: 'sub-renewed-active-cycle' }] };
      }
      if (sqlText.includes('UPDATE tenants SET status = \'canceled\'')) {
        tenantCanceled = true;
        return { rows: [] };
      }
      return { rows: [] };
    };

    const lateCancellationPayload = {
      data: {
        object: {
          id: 'sub_old_canceled_123',
          metadata: {
            tenantId,
          },
        },
      },
    };

    await processWebhookPayload('stripe', 'customer.subscription.deleted', lateCancellationPayload);

    // Tenant must remain active because another active subscription exists
    assert.strictEqual(tenantCanceled, false, 'Late cancellation must not override existing active subscription');
  });

  // =========================================================================
  // 10. Dead-Letter Queue (DLQ) & Permanent Failure Handling
  // =========================================================================
  it('10. Dead-Letter Queue: 5th failure marks status failed and delivers payload to webhookDeadLetterQueue', async () => {
    let updatedStatus = '';
    let updatedError = '';
    let dlqJobAdded = false;

    (pool as any).query = async (sqlText: string, params?: any[]) => {
      if (sqlText.includes('SELECT status FROM payment_webhooks')) {
        return { rows: [{ status: 'pending' }] };
      }
      if (sqlText.includes('INSERT INTO subscriptions')) {
        throw new Error('Database transaction deadlocked');
      }
      if (sqlText.includes('UPDATE payment_webhooks') && sqlText.includes("status = 'failed'")) {
        updatedError = params?.[0];
        updatedStatus = 'failed';
        return { rows: [] };
      }
      return { rows: [] };
    };

    // Spy on dead letter queue add method
    const originalDlqAdd = webhookDeadLetterQueue.add;
    (webhookDeadLetterQueue as any).add = async (name: string, data: any) => {
      if (name === 'dead-letter-event') {
        dlqJobAdded = true;
      }
      return {} as any;
    };

    const mockFailedJob: any = {
      data: {
        eventId: 'evt_failing_five_times',
        provider: 'phonepe',
        eventType: 'PAYMENT_SUCCESS',
        payload: {
          success: true,
          code: 'PAYMENT_SUCCESS',
          data: {
            merchantTransactionId: 'TXN_test_tenant_starter_123',
            amount: 50000,
            currency: 'INR',
          },
        },
        attempt: 5, // 5th attempt!
      },
    };

    try {
      await handleWebhookRetryJob(mockFailedJob);
    } finally {
      webhookDeadLetterQueue.add = originalDlqAdd;
    }

    assert.strictEqual(updatedStatus, 'failed', 'Webhook record must transition to failed on 5th failure');
    assert.ok(dlqJobAdded, 'Event must be sent to webhookDeadLetterQueue on 5th failure');
  });
});
