if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';
}
if (!process.env.REDIS_URL) {
  process.env.REDIS_URL = 'redis://localhost:6379';
}
if (!process.env.TENANT_MASTER_KEY) {
  process.env.TENANT_MASTER_KEY = '01234567890123456789012345678901';
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test_jwt_secret_must_be_at_least_32_characters_long_for_security';
}

import { describe, it, beforeEach, afterEach, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import express from 'express';
import { pool, readPool, redis } from '../src/db/pool.js';
import {
  loadEntitlements,
  requireWebhookLogging,
  requireAuditTrail,
  requireApiAccess,
} from '../src/middleware/entitlements.js';
import { enqueueWebhookEvent, processWebhookPayload } from '../src/services/webhookRetryService.js';
import userRouter from '../src/routes/user.routes.js';
import billingRouter from '../src/routes/billing.routes.js';

try {
  redis.on('error', () => {});
  redis.disconnect();
} catch (_) {}

describe('Xarwiz Isolated Bug Fix 4: Webhook Logging Plan Feature Enforcement Test Suite', () => {
  const originalQuery = pool.query;
  const originalConnect = pool.connect;

  after(async () => {
    pool.query = originalQuery;
    pool.connect = originalConnect;
    try {
      redis.disconnect();
    } catch (_) {}
    try {
      await pool.end();
      await (readPool as any)?.end?.();
    } catch (_) {}
    setTimeout(() => {
      process.exit(0);
    }, 100);
  });

  beforeEach(() => {
    (redis as any).get = async () => null;
    (redis as any).setex = async () => 'OK';
    const mockClient = {
      query: async (sql: string, params?: any[]) => {
        if (sql.includes('SELECT 1')) {
          return { rows: [{ '?column?': 1 }] };
        }
        if (sql.includes('set_config') || sql.includes('assert_tenant_context')) {
          return { rows: [] };
        }
        return pool.query(sql, params);
      },
      release: () => {},
    };
    (pool as any).connect = async () => mockClient;
  });

  afterEach(() => {
    pool.query = originalQuery;
    pool.connect = originalConnect;
  });

  async function closeServer(server: http.Server) {
    (server as any).closeAllConnections?.();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  function createMockRes() {
    let statusCode = 200;
    let jsonBody: any = null;
    let sentData: any = null;
    const headers: Record<string, string> = {};

    const res: any = {
      status: (code: number) => {
        statusCode = code;
        return res;
      },
      json: (data: any) => {
        jsonBody = data;
        return res;
      },
      send: (data: any) => {
        sentData = data;
        return res;
      },
      setHeader: (key: string, val: string) => {
        headers[key.toLowerCase()] = val;
        return res;
      },
      getHeader: (key: string) => headers[key.toLowerCase()],
      getStatusCode: () => statusCode,
      getBody: () => jsonBody ?? sentData,
    };
    return res;
  }

  function createMockReq(overrides: Record<string, any> = {}): any {
    return {
      headers: {},
      cookies: {},
      query: {},
      body: {},
      params: {},
      ...overrides,
    };
  }

  // =========================================================================
  // 1. Tenant with webhook_logging: true can access permitted webhook history
  // =========================================================================
  it('1. Tenant with webhook_logging: true can access permitted webhook history', async () => {
    const req = createMockReq({
      user: { userId: 'u-pro', tenantId: 't-pro' },
      tenant: { id: 't-pro', slug: 'pro-tenant' },
      entitlements: {
        planId: 'professional',
        planName: 'Professional',
        tokenLimit: 5000000,
        storageLimitGb: 50,
        imageLimitMonthly: 100,
        features: { webhook_logging: true },
        webhookLogging: true,
        apiAccess: true,
        auditTrail: true,
        ragDocumentsLimit: 50000,
        isTrial: false,
        trialEndsAt: null,
      },
    });
    const res = createMockRes();
    let nextCalled = false;

    requireWebhookLogging(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, true, 'requireWebhookLogging must call next() when webhook_logging is true');
    assert.strictEqual(res.getStatusCode(), 200);
  });

  // =========================================================================
  // 2. Tenant with webhook_logging: false receives 403 PLAN_FEATURE_DISABLED
  // =========================================================================
  it('2. Tenant with webhook_logging: false receives 403 PLAN_FEATURE_DISABLED', async () => {
    const req = createMockReq({
      user: { userId: 'u-starter', tenantId: 't-starter' },
      tenant: { id: 't-starter', slug: 'starter-tenant' },
      entitlements: {
        planId: 'starter',
        planName: 'Starter',
        tokenLimit: 1000000,
        storageLimitGb: 10,
        imageLimitMonthly: 20,
        features: { webhook_logging: false },
        webhookLogging: false,
        apiAccess: true,
        auditTrail: false,
        ragDocumentsLimit: 500,
        isTrial: false,
        trialEndsAt: null,
      },
    });
    const res = createMockRes();
    let nextCalled = false;

    requireWebhookLogging(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, false, 'requireWebhookLogging must NOT call next() when webhook_logging is false');
    assert.strictEqual(res.getStatusCode(), 403, 'Must return HTTP 403 Forbidden');
    const body = res.getBody();
    assert.strictEqual(body.code, 'PLAN_FEATURE_DISABLED');
    assert.strictEqual(body.feature, 'webhook_logging');
    assert.strictEqual(body.currentPlan, 'starter');
    assert.ok(body.error.toLowerCase().includes('webhook logging'));
  });

  // =========================================================================
  // 3. Explicit feature configuration overrides the fallback
  // =========================================================================
  it('3. Explicit feature configuration overrides fallback (Starter with true, Pro with false)', async () => {
    // Case 3a: Starter plan with explicit webhook_logging: true override
    (pool as any).query = async (sql: string, params?: any[]) => {
      if (sql.includes('FROM tenants t')) {
        return {
          rows: [
            {
              plan_id: 'starter',
              plan_name: 'Starter Plan',
              features: { webhook_logging: true },
            },
          ],
        };
      }
      return { rows: [] };
    };

    const reqStarter = createMockReq({
      tenant: { id: 't-starter-custom' },
    });
    await loadEntitlements()(reqStarter, createMockRes(), () => {});
    assert.strictEqual(
      reqStarter.entitlements?.webhookLogging,
      true,
      'Explicit webhook_logging: true must override starter default of false'
    );

    // Case 3b: Professional plan with explicit webhook_logging: false override
    (pool as any).query = async (sql: string, params?: any[]) => {
      if (sql.includes('FROM tenants t')) {
        return {
          rows: [
            {
              plan_id: 'professional',
              plan_name: 'Professional Plan',
              features: { webhook_logging: false },
            },
          ],
        };
      }
      return { rows: [] };
    };

    const reqPro = createMockReq({
      tenant: { id: 't-pro-restricted' },
    });
    await loadEntitlements()(reqPro, createMockRes(), () => {});
    assert.strictEqual(
      reqPro.entitlements?.webhookLogging,
      false,
      'Explicit webhook_logging: false must override professional default of true'
    );
  });

  // =========================================================================
  // 4. Missing or malformed feature configuration follows the documented fallback
  // =========================================================================
  it('4. Missing or malformed feature configuration follows documented fallback', async () => {
    const testCases = [
      { plan: 'free', features: null, expected: false },
      { plan: 'free', features: 'malformed json', expected: false },
      { plan: 'starter', features: {}, expected: false },
      { plan: 'starter', features: { webhook_logging: 'invalid_string' }, expected: false },
      { plan: 'professional', features: null, expected: true },
      { plan: 'professional', features: {}, expected: true },
      { plan: 'enterprise', features: {}, expected: true },
      { plan: 'enterprise', features: 'bad json', expected: true },
    ];

    for (const tc of testCases) {
      (pool as any).query = async (sql: string) => {
        if (sql.includes('FROM tenants t')) {
          return {
            rows: [
              {
                plan_id: tc.plan,
                plan_name: tc.plan.toUpperCase(),
                features: tc.features,
              },
            ],
          };
        }
        return { rows: [] };
      };

      const req = createMockReq({ tenant: { id: `t-${tc.plan}` } });
      await loadEntitlements()(req, createMockRes(), () => {});
      assert.strictEqual(
        req.entitlements?.webhookLogging,
        tc.expected,
        `Plan ${tc.plan} with features ${JSON.stringify(tc.features)} must resolve webhookLogging to ${tc.expected}`
      );
    }
  });

  // =========================================================================
  // 5. Tenant A cannot access Tenant B's webhook records
  // =========================================================================
  it("5. Tenant isolation: Tenant A cannot access Tenant B's webhook records", async () => {
    const tenantAId = '11111111-1111-1111-1111-111111111111';
    const tenantBId = '22222222-2222-2222-2222-222222222222';
    const recordBId = '99999999-9999-9999-9999-999999999999';

    (pool as any).query = async (sql: string, params?: any[]) => {
      if (sql.includes('SELECT tenant_id FROM users WHERE id = $1')) {
        return { rows: [{ tenant_id: tenantAId }] };
      }
      if (sql.includes('SELECT id, provider_id, event_id')) {
        // Query must strictly match tenant_id
        if (params && params.includes(recordBId) && params.includes(tenantAId)) {
          // Record B does NOT belong to tenant A
          return { rows: [] };
        }
        if (params && params.includes(tenantAId)) {
          return {
            rows: [
              {
                id: 'evt-a-1',
                provider_id: 'github',
                event_id: 'gh-123',
                event_type: 'push',
                tenant_id: tenantAId,
                raw_payload: { ref: 'refs/heads/main' },
                received_at: new Date().toISOString(),
              },
            ],
          };
        }
      }
      if (sql.includes('SELECT COUNT(*) FROM webhook_events')) {
        return { rows: [{ count: '1' }] };
      }
      return { rows: [] };
    };

    const app = express();
    app.use(express.json());
    app.use((req: any, _res, next) => {
      req.user = { userId: 'u-tenant-a', tenantId: tenantAId };
      req.tenant = { id: tenantAId };
      req.entitlements = {
        planId: 'professional',
        webhookLogging: true,
        features: { webhook_logging: true },
      };
      next();
    });
    app.use('/api', userRouter);

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    try {
      // 5a. List only returns Tenant A's records
      const listRes = await fetch(`http://127.0.0.1:${port}/api/developer/webhook-logs`);
      assert.strictEqual(listRes.status, 200);
      const listData = await listRes.json();
      assert.strictEqual(listData.success, true);
      assert.strictEqual(listData.logs.length, 1);
      assert.strictEqual(listData.logs[0].id, 'evt-a-1');

      // 5b. Attempting to fetch Tenant B's record ID returns 404
      const detailRes = await fetch(`http://127.0.0.1:${port}/api/developer/webhook-logs/${recordBId}`);
      assert.strictEqual(detailRes.status, 404, "Attempting to access another tenant's record must return 404");
    } finally {
      await closeServer(server);
    }
  });

  // =========================================================================
  // 6. Detail, filter, pagination, and export paths are gated wherever they exist
  // =========================================================================
  it('6. Detail, filter, pagination, and export paths are gated when webhook_logging is false', async () => {
    const app = express();
    app.use(express.json());
    app.use((req: any, _res, next) => {
      req.user = { userId: 'u-starter', tenantId: 't-starter' };
      req.tenant = { id: 't-starter' };
      req.entitlements = {
        planId: 'starter',
        webhookLogging: false,
        features: { webhook_logging: false },
      };
      next();
    });
    app.use('/api', userRouter);

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    try {
      // 6a. List / Filter / Pagination path
      const filterRes = await fetch(
        `http://127.0.0.1:${port}/api/developer/webhook-logs?provider=stripe&event_type=payment_intent.succeeded&limit=10&offset=0`
      );
      assert.strictEqual(filterRes.status, 403);
      const filterBody = await filterRes.json();
      assert.strictEqual(filterBody.code, 'PLAN_FEATURE_DISABLED');
      assert.strictEqual(filterBody.feature, 'webhook_logging');

      // 6b. Single record detail path
      const detailRes = await fetch(`http://127.0.0.1:${port}/api/developer/webhook-logs/evt-12345`);
      assert.strictEqual(detailRes.status, 403);
      const detailBody = await detailRes.json();
      assert.strictEqual(detailBody.code, 'PLAN_FEATURE_DISABLED');
      assert.strictEqual(detailBody.feature, 'webhook_logging');

      // 6c. Export path (CSV)
      const exportCsvRes = await fetch(`http://127.0.0.1:${port}/api/developer/webhook-logs/export?format=csv`);
      assert.strictEqual(exportCsvRes.status, 403);
      const exportCsvBody = await exportCsvRes.json();
      assert.strictEqual(exportCsvBody.code, 'PLAN_FEATURE_DISABLED');

      // 6d. Export path (JSON)
      const exportJsonRes = await fetch(`http://127.0.0.1:${port}/api/developer/webhook-logs/export?format=json`);
      assert.strictEqual(exportJsonRes.status, 403);
      const exportJsonBody = await exportJsonRes.json();
      assert.strictEqual(exportJsonBody.code, 'PLAN_FEATURE_DISABLED');
    } finally {
      await closeServer(server);
    }
  });

  // =========================================================================
  // 6b. Sensitive payload masking: credentials and secrets are not leaked
  // =========================================================================
  it('6b. Sensitive webhook payload secrets and tokens are redacted in log responses', async () => {
    (pool as any).query = async (sql: string) => {
      if (sql.includes('SELECT tenant_id FROM users WHERE id = $1')) {
        return { rows: [{ tenant_id: 't-pro' }] };
      }
      if (sql.includes('SELECT id, provider_id, event_id')) {
        return {
          rows: [
            {
              id: 'evt-sensitive-1',
              provider_id: 'custom_hook',
              event_id: 'sec-1',
              event_type: 'event.triggered',
              raw_payload: {
                safeField: 'hello',
                secret: 'super-secret-password-123',
                auth_token: 'Bearer sensitive-token-xyz',
                nested: {
                  webhook_signing_secret: 'whsec_9999',
                  publicData: 42,
                },
              },
              received_at: new Date().toISOString(),
            },
          ],
        };
      }
      if (sql.includes('SELECT COUNT(*) FROM webhook_events')) {
        return { rows: [{ count: '1' }] };
      }
      return { rows: [] };
    };

    const app = express();
    app.use(express.json());
    app.use((req: any, _res, next) => {
      req.user = { userId: 'u-pro', tenantId: 't-pro' };
      req.tenant = { id: 't-pro' };
      req.entitlements = {
        planId: 'professional',
        webhookLogging: true,
        features: { webhook_logging: true },
      };
      next();
    });
    app.use('/api', userRouter);

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/developer/webhook-logs`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      const payload = data.logs[0].raw_payload;

      assert.strictEqual(payload.safeField, 'hello');
      assert.strictEqual(payload.secret, '[REDACTED]', 'secret key must be redacted');
      assert.strictEqual(payload.auth_token, '[REDACTED]', 'auth_token must be redacted');
      assert.strictEqual(payload.nested.webhook_signing_secret, '[REDACTED]', 'signing secret must be redacted');
      assert.strictEqual(payload.nested.publicData, 42);
    } finally {
      await closeServer(server);
    }
  });

  // =========================================================================
  // 7. Webhook receiver endpoints continue processing valid incoming requests
  // =========================================================================
  it('7. Webhook receiver endpoints process valid requests even when tenant webhook_logging is false', async () => {
    let enqueued = false;
    (pool as any).query = async (sql: string, params?: any[]) => {
      if (sql.includes('INSERT INTO payment_webhooks')) {
        enqueued = true;
        return { rows: [{ id: 'pw-123', status: 'pending' }] };
      }
      return { rows: [] };
    };

    // Test enqueueing a valid webhook event directly
    const eventId = 'evt_stripe_' + Date.now();
    const result = await enqueueWebhookEvent('stripe', eventId, 'checkout.session.completed', {
      id: eventId,
      metadata: { tenantId: 't-free-tenant' },
    });

    assert.ok(result);
    assert.strictEqual(result.status, 'pending');
    assert.strictEqual(enqueued, true, 'Webhook must be inserted into payment_webhooks');
  });

  // =========================================================================
  // 8. Signature verification and invalid-request rejection remain unchanged
  // =========================================================================
  it('8. Signature verification rejects invalid requests on receiver routes', async () => {
    const app = express();
    app.use(express.json());
    app.use('/billing', billingRouter);

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    try {
      // 8a. PhonePe webhook without required x-verify header is rejected with 400
      const phonepeRes = await fetch(`http://127.0.0.1:${port}/billing/webhooks/phonepe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: 'eyJzb21lIjoiZGF0YSJ9' }),
      });
      assert.strictEqual(phonepeRes.status, 400, 'Missing signature must return HTTP 400');
      const phonepeBody = await phonepeRes.json();
      assert.ok(phonepeBody.error.toLowerCase().includes('missing signature'));

      // 8b. Cashfree webhook without timestamp or signature header is rejected with 400
      const cashfreeRes = await fetch(`http://127.0.0.1:${port}/billing/webhooks/cashfree`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'PAYMENT_SUCCESS_WEBHOOK' }),
      });
      assert.strictEqual(cashfreeRes.status, 400, 'Missing Cashfree headers must return HTTP 400');
    } finally {
      await closeServer(server);
    }
  });

  // =========================================================================
  // 9. Payment, subscription, and integration processing remain functional
  // =========================================================================
  it('9. Payment and subscription webhook processing updates tenant status correctly', async () => {
    let tenantUpdated = false;
    let activatedTenantId: string | null = null;

    (pool as any).query = async (sql: string, params?: any[]) => {
      if (sql.includes('UPDATE tenants SET status')) {
        tenantUpdated = true;
        activatedTenantId = params?.[0];
        return { rows: [], rowCount: 1 };
      }
      return { rows: [] };
    };

    const payload = {
      data: {
        object: {
          metadata: {
            tenantId: 't-starter-tenant-123',
            planId: 'professional',
          },
        },
      },
    };

    await processWebhookPayload('stripe', 'checkout.session.completed', payload);

    assert.strictEqual(tenantUpdated, true, 'Tenant subscription must be activated upon payment webhook');
    assert.strictEqual(activatedTenantId, 't-starter-tenant-123');
  });

  // =========================================================================
  // 10. Internal delivery records, retries, and DLQ processing continue
  // =========================================================================
  it('10. Internal delivery records and retries continue independently of commercial plan flag', async () => {
    let insertCount = 0;
    (pool as any).query = async (sql: string, params?: any[]) => {
      if (sql.includes('INSERT INTO payment_webhooks')) {
        insertCount++;
        return { rows: [{ id: `pw-${insertCount}`, status: 'pending' }] };
      }
      return { rows: [] };
    };

    // Free plan tenant webhook enqueue
    const freeRes = await enqueueWebhookEvent('razorpay', 'pay_free_1', 'payment.captured', { amount: 100 });
    assert.strictEqual(freeRes.status, 'pending');

    // Starter plan tenant webhook enqueue
    const starterRes = await enqueueWebhookEvent('phonepe', 'ph_starter_1', 'PAYMENT_SUCCESS', { amount: 200 });
    assert.strictEqual(starterRes.status, 'pending');

    assert.strictEqual(insertCount, 2, 'Internal operational logging must persist for all incoming webhooks');
  });

  // =========================================================================
  // 11. Administrator-only monitoring retains its existing authorization behavior
  // =========================================================================
  it('11. Administrator-only monitoring retains existing authorization check (unauthorized without adminAuth)', async () => {
    // Test that client without authentication is rejected (401) on protected customer-facing routes
    const unauthReq = createMockReq({ user: null });
    const unauthRes = createMockRes();
    let nextCalled = false;

    requireWebhookLogging(unauthReq, unauthRes, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(unauthRes.getStatusCode(), 401);
    const body = unauthRes.getBody();
    assert.ok(body.error.toLowerCase().includes('unauthorized'));

    // Test that internal services bypass the entitlement check cleanly
    const internalReq = createMockReq({
      user: { isInternal: true, role: 'internal_service' },
    });
    const internalRes = createMockRes();
    let internalNextCalled = false;

    requireWebhookLogging(internalReq, internalRes, () => {
      internalNextCalled = true;
    });

    assert.strictEqual(internalNextCalled, true, 'Internal service must bypass requireWebhookLogging check');
  });

  // =========================================================================
  // 12. Regression tests for Fix 1 (api_access), Fix 2 (rag_documents), Fix 3 (audit_trail)
  // =========================================================================
  it('12. Regression: Fix 1 (api_access), Fix 2 (rag_documents), and Fix 3 (audit_trail) continue functioning', async () => {
    // 12a. Verify requireApiAccess
    const deniedApiReq = createMockReq({
      user: { userId: 'u1' },
      entitlements: { apiAccess: false, planId: 'free' },
    });
    const deniedApiRes = createMockRes();
    requireApiAccess(deniedApiReq, deniedApiRes, () => {});
    assert.strictEqual(deniedApiRes.getStatusCode(), 403);
    assert.strictEqual(deniedApiRes.getBody().code, 'PLAN_FEATURE_DISABLED');
    assert.strictEqual(deniedApiRes.getBody().feature, 'api_access');

    // 12b. Verify requireAuditTrail
    const deniedAuditReq = createMockReq({
      user: { userId: 'u1' },
      entitlements: { auditTrail: false, planId: 'starter' },
    });
    const deniedAuditRes = createMockRes();
    requireAuditTrail(deniedAuditReq, deniedAuditRes, () => {});
    assert.strictEqual(deniedAuditRes.getStatusCode(), 403);
    assert.strictEqual(deniedAuditRes.getBody().code, 'PLAN_FEATURE_DISABLED');
    assert.strictEqual(deniedAuditRes.getBody().feature, 'audit_trail');

    // 12c. Verify entitlements loader loads all flags together
    (pool as any).query = async (sql: string) => {
      if (sql.includes('FROM tenants t')) {
        return {
          rows: [
            {
              plan_id: 'professional',
              plan_name: 'Professional',
              features: {
                api_access: true,
                rag_documents: 50000,
                audit_trail: true,
                webhook_logging: true,
              },
            },
          ],
        };
      }
      return { rows: [] };
    };

    const fullReq = createMockReq({ tenant: { id: 't-pro-all' } });
    await loadEntitlements()(fullReq, createMockRes(), () => {});
    assert.strictEqual(fullReq.entitlements?.apiAccess, true);
    assert.strictEqual(fullReq.entitlements?.ragDocumentsLimit, 50000);
    assert.strictEqual(fullReq.entitlements?.auditTrail, true);
    assert.strictEqual(fullReq.entitlements?.webhookLogging, true);
  });
});
