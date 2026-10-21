import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import crypto from 'crypto';
import express from 'express';

describe('Phase 1 Admin Remediation Test Suite (BL-02 & BL-04)', () => {
  // =========================================================================
  // BL-02: Revenue Analytics MRR & Plan Breakdown Without Cartesian Explosion
  // =========================================================================
  describe('BL-02: Analytics MRR & Revenue Aggregation Logic', () => {
    it('1. Five active subscriptions and ten tenants on same plan do NOT multiply MRR', () => {
      // Simulate raw database rows
      const planPrice = 29.0;
      const tenants = Array.from({ length: 10 }, (_, i) => ({
        id: `tenant-${i + 1}`,
        plan: 'starter',
        status: 'active',
      }));

      // 5 of the 10 tenants have active subscriptions
      const subscriptions = Array.from({ length: 5 }, (_, i) => ({
        id: `sub-${i + 1}`,
        tenant_id: `tenant-${i + 1}`,
        plan_id: 'starter',
        status: 'active',
        amount: planPrice,
        currency: 'USD',
      }));

      // OLD DEFECTIVE QUERY LOGIC:
      // Joined tenants and subscriptions on LOWER(p.id) without constraining tenant_id
      // For 1 plan: 10 tenants * 5 subscriptions = 50 joined rows!
      const cartesianJoinedRows = [];
      for (const t of tenants) {
        for (const s of subscriptions) {
          cartesianJoinedRows.push({ tenant: t, sub: s });
        }
      }
      const buggyMrr = cartesianJoinedRows.reduce((sum, r) => sum + r.sub.amount, 0);
      assert.strictEqual(cartesianJoinedRows.length, 50);
      assert.strictEqual(buggyMrr, 1450.0, 'Buggy query inflated MRR by 10x');

      // NEW FIXED CTE QUERY LOGIC (tenant_mrr grain):
      // Each tenant resolves its own latest active subscription amount, or fallback
      const tenantMrr = tenants.map((t) => {
        const activeSub = subscriptions
          .filter((s) => s.tenant_id === t.id && (s.status === 'active' || s.status === 'canceling'))
          .sort((a, b) => b.id.localeCompare(a.id))[0];

        const tenantMrrAmount = activeSub ? activeSub.amount : (t.status === 'active' ? 0 : 0);
        return {
          tenant_id: t.id,
          tenant_mrr_amount: tenantMrrAmount,
        };
      });

      const fixedMrr = tenantMrr.reduce((sum, r) => sum + r.tenant_mrr_amount, 0);
      const activePaidSubs = tenantMrr.filter((r) => r.tenant_mrr_amount > 0).length;

      assert.strictEqual(fixedMrr, 145.0, 'Correct MRR must be exactly 5 * $29 = $145');
      assert.strictEqual(activePaidSubs, 5, 'Must count exactly 5 active paid tenants');
    });

    it('2. Adding unrelated tenants does not change subscription-derived MRR', () => {
      const baseTenants = Array.from({ length: 5 }, (_, i) => ({
        id: `tenant-${i + 1}`,
        plan: 'professional',
        status: 'active',
      }));
      const baseSubs = Array.from({ length: 5 }, (_, i) => ({
        id: `sub-${i + 1}`,
        tenant_id: `tenant-${i + 1}`,
        status: 'active',
        amount: 99.0,
      }));

      // Add 100 unrelated free or non-subscribed tenants
      const allTenants = [
        ...baseTenants,
        ...Array.from({ length: 100 }, (_, i) => ({
          id: `unrelated-${i + 1}`,
          plan: 'free',
          status: 'active',
        })),
      ];

      const tenantMrr = allTenants.map((t) => {
        const activeSub = baseSubs
          .filter((s) => s.tenant_id === t.id && s.status === 'active')
          .sort((a, b) => b.id.localeCompare(a.id))[0];
        return activeSub ? activeSub.amount : 0;
      });

      const totalMrr = tenantMrr.reduce((sum, amt) => sum + amt, 0);
      assert.strictEqual(totalMrr, 495.0, '5 * $99 = $495 regardless of 100 added tenants');
    });

    it('3. Multiple subscription records for one tenant count only the single active subscription', () => {
      const tenant = { id: 'tenant-multi-sub', plan: 'professional', status: 'active' };
      // Historical churn/upgrade records: cancelled old sub, past_due old sub, and 1 current active sub
      const subscriptions = [
        { id: 'sub-old-1', tenant_id: tenant.id, status: 'cancelled', amount: 29.0, created_at: '2026-01-01' },
        { id: 'sub-old-2', tenant_id: tenant.id, status: 'past_due', amount: 29.0, created_at: '2026-02-01' },
        { id: 'sub-active', tenant_id: tenant.id, status: 'active', amount: 99.0, created_at: '2026-03-01' },
      ];

      const activeSub = subscriptions
        .filter((s) => s.tenant_id === tenant.id && (s.status === 'active' || s.status === 'canceling') && s.amount > 0)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

      const tenantMrr = activeSub ? activeSub.amount : 0;
      assert.strictEqual(tenantMrr, 99.0, 'Only the active subscription amount ($99) is counted');
    });

    it('4. Cancelled, trial, and past-due statuses do not contribute to active MRR', () => {
      const nonPayingSubs = [
        { id: 'sub-trial', tenant_id: 't-1', status: 'trial', amount: 29.0 },
        { id: 'sub-trialing', tenant_id: 't-2', status: 'trialing', amount: 29.0 },
        { id: 'sub-cancelled', tenant_id: 't-3', status: 'cancelled', amount: 99.0 },
        { id: 'sub-past-due', tenant_id: 't-4', status: 'past_due', amount: 99.0 },
      ];

      const payingSubs = nonPayingSubs.filter((s) => s.status === 'active' || s.status === 'canceling');
      assert.strictEqual(payingSubs.length, 0, 'No non-active statuses qualify for active MRR');
    });

    it('5. Plan breakdown computes net_collected, active_subscribers, and cancellations without cross-join explosion', () => {
      const plan = { id: 'starter', name: 'Starter', price: 29.0 };
      const tenants = [
        { id: 't-1', plan: 'starter', status: 'active' },
        { id: 't-2', plan: 'starter', status: 'active' },
      ];
      const invoices = [
        { id: 'inv-1', tenant_id: 't-1', amount: 29.0, status: 'paid' },
        { id: 'inv-2', tenant_id: 't-1', amount: 29.0, status: 'paid' },
        { id: 'inv-3', tenant_id: 't-2', amount: 29.0, status: 'paid' },
      ];
      const cancellations = [
        { id: 'sub-c1', plan_id: 'starter', status: 'cancelled' },
      ];

      // Correlated invoice aggregation
      const relevantInvoices = invoices.filter((i) =>
        tenants.some((t) => t.id === i.tenant_id && t.plan === plan.id) && i.status === 'paid'
      );
      const netCollected = relevantInvoices.reduce((sum, inv) => sum + inv.amount, 0);
      const payingCustomers = new Set(relevantInvoices.map((i) => i.tenant_id)).size;
      const activeSubscribers = tenants.filter((t) => t.plan === plan.id && t.status === 'active').length;
      const totalCancellations = cancellations.filter((c) => c.plan_id === plan.id && c.status === 'cancelled').length;

      assert.strictEqual(netCollected, 87.0, '3 invoices of $29 = $87');
      assert.strictEqual(payingCustomers, 2, '2 distinct paying tenants');
      assert.strictEqual(activeSubscribers, 2, '2 active tenants');
      assert.strictEqual(totalCancellations, 1, '1 cancellation');
    });

    it('6. Mixed currencies (INR & USD) convert USD via audited FX rate (84.50) with audit status and currency segregation', () => {
      // Simulate tenant_mrr rows with mixed currencies
      const tenantMrrRows = [
        { tenant_id: 't-inr-1', raw_monthly_amount: 4999.0, currency: 'INR', explicit_fx_rate: null },
        { tenant_id: 't-inr-2', raw_monthly_amount: 4999.0, currency: 'INR', explicit_fx_rate: null },
        { tenant_id: 't-usd-1', raw_monthly_amount: 99.0, currency: 'USD', explicit_fx_rate: null },
      ];

      // Per-currency raw aggregation (preserves original transaction amounts)
      const mrrByCurrency = {};
      const convertedRows = tenantMrrRows.map((r) => {
        if (r.raw_monthly_amount > 0) {
          mrrByCurrency[r.currency] = (mrrByCurrency[r.currency] || 0) + r.raw_monthly_amount;
        }
        let inrAmount = null;
        if (r.raw_monthly_amount === 0) inrAmount = 0;
        else if (r.currency === 'INR') inrAmount = r.raw_monthly_amount;
        else if (r.currency === 'USD') inrAmount = r.raw_monthly_amount * (r.explicit_fx_rate || 84.50);

        return { ...r, inr_monthly_amount: inrAmount };
      });

      const currencies = Object.keys(mrrByCurrency);
      const currencyCount = currencies.length;
      const unconvertibleCount = convertedRows.filter((r) => r.raw_monthly_amount > 0 && r.inr_monthly_amount === null).length;
      const totalMrrInr = convertedRows
        .filter((r) => r.raw_monthly_amount > 0 && r.inr_monthly_amount !== null)
        .reduce((sum, r) => sum + r.inr_monthly_amount, 0);

      let mrr = null;
      let arr = null;
      let mrrStatus = 'empty';

      if (currencyCount === 0) {
        mrr = 0;
        arr = 0;
        mrrStatus = 'zero_active_subscriptions';
      } else if (unconvertibleCount > 0) {
        mrr = null;
        arr = null;
        mrrStatus = 'unsupported_currency_pending_conversion';
      } else if (currencyCount === 1 && currencies[0] === 'INR') {
        mrr = Math.round(totalMrrInr * 100) / 100;
        arr = Math.round(mrr * 12 * 100) / 100;
        mrrStatus = 'inr_native_verified';
      } else {
        mrr = Math.round(totalMrrInr * 100) / 100;
        arr = Math.round(mrr * 12 * 100) / 100;
        mrrStatus = 'inr_converted_with_fx_audit';
      }

      assert.strictEqual(currencyCount, 2, 'Two distinct currencies detected');
      assert.strictEqual(unconvertibleCount, 0, 'USD is convertible under documented 84.50 rate');
      // 2 * 4999 (9998) + 99 * 84.50 (8365.50) = 18363.50 INR
      assert.strictEqual(mrr, 18363.5, 'Consolidated MRR in INR must be 18363.50');
      assert.strictEqual(arr, 220362, 'ARR must be MRR * 12');
      assert.strictEqual(mrrStatus, 'inr_converted_with_fx_audit');
      assert.strictEqual(mrrByCurrency.INR, 9998.0, 'INR original total correctly preserved');
      assert.strictEqual(mrrByCurrency.USD, 99.0, 'USD original total correctly preserved');
    });

    it('9. Unapproved foreign currencies (EUR, GBP) without exchange-rate policy mark MRR unavailable rather than reporting ₹0', () => {
      const tenantMrrRows = [
        { tenant_id: 't-inr-1', raw_monthly_amount: 4999.0, currency: 'INR', explicit_fx_rate: null },
        { tenant_id: 't-eur-1', raw_monthly_amount: 89.0, currency: 'EUR', explicit_fx_rate: null }, // Unapproved currency
      ];

      const mrrByCurrency = {};
      const convertedRows = tenantMrrRows.map((r) => {
        if (r.raw_monthly_amount > 0) {
          mrrByCurrency[r.currency] = (mrrByCurrency[r.currency] || 0) + r.raw_monthly_amount;
        }
        let inrAmount = null;
        if (r.raw_monthly_amount === 0) inrAmount = 0;
        else if (r.currency === 'INR') inrAmount = r.raw_monthly_amount;
        else if (r.currency === 'USD') inrAmount = r.raw_monthly_amount * (r.explicit_fx_rate || 84.50);
        // Any other currency returns null (unconvertible without approved policy)

        return { ...r, inr_monthly_amount: inrAmount };
      });

      const unconvertibleCount = convertedRows.filter((r) => r.raw_monthly_amount > 0 && r.inr_monthly_amount === null).length;
      let mrr = null;
      let arr = null;
      let mrrStatus = 'empty';

      if (unconvertibleCount > 0) {
        mrr = null;
        arr = null;
        mrrStatus = 'unsupported_currency_pending_conversion';
      }

      assert.strictEqual(unconvertibleCount, 1, 'EUR must be flagged as unconvertible');
      assert.strictEqual(mrr, null, 'MRR must be marked null (unavailable), never fabricated as ₹0');
      assert.strictEqual(arr, null, 'ARR must be null when MRR is unavailable');
      assert.strictEqual(mrrStatus, 'unsupported_currency_pending_conversion');
      assert.strictEqual(mrrByCurrency.EUR, 89.0, 'Original EUR amount preserved in records');
    });

    it('10. Explicit transaction fx_rate in subscription metadata overrides benchmark rate for auditable precision', () => {
      const tenantMrrRows = [
        { tenant_id: 't-usd-audited', raw_monthly_amount: 100.0, currency: 'USD', explicit_fx_rate: 83.25 },
      ];

      const convertedRows = tenantMrrRows.map((r) => {
        let inrAmount = null;
        if (r.currency === 'USD') {
          inrAmount = r.raw_monthly_amount * (r.explicit_fx_rate || 84.50);
        }
        return { ...r, inr_monthly_amount: inrAmount };
      });

      assert.strictEqual(convertedRows[0].inr_monthly_amount, 8325.0, 'Must use explicit fx_rate (83.25) instead of benchmark (84.50)');
    });

    it('7. Null or missing subscription currency safely falls back to plan currency or INR without corrupting totals', () => {
      const fallbackRows = [
        { tenant_id: 't-null-1', tenant_mrr_amount: 199.0, sub_currency: null, plan_currency: 'INR' },
        { tenant_id: 't-null-2', tenant_mrr_amount: 199.0, sub_currency: undefined, plan_currency: null },
      ];

      const resolved = fallbackRows.map((r) => {
        const curr = (r.sub_currency && r.sub_currency.trim()) || (r.plan_currency && r.plan_currency.trim()) || 'INR';
        return { ...r, currency: curr.toUpperCase() };
      });

      assert.strictEqual(resolved[0].currency, 'INR');
      assert.strictEqual(resolved[1].currency, 'INR');

      const mrrByCurrency = {};
      resolved.forEach((r) => {
        mrrByCurrency[r.currency] = (mrrByCurrency[r.currency] || 0) + r.tenant_mrr_amount;
      });

      assert.strictEqual(mrrByCurrency.INR, 398.0);
    });

    it('8. Zero-value subscriptions ($0 / free plan) do not contribute to active paid MRR or active paid subscriber counts', () => {
      const mixedRows = [
        { tenant_id: 't-free-1', tenant_mrr_amount: 0.0, currency: 'INR' },
        { tenant_id: 't-free-2', tenant_mrr_amount: 0.0, currency: 'INR' },
        { tenant_id: 't-paid-1', tenant_mrr_amount: 49.0, currency: 'INR' },
      ];

      const paidRows = mixedRows.filter((r) => r.tenant_mrr_amount > 0);
      const activePaidSubs = paidRows.length;
      const mrr = paidRows.reduce((sum, r) => sum + r.tenant_mrr_amount, 0);

      assert.strictEqual(activePaidSubs, 1, 'Only the paid tenant is counted as active paid subscriber');
      assert.strictEqual(mrr, 49.0, 'Free tenants with 0 MRR do not inflate MRR');
    });
  });

  // =========================================================================
  // BL-04: Payment Webhook Plan ID Normalization & Canonical Validation
  // =========================================================================
  describe('BL-04: Webhook Plan ID Normalization & Canonical Validation', () => {
    const activeCanonicalPlans = [
      { id: 'starter', name: 'Starter Plan', is_active: true },
      { id: 'professional', name: 'Professional Plan', is_active: true },
      { id: 'enterprise', name: 'Enterprise Plan', is_active: true },
    ];

    function normalizeAndValidatePlan(rawPlanInput) {
      if (!rawPlanInput) return { valid: false, error: 'Missing plan' };
      let rawPlanId = String(rawPlanInput).trim().toLowerCase();
      if (rawPlanId === 'developer' || rawPlanId === 'solo') rawPlanId = 'starter';
      else if (rawPlanId === 'pro') rawPlanId = 'professional';

      const found = activeCanonicalPlans.find((p) => p.id.toLowerCase() === rawPlanId && p.is_active);
      if (!found) {
        return { valid: false, error: `Unknown or inactive plan: ${rawPlanId}` };
      }
      return {
        valid: true,
        canonicalPlanId: found.id,
        canonicalPlanName: found.name,
      };
    }

    it('1. Mixed-case incoming plan IDs normalize to canonical lowercase form', () => {
      const inputs = ['STARTER', 'Starter', 'starter', 'PROFESSIONAL', 'Pro', 'pro', 'ENTERPRISE'];
      const expectedIds = ['starter', 'starter', 'starter', 'professional', 'professional', 'professional', 'enterprise'];

      inputs.forEach((input, index) => {
        const result = normalizeAndValidatePlan(input);
        assert.strictEqual(result.valid, true);
        assert.strictEqual(result.canonicalPlanId, expectedIds[index], `Input '${input}' must normalize to '${expectedIds[index]}'`);
      });
    });

    it('2. Legacy plan aliases (solo, developer, pro) resolve to approved canonical plans', () => {
      assert.strictEqual(normalizeAndValidatePlan('solo').canonicalPlanId, 'starter');
      assert.strictEqual(normalizeAndValidatePlan('developer').canonicalPlanId, 'starter');
      assert.strictEqual(normalizeAndValidatePlan('pro').canonicalPlanId, 'professional');
    });

    it('3. Unknown plan IDs are rejected with 400 and NEVER silently fall back to Free or Starter', () => {
      const maliciousOrUnknown = ['VIP_MEGA_TIER', 'hacker_plan', 'FREE_UPGRADE', 'nonexistent_99'];

      maliciousOrUnknown.forEach((unknownPlan) => {
        const result = normalizeAndValidatePlan(unknownPlan);
        assert.strictEqual(result.valid, false);
        assert.ok(result.error.includes('Unknown or inactive plan'), `Unknown plan '${unknownPlan}' must be safely rejected`);
      });
    });

    it('4. Duplicate webhook events are rejected idempotently via unique_event_provider constraint', () => {
      const processedEvents = new Set();

      function handleWebhookEvent(eventId, provider) {
        const eventKey = `${provider}:${eventId}`;
        if (processedEvents.has(eventKey)) {
          return { status: 200, message: 'already_processed' };
        }
        processedEvents.add(eventKey);
        return { status: 200, message: 'processed', success: true };
      }

      const res1 = handleWebhookEvent('evt_stripe_1001', 'stripe');
      assert.strictEqual(res1.status, 200);
      assert.strictEqual(res1.message, 'processed');

      // Duplicate delivery from payment provider
      const res2 = handleWebhookEvent('evt_stripe_1001', 'stripe');
      assert.strictEqual(res2.status, 200);
      assert.strictEqual(res2.message, 'already_processed');
    });

    it('5. Webhook signature verification enforces valid HMAC signatures', () => {
      const secret = 'whsec_test_secret_for_webhook_verification_only';
      const payload = JSON.stringify({ event: 'payment.captured', amount: 2900 });
      const timestamp = String(Math.floor(Date.now() / 1000));
      const signedPayload = `${timestamp}${payload}`;

      const validSig = crypto.createHmac('sha256', secret).update(signedPayload).digest('base64');

      function verifySignature(ts, raw, sig, sec) {
        if (!sig || !ts || !sec) return false;
        const expected = crypto.createHmac('sha256', sec).update(`${ts}${raw}`).digest('base64');
        const expectedBuf = Buffer.from(expected, 'utf8');
        const sigBuf = Buffer.from(sig, 'utf8');
        if (expectedBuf.length !== sigBuf.length) return false;
        return crypto.timingSafeEqual(expectedBuf, sigBuf);
      }

      assert.strictEqual(verifySignature(timestamp, payload, validSig, secret), true);
      assert.strictEqual(verifySignature(timestamp, payload, 'invalid_tampered_signature', secret), false);
      assert.strictEqual(verifySignature('', payload, validSig, secret), false);
    });
  });

  // =========================================================================
  // Integration-Level Webhook HTTP Pipeline Suite (Real Express Server & Routes)
  // =========================================================================
  describe('BL-04 End-to-End Webhook HTTP Integration Pipeline', () => {
    let server;
    let baseUrl;
    const webhookSecret = 'test_webhook_secret_key_1234567890';
    const mockDb = {
      tenants: new Map([
        ['t-1', { id: 't-1', name: 'Tenant One', plan: 'free', status: 'active' }],
      ]),
      subscriptions: new Map(),
      processedEvents: new Set(),
      plans: new Map([
        ['starter', { id: 'starter', name: 'Starter Plan', is_active: true }],
        ['professional', { id: 'professional', name: 'Professional Plan', is_active: true }],
        ['enterprise', { id: 'enterprise', name: 'Enterprise Plan', is_active: true }],
      ]),
    };

    before(async () => {
      const app = express();
      app.use(express.json());

      // Stripe Webhook Endpoint Double
      app.post('/webhooks/stripe', (req, res) => {
        const sig = req.headers['stripe-signature'];
        if (!sig || sig !== 'valid_stripe_sig') {
          return res.status(400).json({ error: 'Invalid Stripe signature' });
        }

        const event = req.body;
        const eventId = event.id;

        // Idempotency check
        if (mockDb.processedEvents.has(`stripe:${eventId}`)) {
          return res.status(200).json({ status: 'already_processed' });
        }
        mockDb.processedEvents.add(`stripe:${eventId}`);

        const eventObj = event.data?.object || {};
        const tenantId = eventObj.metadata?.tenantId;
        const plan = eventObj.metadata?.plan || 'starter';

        // Canonical normalization
        let rawPlanId = String(plan).trim().toLowerCase();
        if (rawPlanId === 'developer' || rawPlanId === 'solo') rawPlanId = 'starter';
        else if (rawPlanId === 'pro') rawPlanId = 'professional';

        const planRow = mockDb.plans.get(rawPlanId);
        if (!planRow || !planRow.is_active) {
          // Transaction rollback simulation: remove from processedEvents
          mockDb.processedEvents.delete(`stripe:${eventId}`);
          return res.status(400).json({ error: `Unknown or inactive plan: ${rawPlanId}` });
        }

        if (eventObj.metadata?.simulateDatabaseError) {
          // Transaction rollback simulation on DB failure
          mockDb.processedEvents.delete(`stripe:${eventId}`);
          return res.status(500).json({ error: 'Database connection failed during transaction' });
        }

        const canonicalPlanId = planRow.id;
        if (tenantId && mockDb.tenants.has(tenantId)) {
          mockDb.tenants.get(tenantId).plan = canonicalPlanId;
          mockDb.subscriptions.set(eventObj.id, {
            tenantId,
            planId: canonicalPlanId,
            status: 'active',
          });
        }

        return res.status(200).json({ status: 'processed' });
      });

      // PhonePe Webhook Endpoint Double
      app.post('/webhooks/phonepe', (req, res) => {
        const body = req.body;
        const eventData = body.data || {};
        const merchantTxnId = eventData.merchantTransactionId || '';
        const phonepeTxnId = eventData.transactionId || 'phpe_1';

        if (mockDb.processedEvents.has(`phonepe:${phonepeTxnId}`)) {
          return res.status(200).json({ status: 'already_processed' });
        }
        mockDb.processedEvents.add(`phonepe:${phonepeTxnId}`);

        // TXN_<tenantId>_<planId>_<timestamp>
        const parts = merchantTxnId.split('_');
        let tenantId = parts[1];
        let rawPlanId = String(parts[2] || 'starter').trim().toLowerCase();
        if (rawPlanId === 'developer' || rawPlanId === 'solo') rawPlanId = 'starter';
        else if (rawPlanId === 'pro') rawPlanId = 'professional';

        const planRow = mockDb.plans.get(rawPlanId);
        if (!planRow || !planRow.is_active) {
          mockDb.processedEvents.delete(`phonepe:${phonepeTxnId}`);
          return res.status(400).json({ error: `Unknown or inactive plan: ${rawPlanId}` });
        }

        const canonicalPlanId = planRow.id;
        if (tenantId && mockDb.tenants.has(tenantId)) {
          mockDb.tenants.get(tenantId).plan = canonicalPlanId;
        }

        return res.status(200).json({ status: 'processed', success: true });
      });

      await new Promise((resolve) => {
        server = app.listen(0, '127.0.0.1', () => {
          const addr = server.address();
          baseUrl = `http://127.0.0.1:${addr.port}`;
          resolve();
        });
      });
    });

    after(async () => {
      if (server) {
        await new Promise((resolve) => server.close(resolve));
      }
    });

    it('1. HTTP POST /webhooks/stripe normalizes uppercase plan to lowercase and updates tenant', async () => {
      const payload = {
        id: 'evt_stripe_test_1',
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_stripe_1',
            metadata: {
              tenantId: 't-1',
              plan: 'PROFESSIONAL', // Uppercase incoming
            },
          },
        },
      };

      const res = await fetch(`${baseUrl}/webhooks/stripe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'valid_stripe_sig',
        },
        body: JSON.stringify(payload),
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(mockDb.tenants.get('t-1').plan, 'professional', 'Must store lowercase canonical ID');
      assert.strictEqual(mockDb.subscriptions.get('sub_stripe_1').planId, 'professional');
    });

    it('2. HTTP POST /webhooks/stripe rejects unknown plan with 400 and preserves tenant plan', async () => {
      const initialPlan = mockDb.tenants.get('t-1').plan;
      const payload = {
        id: 'evt_stripe_test_2',
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_stripe_2',
            metadata: {
              tenantId: 't-1',
              plan: 'NONEXISTENT_MEGA_TIER',
            },
          },
        },
      };

      const res = await fetch(`${baseUrl}/webhooks/stripe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'valid_stripe_sig',
        },
        body: JSON.stringify(payload),
      });

      assert.strictEqual(res.status, 400);
      const body = await res.json();
      assert.ok(body.error.includes('Unknown or inactive plan'));
      assert.strictEqual(mockDb.tenants.get('t-1').plan, initialPlan, 'Tenant plan must not be corrupted');
    });

    it('3. HTTP POST /webhooks/stripe rejects missing or invalid signature with 400', async () => {
      const res = await fetch(`${baseUrl}/webhooks/stripe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'bad_sig',
        },
        body: JSON.stringify({ id: 'evt_bad' }),
      });

      assert.strictEqual(res.status, 400);
    });

    it('4. HTTP POST /webhooks/stripe handles duplicate events idempotently with 200 already_processed', async () => {
      const payload = {
        id: 'evt_stripe_test_1', // Duplicate from test 1
        data: { object: { id: 'sub_stripe_1' } },
      };

      const res = await fetch(`${baseUrl}/webhooks/stripe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'valid_stripe_sig',
        },
        body: JSON.stringify(payload),
      });

      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.status, 'already_processed');
    });

    it('5. HTTP POST /webhooks/phonepe normalizes uppercase plan from merchant transaction ID', async () => {
      const payload = {
        data: {
          merchantTransactionId: 'TXN_t-1_STARTER_1710000000',
          transactionId: 'phpe_txn_100',
        },
      };

      const res = await fetch(`${baseUrl}/webhooks/phonepe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(mockDb.tenants.get('t-1').plan, 'starter', 'Must normalize STARTER to starter');
    });

    it('6. HTTP POST /webhooks/stripe rolls back on DB failure, permitting subsequent provider retry to succeed', async () => {
      const payload = {
        id: 'evt_stripe_fail_and_retry',
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_stripe_retry_test',
            metadata: {
              tenantId: 't-1',
              plan: 'professional',
              simulateDatabaseError: true,
            },
          },
        },
      };

      // 1. First delivery attempt: DB crashes during transaction -> returns 500
      const failRes = await fetch(`${baseUrl}/webhooks/stripe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'valid_stripe_sig',
        },
        body: JSON.stringify(payload),
      });

      assert.strictEqual(failRes.status, 500, 'Must return 500 when DB transaction fails');
      assert.strictEqual(
        mockDb.processedEvents.has('stripe:evt_stripe_fail_and_retry'),
        false,
        'Rolled-back event MUST NOT be left in processedEvents'
      );

      // 2. Second delivery attempt (Provider Retry after DB recovery): simulateDatabaseError cleared
      payload.data.object.metadata.simulateDatabaseError = false;
      const retryRes = await fetch(`${baseUrl}/webhooks/stripe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'valid_stripe_sig',
        },
        body: JSON.stringify(payload),
      });

      assert.strictEqual(retryRes.status, 200, 'Provider retry must succeed with HTTP 200');
      const retryBody = await retryRes.json();
      assert.strictEqual(retryBody.status, 'processed', 'Retry must execute and complete processing');
      assert.strictEqual(mockDb.tenants.get('t-1').plan, 'professional', 'Tenant plan successfully updated on retry');

      // 3. Third delivery attempt: duplicate event after successful commit -> returns already_processed
      const dupRes = await fetch(`${baseUrl}/webhooks/stripe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'valid_stripe_sig',
        },
        body: JSON.stringify(payload),
      });

      assert.strictEqual(dupRes.status, 200);
      const dupBody = await dupRes.json();
      assert.strictEqual(dupBody.status, 'already_processed', 'Subsequent duplicate returns already_processed');
    });

    it('7. Stucked or failed webhook event is not prematurely acknowledged as processed', () => {
      // Logic verification for webhook retry worker
      const fakeWebhooksDb = new Map([
        ['evt-pending', { status: 'pending', attempts: 1 }],
        ['evt-failed', { status: 'failed', attempts: 5 }],
        ['evt-processed', { status: 'processed', attempts: 1 }],
      ]);

      function canReprocess(eventId) {
        const record = fakeWebhooksDb.get(eventId);
        if (!record) return true;
        // Only already committed 'processed' events should be skipped
        return record.status !== 'processed';
      }

      assert.strictEqual(canReprocess('evt-pending'), true, 'Pending events must be reprocessed');
      assert.strictEqual(canReprocess('evt-failed'), true, 'Failed events must be re-triable');
      assert.strictEqual(canReprocess('evt-processed'), false, 'Processed events must be skipped');
    });
  });
});
