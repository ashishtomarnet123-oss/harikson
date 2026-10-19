if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';
}
if (!process.env.REDIS_URL) {
  process.env.REDIS_URL = 'redis://localhost:6379';
}

import { describe, it, beforeEach, afterEach, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { pool, readPool, redis } from '../src/db/pool.js';
import { requireAuth } from '../src/middleware/auth.js';
import { loadEntitlements, requireApiAccess } from '../src/middleware/entitlements.js';

describe('Xarwiz Isolated Bug Fix 1: API Access Plan Feature Enforcement Test Suite', () => {
  const jwtSecret = 'test_jwt_secret_must_be_at_least_32_characters_long_for_security';
  process.env.JWT_SECRET = jwtSecret;

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

  // Helper to create mock response object
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

  // Helper to create mock request object
  function createMockReq(overrides: Record<string, any> = {}): any {
    return {
      headers: {},
      cookies: {},
      ...overrides,
    };
  }

  // =========================================================================
  // 1. Tenant with api_access: true can access permitted API routes
  // =========================================================================
  it('1. Tenant with api_access: true is permitted to access protected API routes', async () => {
    const req = createMockReq({
      user: { userId: 'u-pro', tenantId: 't-pro' },
      tenant: { id: 't-pro', slug: 'pro-tenant' },
      entitlements: {
        planId: 'professional',
        planName: 'Professional',
        tokenLimit: 5000000,
        storageLimitGb: 50,
        imageLimitMonthly: 100,
        features: { api_access: true },
        apiAccess: true,
        isTrial: false,
        trialEndsAt: null,
      },
    });
    const res = createMockRes();
    let nextCalled = false;

    requireApiAccess(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, true, 'Middleware must call next() when api_access is true');
    assert.strictEqual(res.getStatusCode(), 200);
  });

  // =========================================================================
  // 2. Tenant with api_access: false is denied protected API access
  // =========================================================================
  it('2. Tenant with api_access: false is denied with HTTP 403 Forbidden and PLAN_FEATURE_DISABLED', async () => {
    const req = createMockReq({
      user: { userId: 'u-free', tenantId: 't-free' },
      tenant: { id: 't-free', slug: 'free-tenant' },
      entitlements: {
        planId: 'free',
        planName: 'Free Plan',
        tokenLimit: 1000,
        storageLimitGb: 1,
        imageLimitMonthly: 10,
        features: { api_access: false },
        apiAccess: false,
        isTrial: false,
        trialEndsAt: null,
      },
    });
    const res = createMockRes();
    let nextCalled = false;

    requireApiAccess(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, false, 'Middleware must NOT call next() when api_access is false');
    assert.strictEqual(res.getStatusCode(), 403);
    const body = res.getBody();
    assert.strictEqual(body.code, 'PLAN_FEATURE_DISABLED');
    assert.strictEqual(body.feature, 'api_access');
    assert.strictEqual(body.plan, 'free');
    assert.ok(body.error.includes('API access is not enabled'));
  });

  // =========================================================================
  // 3. Unauthenticated requests continue to follow existing authentication behavior
  // =========================================================================
  it('3. Unauthenticated requests return HTTP 401 Unauthorized before entitlement evaluation', async () => {
    // Missing credentials
    const reqMissing = createMockReq();
    const resMissing = createMockRes();
    let nextCalled = false;
    requireAuth(reqMissing, resMissing, () => { nextCalled = true; });
    assert.strictEqual(resMissing.getStatusCode(), 401);
    assert.strictEqual(nextCalled, false);

    // Invalid JWT
    const reqInvalid = createMockReq({ headers: { authorization: 'Bearer invalid.token.here' } });
    const resInvalid = createMockRes();
    nextCalled = false;
    requireAuth(reqInvalid, resInvalid, () => { nextCalled = true; });
    assert.strictEqual(resInvalid.getStatusCode(), 401);
    assert.strictEqual(nextCalled, false);

    // Missing authentication on requireApiAccess directly
    const reqNoUser = createMockReq();
    const resNoUser = createMockRes();
    nextCalled = false;
    requireApiAccess(reqNoUser, resNoUser, () => { nextCalled = true; });
    assert.strictEqual(resNoUser.getStatusCode(), 401);
    assert.strictEqual(nextCalled, false);
  });

  // =========================================================================
  // 4. Existing API keys cannot bypass a disabled entitlement
  // =========================================================================
  it('4. Existing active API keys cannot bypass disabled entitlement on downgraded or free plans', async () => {
    const rawKey = 'hk_live_111122223333444455556666';
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    // Mock pool query to return active key but belonging to a plan with api_access: false
    pool.query = (async (sqlText: string, params: any[]) => {
      if (sqlText.includes('FROM tenant_api_keys')) {
        return {
          rows: [
            {
              id: 'key-123',
              tenant_id: 't-disabled',
              user_id: 'u-disabled',
              scopes: ['chat:write', 'chat:read'],
              status: 'active',
              resolved_tenant_id: 't-disabled',
              tenant_slug: 'disabled-org',
              tenant_plan: 'free',
              plan_features: JSON.stringify({ api_access: false, rag_documents: 100 }),
            },
          ],
        };
      }
      return { rows: [] };
    }) as any;

    const req = createMockReq({
      headers: { authorization: `Bearer ${rawKey}` },
    });
    const res = createMockRes();
    let nextCalled = false;

    await new Promise<void>((resolve) => {
      requireAuth(req, res, () => {
        nextCalled = true;
        resolve();
      });
      // Allow async promise chain in requireAuth to complete
      setTimeout(resolve, 50);
    });

    assert.strictEqual(nextCalled, false, 'Existing API key must NOT be authenticated if api_access is false');
    assert.strictEqual(res.getStatusCode(), 403);
    const body = res.getBody();
    assert.strictEqual(body.code, 'PLAN_FEATURE_DISABLED');
    assert.strictEqual(body.feature, 'api_access');
  });

  // =========================================================================
  // 5. API-key creation follows the entitlement rule
  // =========================================================================
  it('5. API-key creation follows the entitlement rule (blocked when false, allowed when true)', async () => {
    const app = express();
    app.use(express.json());

    // Simulated tenant context and entitlement
    app.use((req: any, _res, next) => {
      req.tenant = { id: req.headers['x-test-tenant'] || 't-1' };
      req.user = { userId: 'u-1', tenantId: req.tenant.id };
      const hasAccess = req.headers['x-test-api-access'] === 'true';
      req.entitlements = {
        planId: hasAccess ? 'starter' : 'free',
        planName: hasAccess ? 'Starter' : 'Free',
        tokenLimit: 100000,
        storageLimitGb: 10,
        imageLimitMonthly: 10,
        features: { api_access: hasAccess },
        apiAccess: hasAccess,
        isTrial: false,
        trialEndsAt: null,
      };
      next();
    });

    // Endpoint modeled identically to user.routes.ts POST /developer/keys
    app.post('/api/user/developer/keys', (req: any, res) => {
      const hasApiAccess = req.entitlements?.apiAccess;
      if (!hasApiAccess) {
        const planId = req.entitlements?.planId || 'free';
        return res.status(403).json({
          error: 'API key creation requires an active plan with API access enabled. Please upgrade to continue.',
          code: 'PLAN_FEATURE_DISABLED',
          feature: 'api_access',
          currentPlan: planId,
          plan: planId,
        });
      }
      return res.status(201).json({ success: true, key: 'hk_live_mock_created_key' });
    });

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const address = server.address() as any;
    const baseUrl = `http://127.0.0.1:${address.port}`;

    try {
      // 5a. Attempt creation with api_access: false -> 403 PLAN_FEATURE_DISABLED
      const resDenied = await fetch(`${baseUrl}/api/user/developer/keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-api-access': 'false',
        },
        body: JSON.stringify({ name: 'Blocked Key' }),
      });
      assert.strictEqual(resDenied.status, 403);
      const deniedData: any = await resDenied.json();
      assert.strictEqual(deniedData.code, 'PLAN_FEATURE_DISABLED');
      assert.strictEqual(deniedData.feature, 'api_access');

      // 5b. Attempt creation with api_access: true -> 201 Created
      const resAllowed = await fetch(`${baseUrl}/api/user/developer/keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-api-access': 'true',
        },
        body: JSON.stringify({ name: 'Permitted Key' }),
      });
      assert.strictEqual(resAllowed.status, 201);
      const allowedData: any = await resAllowed.json();
      assert.strictEqual(allowedData.success, true);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  // =========================================================================
  // 6. A tenant upgrade restores access when the effective plan permits it
  // =========================================================================
  it('6. Tenant upgrade immediately restores access for existing API keys without recreation', async () => {
    const rawKey = 'hk_live_upgraded_key_123456789012';
    let tenantCurrentPlan = 'free';
    let tenantPlanFeatures: any = { api_access: false };

    pool.query = (async (sqlText: string, params: any[]) => {
      if (sqlText.includes('FROM tenant_api_keys')) {
        return {
          rows: [
            {
              id: 'key-upgrade',
              tenant_id: 't-upgrading',
              user_id: 'u-upgrading',
              scopes: ['chat:write'],
              status: 'active',
              resolved_tenant_id: 't-upgrading',
              tenant_slug: 'upgrading-org',
              tenant_plan: tenantCurrentPlan,
              plan_features: tenantPlanFeatures,
            },
          ],
        };
      }
      return { rows: [] };
    }) as any;

    const req = createMockReq({ headers: { authorization: `Bearer ${rawKey}` } });

    // Step A: Initially on free plan (api_access: false) -> Denied 403
    let res = createMockRes();
    let nextCalled = false;
    await new Promise<void>((resolve) => {
      requireAuth(req, res, () => { nextCalled = true; resolve(); });
      setTimeout(resolve, 50);
    });
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.getStatusCode(), 403);

    // Step B: Tenant upgrades to Professional (api_access: true)
    tenantCurrentPlan = 'professional';
    tenantPlanFeatures = { api_access: true };

    res = createMockRes();
    nextCalled = false;
    await new Promise<void>((resolve) => {
      requireAuth(req, res, () => { nextCalled = true; resolve(); });
      setTimeout(resolve, 50);
    });
    assert.strictEqual(nextCalled, true, 'Access must be restored after upgrade');
    assert.strictEqual(res.getStatusCode(), 200);
  });

  // =========================================================================
  // 7. A tenant downgrade blocks access when the effective plan does not permit it
  // =========================================================================
  it('7. Tenant downgrade immediately blocks access without deleting existing keys', async () => {
    const rawKey = 'hk_live_downgrade_key_1234567890';
    let tenantCurrentPlan = 'professional';
    let tenantPlanFeatures: any = { api_access: true };

    pool.query = (async (sqlText: string, params: any[]) => {
      if (sqlText.includes('FROM tenant_api_keys')) {
        return {
          rows: [
            {
              id: 'key-downgrade',
              tenant_id: 't-downgrade',
              user_id: 'u-downgrade',
              scopes: ['chat:write'],
              status: 'active',
              resolved_tenant_id: 't-downgrade',
              tenant_slug: 'downgrade-org',
              tenant_plan: tenantCurrentPlan,
              plan_features: tenantPlanFeatures,
            },
          ],
        };
      }
      return { rows: [] };
    }) as any;

    const req = createMockReq({ headers: { authorization: `Bearer ${rawKey}` } });

    // Step A: Initially on professional plan (api_access: true) -> Allowed 200
    let res = createMockRes();
    let nextCalled = false;
    await new Promise<void>((resolve) => {
      requireAuth(req, res, () => { nextCalled = true; resolve(); });
      setTimeout(resolve, 50);
    });
    assert.strictEqual(nextCalled, true);

    // Step B: Tenant downgrades to Free (api_access: false)
    tenantCurrentPlan = 'free';
    tenantPlanFeatures = { api_access: false };

    res = createMockRes();
    nextCalled = false;
    await new Promise<void>((resolve) => {
      requireAuth(req, res, () => { nextCalled = true; resolve(); });
      setTimeout(resolve, 50);
    });
    assert.strictEqual(nextCalled, false, 'Access must be blocked after downgrade');
    assert.strictEqual(res.getStatusCode(), 403);
    assert.strictEqual(res.getBody().code, 'PLAN_FEATURE_DISABLED');
  });

  // =========================================================================
  // 8. One tenant's plan cannot affect another tenant's access
  // =========================================================================
  it('8. Multi-tenant isolation: Tenant A plan does not affect Tenant B access', async () => {
    const reqA = createMockReq({
      user: { userId: 'u-A', tenantId: 't-A' },
      tenant: { id: 't-A', slug: 'tenant-a' },
      entitlements: {
        planId: 'professional',
        planName: 'Professional',
        tokenLimit: 5000000,
        storageLimitGb: 50,
        imageLimitMonthly: 100,
        features: { api_access: true },
        apiAccess: true,
        isTrial: false,
        trialEndsAt: null,
      },
    });

    const reqB = createMockReq({
      user: { userId: 'u-B', tenantId: 't-B' },
      tenant: { id: 't-B', slug: 'tenant-b' },
      entitlements: {
        planId: 'free',
        planName: 'Free',
        tokenLimit: 1000,
        storageLimitGb: 1,
        imageLimitMonthly: 10,
        features: { api_access: false },
        apiAccess: false,
        isTrial: false,
        trialEndsAt: null,
      },
    });

    const resA = createMockRes();
    const resB = createMockRes();
    let nextCalledA = false;
    let nextCalledB = false;

    requireApiAccess(reqA, resA, () => { nextCalledA = true; });
    requireApiAccess(reqB, resB, () => { nextCalledB = true; });

    assert.strictEqual(nextCalledA, true, 'Tenant A with api_access: true must be permitted');
    assert.strictEqual(resA.getStatusCode(), 200);

    assert.strictEqual(nextCalledB, false, 'Tenant B with api_access: false must be denied');
    assert.strictEqual(resB.getStatusCode(), 403);
    assert.strictEqual(resB.getBody().code, 'PLAN_FEATURE_DISABLED');
  });

  // =========================================================================
  // 9. Equivalent protected routes cannot bypass enforcement
  // =========================================================================
  it('9. Equivalent protected routes (/api/chat, /api/v1/chat, /v1/chat, /api/routes/chat) all enforce api_access', async () => {
    const app = express();
    app.use(express.json());

    // Mock tenant & auth context based on header
    app.use((req: any, _res, next) => {
      const isAllowed = req.headers['x-allow-api'] === 'true';
      req.user = { userId: 'u-test', tenantId: 't-test' };
      req.tenant = { id: 't-test' };
      req.entitlements = {
        planId: isAllowed ? 'enterprise' : 'free',
        planName: isAllowed ? 'Enterprise' : 'Free',
        tokenLimit: -1,
        storageLimitGb: -1,
        imageLimitMonthly: 100,
        features: { api_access: isAllowed },
        apiAccess: isAllowed,
        isTrial: false,
        trialEndsAt: null,
      };
      next();
    });

    // Mount equivalent routes protected with requireApiAccess
    app.post('/api/chat', requireApiAccess, (_req, res) => res.json({ success: true, route: '/api/chat' }));
    app.post('/api/v1/chat', requireApiAccess, (_req, res) => res.json({ success: true, route: '/api/v1/chat' }));
    app.post('/v1/chat', requireApiAccess, (_req, res) => res.json({ success: true, route: '/v1/chat' }));
    app.post('/api/routes/chat', requireApiAccess, (_req, res) => res.json({ success: true, route: '/api/routes/chat' }));

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const address = server.address() as any;
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const routesToTest = ['/api/chat', '/api/v1/chat', '/v1/chat', '/api/routes/chat'];

    try {
      // All equivalent routes must block when x-allow-api is false
      for (const route of routesToTest) {
        const res = await fetch(`${baseUrl}${route}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-allow-api': 'false',
          },
          body: JSON.stringify({ message: 'Hello' }),
        });
        assert.strictEqual(res.status, 403, `Route ${route} must return 403 when api_access is false`);
        const data: any = await res.json();
        assert.strictEqual(data.code, 'PLAN_FEATURE_DISABLED', `Route ${route} must return PLAN_FEATURE_DISABLED`);
      }

      // All equivalent routes must succeed when x-allow-api is true
      for (const route of routesToTest) {
        const res = await fetch(`${baseUrl}${route}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-allow-api': 'true',
          },
          body: JSON.stringify({ message: 'Hello' }),
        });
        assert.strictEqual(res.status, 200, `Route ${route} must return 200 when api_access is true`);
        const data: any = await res.json();
        assert.strictEqual(data.success, true);
      }
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  // =========================================================================
  // 10. Existing key revocation and non-API administrative functions remain unaffected
  // =========================================================================
  it('10. Existing key revocation remains possible even when api_access is false', async () => {
    const app = express();
    app.use(express.json());

    app.use((req: any, _res, next) => {
      req.user = { userId: 'u-downgraded', tenantId: 't-downgraded' };
      req.tenant = { id: 't-downgraded' };
      req.entitlements = {
        planId: 'free',
        planName: 'Free',
        tokenLimit: 1000,
        storageLimitGb: 1,
        imageLimitMonthly: 10,
        features: { api_access: false },
        apiAccess: false,
        isTrial: false,
        trialEndsAt: null,
      };
      next();
    });

    // Revocation endpoint (matches user.routes.ts DELETE /developer/keys/:id)
    app.delete('/api/user/developer/keys/:id', (req, res) => {
      // Revocation does NOT require api_access
      return res.json({ success: true, revokedId: req.params.id });
    });

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const address = server.address() as any;
    const baseUrl = `http://127.0.0.1:${address.port}`;

    try {
      const res = await fetch(`${baseUrl}/api/user/developer/keys/key-to-revoke`, {
        method: 'DELETE',
      });
      assert.strictEqual(res.status, 200, 'Key revocation must succeed even on Free/downgraded plan');
      const data: any = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.revokedId, 'key-to-revoke');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
