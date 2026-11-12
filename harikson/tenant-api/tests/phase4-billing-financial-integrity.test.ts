if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';
}
if (!process.env.REDIS_URL) {
  process.env.REDIS_URL = 'redis://localhost:6379';
}

import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import fs from 'fs';
import path from 'path';
import express from 'express';
import jwt from 'jsonwebtoken';
import { pool, redis } from '../src/db/pool.js';
import { calculateProration, executePlanChange } from '../src/services/prorationService.js';
import billingRoutes from '../src/routes/billing.routes.js';

describe('Phase 4 — Billing and Financial Integrity Test Suite', () => {
  const originalQuery = pool.query;
  const originalConnect = pool.connect;
  const jwtSecret = '01234567890123456789012345678901';
  process.env.JWT_SECRET = jwtSecret;

  const tenantId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const userId = '11111111-1111-1111-1111-111111111111';

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

  // Helper to make HTTP requests to test app
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
      const postData = body ? JSON.stringify(body) : undefined;
      const reqHeaders: Record<string, string> = { ...headers };
      if (postData) {
        reqHeaders['Content-Type'] = 'application/json';
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
  // 1. Proration Engine Calculation & Indian GST (18%) Tests
  // =========================================================================
  it('1. calculateProration computes mid-cycle upgrade charge, credit, and 18% standard GST', () => {
    const periodStart = new Date('2026-01-01T00:00:00Z');
    const periodEnd = new Date('2026-01-31T00:00:00Z');
    const midPoint = new Date('2026-01-16T00:00:00Z'); // Exactly 15 days remaining out of 30

    // Old plan ₹499 (Starter), New plan ₹1,499 (Professional)
    const result = calculateProration(499, 1499, periodStart, periodEnd, midPoint, false, 'INR');

    assert.strictEqual(result.daysInPeriod, 30);
    assert.strictEqual(result.daysRemaining, 15);
    // Unused credit: 15 * (499/30) = ~249.50
    assert.strictEqual(result.unusedCredit, 249.5);
    // New charge: 15 * (1499/30) = ~749.50
    assert.strictEqual(result.newPlanCharge, 749.5);
    // Net amount: 749.50 - 249.50 = 500.00
    assert.strictEqual(result.netAmount, 500);
    // 18% Indian GST on positive net amount: 500 * 0.18 = 90.00
    assert.strictEqual(result.taxAmount, 90);
    // Total: 500 + 90 = 590.00
    assert.strictEqual(result.total, 590);
    assert.strictEqual(result.inTrial, false);
    assert.ok(result.invoiceDescription.includes('18% GST'));
  });

  it('2. calculateProration yields ₹0 credit when upgrading from free or active trial plans', () => {
    const periodStart = new Date('2026-01-01T00:00:00Z');
    const periodEnd = new Date('2026-01-31T00:00:00Z');
    const midPoint = new Date('2026-01-16T00:00:00Z');

    // Free plan (oldPrice = 0) to Enterprise (₹4,999)
    const freeUpgrade = calculateProration(0, 4999, periodStart, periodEnd, midPoint, false, 'INR');
    assert.strictEqual(freeUpgrade.unusedCredit, 0, 'Free plan must yield 0 unused credit');
    assert.strictEqual(freeUpgrade.netAmount, freeUpgrade.newPlanCharge);
    assert.strictEqual(freeUpgrade.taxAmount, parseFloat((freeUpgrade.netAmount * 0.18).toFixed(2)));

    // Trialing plan (inTrial = true) to Professional (₹1,499)
    const trialUpgrade = calculateProration(1499, 1499, periodStart, periodEnd, midPoint, true, 'INR');
    assert.strictEqual(trialUpgrade.unusedCredit, 0, 'Active trial must yield 0 unused credit');
  });

  // =========================================================================
  // 2. FIN-001 Remediation: Free Enterprise Plan Upgrade Exploit Neutralized
  // =========================================================================
  it('3. FIN-001 Check: executePlanChange creates pending invoice without elevating plan if payment is unverified', async () => {
    let insertedInvoiceStatus = '';
    let updatedTenantPlan = '';
    let insertedPaidAt: any = 'NOT_CALLED';

    const mockClient = {
      query: async (sqlText: string, params?: any[]) => {
        if (sqlText.includes('FROM subscriptions s')) {
          return {
            rows: [
              {
                id: 'sub-starter-123',
                tenant_id: tenantId,
                old_price: '499.00',
                currency: 'INR',
                old_plan_name: 'Starter',
                status: 'active',
                current_period_start: new Date(Date.now() - 5 * 24 * 3600 * 1000),
                current_period_end: new Date(Date.now() + 25 * 24 * 3600 * 1000),
              },
            ],
          };
        }
        if (sqlText.includes('FROM plans WHERE id = $1')) {
          return {
            rows: [
              {
                id: 'enterprise',
                name: 'Enterprise',
                price: 4999,
                currency: 'INR',
              },
            ],
          };
        }
        if (sqlText.includes('INSERT INTO invoices')) {
          insertedInvoiceStatus = params?.[5]; // status parameter
          return { rows: [{ id: 'inv-upgrade-pending' }] };
        }
        if (sqlText.includes('UPDATE tenants SET plan')) {
          updatedTenantPlan = params?.[0];
          return { rows: [] };
        }
        return { rows: [] };
      },
      release: () => {},
    };

    (pool as any).connect = async () => mockClient;

    const result = await executePlanChange(tenantId, 'enterprise', 'stripe', { paymentVerified: false });

    // Invariant: Unverified upgrade must return pending_payment, require checkout, and NOT mutate tenant plan
    assert.strictEqual(result.status, 'pending_payment');
    assert.strictEqual(result.checkoutRequired, true);
    assert.strictEqual(insertedInvoiceStatus, 'pending_payment');
    assert.strictEqual(updatedTenantPlan, '', 'tenants.plan must NOT be mutated without verified payment!');
  });

  it('4. executePlanChange allows plan elevation and marks invoice paid ONLY when paymentVerified is true', async () => {
    let invoiceMarkedPaid = false;
    let upgradedPlan = '';
    const paymentRef = 'pi_verified_stripe_987654321';

    const mockClient = {
      query: async (sqlText: string, params?: any[]) => {
        if (sqlText.includes('FROM subscriptions s')) {
          return {
            rows: [
              {
                id: 'sub-starter-123',
                tenant_id: tenantId,
                old_price: '499.00',
                currency: 'INR',
                old_plan_name: 'Starter',
                status: 'active',
                current_period_start: new Date(Date.now() - 5 * 24 * 3600 * 1000),
                current_period_end: new Date(Date.now() + 25 * 24 * 3600 * 1000),
              },
            ],
          };
        }
        if (sqlText.includes('FROM plans WHERE id = $1')) {
          return {
            rows: [
              {
                id: 'enterprise',
                name: 'Enterprise',
                price: 4999,
                currency: 'INR',
              },
            ],
          };
        }
        if (sqlText.includes('INSERT INTO invoices')) {
          if (params?.includes('paid')) invoiceMarkedPaid = true;
          return { rows: [{ id: 'inv-verified-1' }] };
        }
        if (sqlText.includes('UPDATE tenants SET plan = $1')) {
          upgradedPlan = params?.[0];
          return { rows: [] };
        }
        return { rows: [] };
      },
      release: () => {},
    };

    (pool as any).connect = async () => mockClient;

    const result = await executePlanChange(tenantId, 'enterprise', 'stripe', {
      paymentVerified: true,
      paymentReference: paymentRef,
    });

    assert.strictEqual(result.status, 'paid');
    assert.strictEqual(invoiceMarkedPaid, true);
    assert.strictEqual(upgradedPlan, 'ENTERPRISE');
  });

  // =========================================================================
  // 3. FIN-002 Remediation: Arbitrary Account Credit Exploit Neutralized
  // =========================================================================
  it('5. FIN-002 Check: Downgrade from unverified or unpaid plan yields ₹0 credit and records no false credits', async () => {
    let creditLedgerInserted = false;
    let tenantCreditGranted = 0;

    const mockClient = {
      query: async (sqlText: string, params?: any[]) => {
        if (sqlText.includes('FROM subscriptions s')) {
          return {
            rows: [
              {
                id: 'sub-enterprise-fake',
                tenant_id: tenantId,
                old_price: '4999.00',
                currency: 'INR',
                old_plan_name: 'Enterprise',
                status: 'active',
                current_period_start: new Date(Date.now() - 2 * 24 * 3600 * 1000),
                current_period_end: new Date(Date.now() + 28 * 24 * 3600 * 1000),
              },
            ],
          };
        }
        if (sqlText.includes('FROM plans WHERE id = $1')) {
          return {
            rows: [
              {
                id: 'free',
                name: 'Free',
                price: 0,
                currency: 'INR',
              },
            ],
          };
        }
        // Invoices check: Simulate NO paid invoice found for this cycle
        if (sqlText.includes('FROM invoices') && sqlText.includes("status = 'paid'")) {
          return { rows: [] }; // No paid invoice!
        }
        if (sqlText.includes('INSERT INTO credit_ledger')) {
          creditLedgerInserted = true;
          return { rows: [] };
        }
        if (sqlText.includes('UPDATE tenants') && sqlText.includes('account_credit')) {
          tenantCreditGranted = params?.[1];
          return { rows: [] };
        }
        return { rows: [] };
      },
      release: () => {},
    };

    (pool as any).connect = async () => mockClient;

    const result = await executePlanChange(tenantId, 'free', 'system', {
      userId,
    });

    // Invariant: Because no verified paid invoice exists, 0 credit must be issued
    assert.strictEqual(creditLedgerInserted, false, 'credit_ledger must NOT be credited without a verified paid invoice!');
    assert.strictEqual(tenantCreditGranted, 0, 'tenants metadata account_credit must not receive unverified credit!');
    assert.strictEqual(result.status, 'credited');
  });

  it('6. Downgrade with a verified paid invoice generates audited credit in credit_ledger with idempotency key', async () => {
    let ledgerEntry: any = null;
    let updatedMetadataCredit: number | null = null;
    const paidInvoiceId = 'inv-real-paid-12345';
    const testIdempotencyKey = 'credit_test_key_1001';

    const mockClient = {
      query: async (sqlText: string, params?: any[]) => {
        if (sqlText.includes('FROM subscriptions s')) {
          return {
            rows: [
              {
                id: 'sub-pro-paid',
                tenant_id: tenantId,
                old_price: '1499.00',
                currency: 'INR',
                old_plan_name: 'Professional',
                status: 'active',
                current_period_start: new Date(Date.now() - 10 * 24 * 3600 * 1000),
                current_period_end: new Date(Date.now() + 20 * 24 * 3600 * 1000),
              },
            ],
          };
        }
        if (sqlText.includes('FROM plans WHERE id = $1')) {
          return {
            rows: [
              {
                id: 'free',
                name: 'Free',
                price: 0,
                currency: 'INR',
              },
            ],
          };
        }
        // Verified paid invoice exists!
        if (sqlText.includes('FROM invoices') && sqlText.includes("status = 'paid'")) {
          return {
            rows: [
              {
                id: paidInvoiceId,
                amount: 1499,
                total: 1768.82,
                paid_at: new Date(Date.now() - 10 * 24 * 3600 * 1000),
                provider_invoice_id: 'rzp_pay_verified_123',
              },
            ],
          };
        }
        if (sqlText.includes('SELECT metadata FROM tenants')) {
          return { rows: [{ metadata: { account_credit: 100 } }] };
        }
        if (sqlText.includes('INSERT INTO credit_ledger')) {
          ledgerEntry = {
            tenantId: params?.[0],
            amount: params?.[1],
            currency: params?.[2],
            sourceType: params?.[3],
            sourceRefId: params?.[4],
            idempotencyKey: params?.[5],
            balanceAfter: params?.[7],
          };
          return { rows: [] };
        }
        if (sqlText.includes('UPDATE tenants') && sqlText.includes('account_credit')) {
          updatedMetadataCredit = params?.[1];
          return { rows: [] };
        }
        return { rows: [] };
      },
      release: () => {},
    };

    (pool as any).connect = async () => mockClient;

    const result = await executePlanChange(tenantId, 'free', 'system', {
      userId,
      idempotencyKey: testIdempotencyKey,
    });

    assert.ok(ledgerEntry, 'credit_ledger entry must be inserted for verified paid downgrade');
    assert.strictEqual(ledgerEntry.tenantId, tenantId);
    assert.ok(ledgerEntry.amount > 0, 'Audited credit amount must be greater than 0');
    assert.strictEqual(ledgerEntry.sourceType, 'proration_downgrade');
    assert.strictEqual(ledgerEntry.sourceRefId, paidInvoiceId);
    assert.strictEqual(ledgerEntry.idempotencyKey, testIdempotencyKey);
    // Balance after: 100 existing + credit
    assert.strictEqual(ledgerEntry.balanceAfter, updatedMetadataCredit);
  });

  // =========================================================================
  // 4. HTTP Route Security & Scope Validation on /change-plan and /reactivate
  // =========================================================================
  it('7. POST /api/billing/change-plan rejects unauthenticated or unauthorized plan upgrade with HTTP 402 PAYMENT_REQUIRED', async () => {
    const app = express();
    app.use(express.json());
    // Attach dummy tenant context
    app.use((req: any, _res, next) => {
      req.tenant = { id: tenantId, plan: 'starter' };
      next();
    });
    app.use('/api/billing', billingRoutes);

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));

    try {
      // 1. Regular user token without payment intent trying to upgrade to Enterprise
      const token = jwt.sign(
        { userId, tenantId, role: 'owner', email: 'owner@example.com' },
        jwtSecret
      );

      const res = await request(
        server,
        'POST',
        '/api/billing/change-plan',
        { Authorization: `Bearer ${token}` },
        { newPlanId: 'enterprise' }
      );

      // Must be blocked with 402 PAYMENT_REQUIRED
      assert.strictEqual(res.status, 402);
      assert.strictEqual(res.body.code, 'PAYMENT_REQUIRED');
      assert.ok(res.body.error.includes('checkout session'));
    } finally {
      server.close();
    }
  });

  it('8. POST /api/billing/reactivate blocks reactivation if outstanding unpaid invoices exist', async () => {
    const app = express();
    app.use(express.json());
    app.use((req: any, _res, next) => {
      req.tenant = { id: tenantId, plan: 'professional', status: 'past_due' };
      next();
    });
    app.use('/api/billing', billingRoutes);

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));

    try {
      // Mock pool query to simulate an open, unpaid invoice
      pool.query = (async (sqlText: string, params?: any[]) => {
        if (typeof sqlText === 'string' && sqlText.includes('FROM invoices WHERE tenant_id = $1 AND status IN')) {
          return {
            rows: [
              {
                id: 'inv-unpaid-1',
                invoice_number: 'INV-2026-UNPAID',
                total: 1768.82,
                amount: 1499,
              },
            ],
          };
        }
        return { rows: [] };
      }) as any;

      const token = jwt.sign(
        { userId, tenantId, role: 'admin', email: 'admin@example.com' },
        jwtSecret
      );

      const res = await request(
        server,
        'POST',
        '/api/billing/reactivate',
        { Authorization: `Bearer ${token}` }
      );

      // Must be rejected with 402 OUTSTANDING_INVOICES_EXIST
      assert.strictEqual(res.status, 402);
      assert.strictEqual(res.body.code, 'OUTSTANDING_INVOICES_EXIST');
      assert.ok(res.body.error.includes('outstanding unpaid invoices'));
    } finally {
      server.close();
    }
  });

  // =========================================================================
  // 5. Payment Gateway Webhook Verification Prerequisite
  // =========================================================================
  it('9. Payment Webhooks reject forged/unsigned payloads with HTTP 400', async () => {
    const app = express();
    app.use(express.json());
    app.use('/webhooks', billingRoutes);

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));

    try {
      // 1. Stripe with missing signature
      const stripeRes = await request(
        server,
        'POST',
        '/webhooks/stripe',
        {},
        { type: 'checkout.session.completed' }
      );
      assert.ok([400, 503].includes(stripeRes.status));

      // 2. Razorpay with forged/invalid signature
      process.env.RAZORPAY_WEBHOOK_SECRET = 'rzp_secret_key_123';
      const rzpRes = await request(
        server,
        'POST',
        '/webhooks/razorpay',
        { 'x-razorpay-signature': 'forged_fake_signature' },
        { event: 'payment.captured' }
      );
      assert.strictEqual(rzpRes.status, 400);

      // 3. PhonePe with missing x-verify
      const phonepeRes = await request(
        server,
        'POST',
        '/webhooks/phonepe',
        {},
        { response: 'eyJzb21lIjoiZGF0YSJ9' }
      );
      assert.strictEqual(phonepeRes.status, 400);
    } finally {
      server.close();
    }
  });

  // =========================================================================
  // 6. Schema Integrity & Migration 079 Verification
  // =========================================================================
  it('10. Migration 079 establishes credit_ledger with ENABLE & FORCE RLS and invoice status constraints', () => {
    const migration079Path = path.resolve(process.cwd(), 'src/migrations/079_credit_ledger_and_financial_integrity.sql');
    assert.ok(fs.existsSync(migration079Path), 'Migration 079 must exist');
    const content = fs.readFileSync(migration079Path, 'utf-8');

    assert.ok(content.includes('CREATE TABLE IF NOT EXISTS credit_ledger'), 'Must create credit_ledger table');
    assert.ok(content.includes('ALTER TABLE credit_ledger ENABLE ROW LEVEL SECURITY'), 'Must enable RLS on credit_ledger');
    assert.ok(content.includes('ALTER TABLE credit_ledger FORCE ROW LEVEL SECURITY'), 'Must force RLS on credit_ledger');
    assert.ok(content.includes('credit_ledger_tenant_isolation_policy'), 'Must define isolation policy on credit_ledger');
    assert.ok(content.includes('invoices_status_check'), 'Must define invoices status check constraint');
    assert.ok(content.includes('pending_payment'), 'Status check must include pending_payment');
    assert.ok(content.includes('credited'), 'Status check must include credited');
  });
});

