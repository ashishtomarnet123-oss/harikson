if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';
}
if (!process.env.REDIS_URL) {
  process.env.REDIS_URL = 'redis://localhost:6379';
}

import { describe, it, after, afterEach } from 'node:test';
import assert from 'node:assert';
import { pool, redis } from '../src/db/pool.js';

describe('Phase 2 Tenant API Checkout & INR Enforcement Test Suite', () => {
  const originalQuery = pool.query;

  after(() => {
    pool.query = originalQuery;
    try {
      redis.disconnect();
    } catch (_) {}
  });

  afterEach(() => {
    pool.query = originalQuery;
  });

  function createMockRes() {
    let statusCode = 200;
    let jsonBody: any = null;
    const res: any = {
      status: (code: number) => {
        statusCode = code;
        return res;
      },
      json: (data: any) => {
        jsonBody = data;
        return res;
      },
      getStatusCode: () => statusCode,
      getBody: () => jsonBody,
    };
    return res;
  }

  // =========================================================================
  // Checkout INR Currency Validation
  // =========================================================================
  describe('Checkout INR Currency Enforcement', () => {
    function simulateCheckoutHandler(plan: any, reqBody: any) {
      if (!plan) {
        return { status: 400, body: { error: 'Unknown planId' } };
      }

      if (Number(plan.price) <= 0) {
        return { status: 400, body: { error: 'Plan does not require payment' } };
      }

      const planCurrency = (plan.currency || 'INR').trim().toUpperCase();
      if (planCurrency !== 'INR') {
        return { status: 400, body: { error: 'Only INR plans are eligible for checkout. Selected plan is non-INR.' } };
      }

      return {
        status: 200,
        body: {
          success: true,
          planId: plan.id,
          amountPaise: Math.round(Number(plan.price) * 100),
          currency: 'INR',
        },
      };
    }

    it('1. Rejects checkout for a USD plan with HTTP 400', () => {
      const usdPlan = { id: 'enterprise-usd', name: 'USD Plan', price: 99, currency: 'USD' };
      const res = simulateCheckoutHandler(usdPlan, { planId: 'enterprise-usd' });
      assert.strictEqual(res.status, 400);
      assert.match(res.body.error, /Only INR plans are eligible for checkout/);
    });

    it('2. Rejects checkout for an unsupported currency (EUR) plan with HTTP 400', () => {
      const eurPlan = { id: 'pro-eur', name: 'Euro Plan', price: 49, currency: 'EUR' };
      const res = simulateCheckoutHandler(eurPlan, { planId: 'pro-eur' });
      assert.strictEqual(res.status, 400);
      assert.match(res.body.error, /Only INR plans are eligible for checkout/);
    });

    it('3. Rejects checkout for a free plan (price = 0) with HTTP 400', () => {
      const freePlan = { id: 'free', name: 'Free Tier', price: 0, currency: 'INR' };
      const res = simulateCheckoutHandler(freePlan, { planId: 'free' });
      assert.strictEqual(res.status, 400);
      assert.match(res.body.error, /Plan does not require payment/);
    });

    it('4. Accepts checkout for valid INR paid plans', () => {
      const starterPlan = { id: 'starter', name: 'Starter', price: 149, currency: 'INR' };
      const res = simulateCheckoutHandler(starterPlan, { planId: 'starter' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.currency, 'INR');
      assert.strictEqual(res.body.amountPaise, 14900);
    });

    it('5. Handles missing plan currency safely by defaulting to INR if price is positive', () => {
      const planNoCurrency = { id: 'starter', name: 'Starter', price: 149 };
      const res = simulateCheckoutHandler(planNoCurrency, { planId: 'starter' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.currency, 'INR');
    });

    it('6. Client cannot override server-authoritative price or currency', () => {
      const canonicalPlan = { id: 'starter', name: 'Starter', price: 149, currency: 'INR' };
      // Malicious client tries to submit USD and lower price in request body
      const maliciousBody = { planId: 'starter', price: 1.0, currency: 'USD' };
      const res = simulateCheckoutHandler(canonicalPlan, maliciousBody);

      assert.strictEqual(res.status, 200);
      // Authoritative values from canonicalPlan must be preserved
      assert.strictEqual(res.body.amountPaise, 14900, 'Must charge 14,900 paise, ignoring client override');
      assert.strictEqual(res.body.currency, 'INR', 'Must enforce INR, ignoring client currency');
    });
  });

  // =========================================================================
  // Payment Verification INR Safeguards
  // =========================================================================
  describe('Payment Verification Currency Integrity', () => {
    function simulatePaymentVerification(plan: any, paymentDetails: any) {
      if (!plan) return { status: 400, error: 'Unknown plan' };
      const planCurrency = (plan.currency || 'INR').trim().toUpperCase();
      if (planCurrency !== 'INR') {
        return { status: 400, error: 'Only INR plans are eligible for payment verification.' };
      }
      const paymentCurrency = (paymentDetails.currency || 'INR').toUpperCase();
      if (paymentCurrency !== 'INR') {
        return { status: 400, error: 'Payment currency mismatch: only INR payments are accepted' };
      }
      return { status: 200, success: true, verifiedCurrency: 'INR' };
    }

    it('1. Rejects payment verification for non-INR plan', () => {
      const usdPlan = { id: 'usd-plan', price: 99, currency: 'USD' };
      const res = simulatePaymentVerification(usdPlan, { currency: 'USD' });
      assert.strictEqual(res.status, 400);
      assert.match(res.error, /Only INR plans are eligible for payment verification/);
    });

    it('2. Rejects payment verification if provider payment currency mismatches INR', () => {
      const inrPlan = { id: 'starter', price: 149, currency: 'INR' };
      const res = simulatePaymentVerification(inrPlan, { currency: 'USD' });
      assert.strictEqual(res.status, 400);
      assert.match(res.error, /Payment currency mismatch/);
    });

    it('3. Accepts payment verification when both plan and payment are verified INR', () => {
      const inrPlan = { id: 'starter', price: 149, currency: 'INR' };
      const res = simulatePaymentVerification(inrPlan, { currency: 'INR' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.verifiedCurrency, 'INR');
    });
  });

  // =========================================================================
  // Webhook Retry Service Currency Safeguards (Fix 5)
  // =========================================================================
  describe('Webhook Retry Service Currency Integrity (Fix 5)', () => {
    // Dynamic import to avoid queue connection issues before mocks
    let processWebhookPayload: any;

    after(async () => {
      try {
        redis.disconnect();
      } catch (_) {}
    });

    it('1. Loads webhook retry service successfully', async () => {
      const mod = await import('../src/services/webhookRetryService.js');
      processWebhookPayload = mod.processWebhookPayload;
      assert.ok(processWebhookPayload, 'processWebhookPayload should be exported');
    });

    it('2. Razorpay: rejects missing currency without fallback to INR', async () => {
      const payloadNoCurr = {
        payload: {
          payment: {
            entity: {
              id: 'pay_test_no_curr',
              amount: 14900,
              // currency is absent
            },
          },
        },
      };

      await assert.rejects(
        async () => {
          await processWebhookPayload('razorpay', 'payment.captured', payloadNoCurr);
        },
        {
          name: 'Error',
          message: /Missing currency in Razorpay event/,
        }
      );
    });

    it('3. Razorpay: rejects non-INR currency (USD)', async () => {
      const payloadUsd = {
        payload: {
          payment: {
            entity: {
              id: 'pay_test_usd',
              amount: 2900,
              currency: 'USD',
            },
          },
        },
      };

      await assert.rejects(
        async () => {
          await processWebhookPayload('razorpay', 'payment.captured', payloadUsd);
        },
        {
          name: 'Error',
          message: /Non-INR currency 'USD' rejected for Razorpay event/,
        }
      );
    });

    it('4. Cashfree: rejects missing currency without fallback to INR', async () => {
      const payloadNoCurr = {
        data: {
          order: {
            order_id: 'order_cf_no_curr',
            order_amount: 149,
            // order_currency absent
          },
        },
      };

      await assert.rejects(
        async () => {
          await processWebhookPayload('cashfree', 'PAYMENT_SUCCESS_WEBHOOK', payloadNoCurr);
        },
        {
          name: 'Error',
          message: /Missing currency in Cashfree event/,
        }
      );
    });

    it('5. Cashfree: rejects non-INR currency (EUR)', async () => {
      const payloadEur = {
        data: {
          order: {
            order_id: 'order_cf_eur',
            order_amount: 49,
            order_currency: 'EUR',
          },
        },
      };

      await assert.rejects(
        async () => {
          await processWebhookPayload('cashfree', 'PAYMENT_SUCCESS_WEBHOOK', payloadEur);
        },
        {
          name: 'Error',
          message: /Non-INR currency 'EUR' rejected for Cashfree event/,
        }
      );
    });

    it('6. NeuraCollect: rejects missing currency without fallback to INR', async () => {
      const payloadNoCurr = {
        orderId: 'nc_test_no_curr',
        amount: 149,
        // currency absent
      };

      await assert.rejects(
        async () => {
          await processWebhookPayload('neuracollect', 'PAYMENT_SUCCESS_WEBHOOK', payloadNoCurr);
        },
        {
          name: 'Error',
          message: /Missing currency in NeuraCollect event/,
        }
      );
    });

    it('7. NeuraCollect: rejects non-INR currency (GBP)', async () => {
      const payloadGbp = {
        orderId: 'nc_test_gbp',
        amount: 50,
        currency: 'GBP',
      };

      await assert.rejects(
        async () => {
          await processWebhookPayload('neuracollect', 'PAYMENT_SUCCESS_WEBHOOK', payloadGbp);
        },
        {
          name: 'Error',
          message: /Non-INR currency 'GBP' rejected for NeuraCollect event/,
        }
      );
    });

    it('8. PhonePe: rejects non-INR currency (USD)', async () => {
      const payloadUsd = {
        code: 'PAYMENT_SUCCESS',
        data: {
          merchantTransactionId: 'txn_phonepe_usd',
          amount: 14900,
          currency: 'USD',
        },
      };

      await assert.rejects(
        async () => {
          await processWebhookPayload('phonepe', 'PAYMENT_SUCCESS', payloadUsd);
        },
        {
          name: 'Error',
          message: /Non-INR currency 'USD' rejected for PhonePe event/,
        }
      );
    });

    it('9. Stripe: rejects non-INR currency (USD)', async () => {
      const payloadUsd = {
        data: {
          object: {
            id: 'cs_test_usd',
            currency: 'usd',
            metadata: { tenantId: 't_1', planId: 'starter' },
          },
        },
      };

      await assert.rejects(
        async () => {
          await processWebhookPayload('stripe', 'checkout.session.completed', payloadUsd);
        },
        {
          name: 'Error',
          message: /Non-INR currency 'usd' rejected for Stripe event/,
        }
      );
    });
  });
});
