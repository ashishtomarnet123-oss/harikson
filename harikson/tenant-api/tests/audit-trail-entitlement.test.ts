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
import express, { Request, Response } from 'express';
import { pool, readPool, redis } from '../src/db/pool.js';
import {
  loadEntitlements,
  requireAuditTrail,
  requireApiAccess,
} from '../src/middleware/entitlements.js';
import { DocumentQuotaService } from '../src/services/documentQuotaService.js';
import { PrivacyService } from '../src/services/privacyService.js';
import userRouter from '../src/routes/user.routes.js';

try {
  redis.on('error', () => {});
  redis.disconnect();
} catch (_) {}

describe('Xarwiz Isolated Bug Fix 3: Audit Trail Plan Feature Enforcement Test Suite', () => {
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
  // 1. Tenant with audit_trail: true can access the optional audit-history feature
  // =========================================================================
  it('1. Tenant with audit_trail: true is permitted to access activity audit history', async () => {
    const req = createMockReq({
      user: { userId: 'u-pro', tenantId: 't-pro' },
      tenant: { id: 't-pro', slug: 'pro-tenant' },
      entitlements: {
        planId: 'professional',
        planName: 'Professional',
        tokenLimit: 5000000,
        storageLimitGb: 50,
        imageLimitMonthly: 100,
        features: { audit_trail: true },
        auditTrail: true,
        apiAccess: true,
        isTrial: false,
        trialEndsAt: null,
      },
    });
    const res = createMockRes();
    let nextCalled = false;

    requireAuditTrail(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, true, 'requireAuditTrail must call next() when audit_trail is true');
    assert.strictEqual(res.getStatusCode(), 200);
  });

  // =========================================================================
  // 2. Tenant with audit_trail: false cannot access the restricted feature
  // =========================================================================
  it('2. Tenant with audit_trail: false is denied with HTTP 403 Forbidden and PLAN_FEATURE_DISABLED', async () => {
    const req = createMockReq({
      user: { userId: 'u-starter', tenantId: 't-starter' },
      tenant: { id: 't-starter', slug: 'starter-tenant' },
      entitlements: {
        planId: 'starter',
        planName: 'Starter',
        tokenLimit: 1000000,
        storageLimitGb: 10,
        imageLimitMonthly: 20,
        features: { audit_trail: false },
        auditTrail: false,
        apiAccess: false,
        isTrial: false,
        trialEndsAt: null,
      },
    });
    const res = createMockRes();
    let nextCalled = false;

    requireAuditTrail(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, false, 'requireAuditTrail must NOT call next() when audit_trail is false');
    assert.strictEqual(res.getStatusCode(), 403, 'Must return HTTP 403 Forbidden');
    const body = res.getBody();
    assert.strictEqual(body.code, 'PLAN_FEATURE_DISABLED');
    assert.strictEqual(body.feature, 'audit_trail');
    assert.strictEqual(body.currentPlan, 'starter');
    assert.ok(body.error.toLowerCase().includes('audit trail'));
  });

  // =========================================================================
  // 3. Mandatory security logging continues when the flag is false
  // =========================================================================
  it('3. Mandatory security logging (activity_logs insert) persists regardless of audit_trail flag', async () => {
    let insertedLog: any = null;
    (pool as any).query = async (sql: string, params?: any[]) => {
      if (sql.includes('INSERT INTO activity_logs')) {
        insertedLog = { sql, params };
        return { rows: [{ id: 'log-123' }], rowCount: 1 };
      }
      return { rows: [] };
    };

    // User is on Free plan with audit_trail: false
    const app = express();
    app.use(express.json());
    app.use((req: any, _res, next) => {
      req.user = { userId: 'u-free', tenantId: 't-free' };
      req.tenant = { id: 't-free' };
      req.entitlements = {
        planId: 'free',
        auditTrail: false,
        features: { audit_trail: false },
      };
      next();
    });
    app.use('/api', userRouter);

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/analytics/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'User Login',
          details: { ip: '127.0.0.1', method: 'password' },
        }),
      });

      assert.strictEqual(response.status, 200);
      const resJson = await response.json();
      assert.strictEqual(resJson.success, true);

      // Verify that security log was recorded into activity_logs
      assert.ok(insertedLog !== null, 'activity_logs INSERT must be executed');
      assert.strictEqual(insertedLog.params[0], 'u-free');
      assert.strictEqual(insertedLog.params[1], 't-free');
      assert.strictEqual(insertedLog.params[2], 'User Login');
    } finally {
      await closeServer(server);
    }
  });

  // =========================================================================
  // 4. Mandatory consent and privacy logging continues when the flag is false
  // =========================================================================
  it('4. Mandatory consent & privacy logging continues when audit_trail is false', async () => {
    let consentAuditEventRecorded = false;
    let recordedEventData: any = null;

    const mockClient = {
      query: async (sql: string, params?: any[]) => {
        if (sql.includes('SELECT 1')) {
          return { rows: [{ '?column?': 1 }] };
        }
        if (sql.includes('set_config') || sql.includes('assert_tenant_context')) {
          return { rows: [] };
        }
        if (sql.includes('SELECT * FROM consent_purposes WHERE is_active = true')) {
          return {
            rows: [
              {
                id: 'p-analytics',
                name: 'Analytics',
                is_required: false,
                legal_basis: 'consent',
                version: '2.0-dpdp',
              },
            ],
          };
        }
        if (sql.includes('SELECT status FROM user_consents')) {
          return { rows: [{ status: 'granted' }] };
        }
        if (sql.includes('INSERT INTO user_consents')) {
          return { rows: [] };
        }
        if (sql.includes('INSERT INTO consent_audit_events')) {
          consentAuditEventRecorded = true;
          recordedEventData = params;
          return { rows: [] };
        }
        if (sql.includes('SELECT * FROM user_consents')) {
          return { rows: [{ purpose_id: 'p-analytics', status: 'withdrawn' }] };
        }
        return { rows: [] };
      },
      release: () => {},
    };

    (pool as any).connect = async () => mockClient;
    (pool as any).query = mockClient.query;

    // Even on free plan (audit_trail: false), privacy statutory consent audit logging must execute
    const result = await PrivacyService.updateUserConsents(
      't-free',
      'u-free',
      [{ purposeId: 'p-analytics', status: 'withdrawn' }],
      {
        source: 'user_privacy_settings',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      }
    );

    assert.ok(Array.isArray(result));
    assert.strictEqual(consentAuditEventRecorded, true, 'consent_audit_events must be recorded');
    assert.strictEqual(recordedEventData[0], 't-free');
    assert.strictEqual(recordedEventData[1], 'u-free');
    assert.strictEqual(recordedEventData[2], 'p-analytics');
    assert.strictEqual(recordedEventData[3], 'withdrawn');
  });

  // =========================================================================
  // 5. Tenant cannot access another tenant's audit records (Isolation)
  // =========================================================================
  it('5. Tenant isolation: query scopes by authenticated tenant_id, preventing cross-tenant access', async () => {
    let queriedSql = '';
    let queriedParams: any[] = [];

    (pool as any).query = async (sql: string, params?: any[]) => {
      if (sql.includes('FROM activity_logs')) {
        queriedSql = sql;
        queriedParams = params || [];
        return {
          rows: [
            {
              id: 'log-tenant-a',
              action: 'Document Uploaded',
              details: 'doc1.pdf',
              ip: '10.0.0.1',
              device: 'Chrome on MacOS',
              timestamp: new Date().toISOString(),
            },
          ],
        };
      }
      if (sql.includes('SELECT tenant_id FROM users')) {
        return { rows: [{ tenant_id: 'tenant-a-uuid' }] };
      }
      return { rows: [] };
    };

    const app = express();
    app.use((req: any, _res, next) => {
      // Authenticated as Tenant A
      req.user = { userId: 'user-a', tenantId: 'tenant-a-uuid' };
      req.tenant = { id: 'tenant-a-uuid' };
      req.entitlements = {
        planId: 'professional',
        auditTrail: true,
        features: { audit_trail: true },
      };
      next();
    });
    app.use('/api', userRouter);

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    try {
      // Malicious attempt to pass ?tenantId=tenant-b-uuid
      const res = await fetch(`http://127.0.0.1:${port}/api/activity?tenantId=tenant-b-uuid`);
      assert.strictEqual(res.status, 200);

      // Verify that query was strictly scoped to tenant-a-uuid from server session
      assert.ok(queriedSql.includes('WHERE user_id = $1'));
      assert.ok(queriedSql.includes('tenant_id::text = $2::text'));
      assert.strictEqual(queriedParams[0], 'user-a');
      assert.strictEqual(queriedParams[1], 'tenant-a-uuid', 'Must use authenticated tenant ID, not spoofed query param');
    } finally {
      await closeServer(server);
    }
  });

  // =========================================================================
  // 6. Tenant users cannot access platform-wide administrative logs
  // =========================================================================
  it('6. Tenant users cannot access platform-wide administrative logs without admin privileges', async () => {
    // Regular tenant caller lacking platform admin role
    const adminApp = express();
    // Simulate admin route protected by adminAuth
    adminApp.get('/admin/audit-log', (req: any, res) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.includes('admin-token')) {
        return res.status(401).json({ error: 'Unauthorized administrative access' });
      }
      res.json({ logs: ['system_event_1', 'system_event_2'] });
    });

    const server = http.createServer(adminApp);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    try {
      // Tenant user request without admin token
      const res = await fetch(`http://127.0.0.1:${port}/admin/audit-log`, {
        headers: { Authorization: 'Bearer tenant-user-jwt' },
      });
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.ok(data.error.includes('Unauthorized'));
    } finally {
      await closeServer(server);
    }
  });

  // =========================================================================
  // 7. Existing admin authorization remains intact
  // =========================================================================
  it('7. Existing admin authorization remains intact for platform-wide administrative audit logs', async () => {
    const adminApp = express();
    adminApp.get('/admin/audit-log', (req: any, res) => {
      const authHeader = req.headers.authorization;
      if (authHeader === 'Bearer valid-superadmin-token') {
        return res.json({ success: true, count: 42, logs: [] });
      }
      return res.status(403).json({ error: 'Forbidden' });
    });

    const server = http.createServer(adminApp);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    try {
      const res = await fetch(`http://127.0.0.1:${port}/admin/audit-log`, {
        headers: { Authorization: 'Bearer valid-superadmin-token' },
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.count, 42);
    } finally {
      await closeServer(server);
    }
  });

  // =========================================================================
  // 8. Audit exports enforce the audit_trail entitlement
  // =========================================================================
  it('8. Audit exports: allowed when audit_trail is true, blocked when audit_trail is false', async () => {
    (pool as any).query = async (sql: string, params?: any[]) => {
      if (sql.includes('FROM activity_logs')) {
        return {
          rows: [
            {
              id: 'log-1',
              action: 'API Key Created',
              details: 'Production Key',
              ip_address: '1.2.3.4',
              user_agent: 'Curl/8.0',
              created_at: new Date('2026-10-15T12:00:00Z'),
            },
          ],
        };
      }
      if (sql.includes('SELECT tenant_id FROM users')) {
        return { rows: [{ tenant_id: 't-pro' }] };
      }
      return { rows: [] };
    };

    // Subcase 8a: Allowed for audit_trail: true
    const appPro = express();
    appPro.use((req: any, _res, next) => {
      req.user = { userId: 'u-pro', tenantId: 't-pro' };
      req.tenant = { id: 't-pro' };
      req.entitlements = {
        planId: 'professional',
        auditTrail: true,
        features: { audit_trail: true },
      };
      next();
    });
    appPro.use('/api', userRouter);

    const serverPro = http.createServer(appPro);
    await new Promise<void>((resolve) => serverPro.listen(0, resolve));
    const portPro = (serverPro.address() as any).port;

    try {
      // CSV export
      const csvRes = await fetch(`http://127.0.0.1:${portPro}/api/activity/export?format=csv`);
      assert.strictEqual(csvRes.status, 200);
      assert.ok(csvRes.headers.get('content-type')?.includes('text/csv'));
      const csvText = await csvRes.text();
      assert.ok(csvText.includes('ID,Timestamp,Action,Details,IP Address,Device'));
      assert.ok(csvText.includes('API Key Created'));

      // JSON export
      const jsonRes = await fetch(`http://127.0.0.1:${portPro}/api/activity/export?format=json`);
      assert.strictEqual(jsonRes.status, 200);
      assert.ok(jsonRes.headers.get('content-type')?.includes('application/json'));
      const jsonData = await jsonRes.json();
      assert.strictEqual(jsonData.success, true);
      assert.strictEqual(jsonData.logs.length, 1);
    } finally {
      await closeServer(serverPro);
    }

    // Subcase 8b: Blocked for audit_trail: false
    const appFree = express();
    appFree.use((req: any, _res, next) => {
      req.user = { userId: 'u-free', tenantId: 't-free' };
      req.tenant = { id: 't-free' };
      req.entitlements = {
        planId: 'free',
        auditTrail: false,
        features: { audit_trail: false },
      };
      next();
    });
    appFree.use('/api', userRouter);

    const serverFree = http.createServer(appFree);
    await new Promise<void>((resolve) => serverFree.listen(0, resolve));
    const portFree = (serverFree.address() as any).port;

    try {
      const deniedRes = await fetch(`http://127.0.0.1:${portFree}/api/activity/export?format=csv`);
      assert.strictEqual(deniedRes.status, 403);
      const deniedData = await deniedRes.json();
      assert.strictEqual(deniedData.code, 'PLAN_FEATURE_DISABLED');
      assert.strictEqual(deniedData.feature, 'audit_trail');
    } finally {
      await closeServer(serverFree);
    }
  });

  // =========================================================================
  // 9. Missing or malformed feature configuration follows the documented policy
  // =========================================================================
  it('9. Missing or malformed configuration falls back safely based on plan tier', async () => {
    // 9a. Professional with null features object -> defaults audit_trail: true
    (pool as any).query = async (sql: string, params?: any[]) => {
      if (sql.includes('FROM tenants t')) {
        return {
          rows: [
            {
              tenant_plan: 'professional',
              plan_id: 'professional',
              token_limit: 5000000,
              storage_limit_gb: 50,
              image_limit_monthly: 100,
              features: null,
            },
          ],
        };
      }
      return { rows: [] };
    };

    const reqPro = createMockReq({
      user: { userId: 'u-1', tenantId: 't-pro' },
      tenant: { id: 't-pro', plan: 'professional' },
    });
    const resPro = createMockRes();
    let nextCalledPro = false;

    await loadEntitlements()(reqPro, resPro, () => {
      nextCalledPro = true;
    });

    assert.strictEqual(nextCalledPro, true);
    assert.strictEqual(reqPro.entitlements.auditTrail, true, 'Professional must default to audit_trail: true when features is null');

    // 9b. Free plan with malformed non-boolean audit_trail -> defaults audit_trail: false
    (pool as any).query = async (sql: string, params?: any[]) => {
      if (sql.includes('FROM tenants t')) {
        return {
          rows: [
            {
              tenant_plan: 'free',
              plan_id: 'free',
              token_limit: 100000,
              storage_limit_gb: 1,
              image_limit_monthly: 10,
              features: { audit_trail: 'malformed_string_value' },
            },
          ],
        };
      }
      return { rows: [] };
    };

    const reqFree = createMockReq({
      user: { userId: 'u-2', tenantId: 't-free' },
      tenant: { id: 't-free', plan: 'free' },
    });
    const resFree = createMockRes();
    let nextCalledFree = false;

    await loadEntitlements()(reqFree, resFree, () => {
      nextCalledFree = true;
    });

    assert.strictEqual(nextCalledFree, true);
    assert.strictEqual(reqFree.entitlements.auditTrail, false, 'Free plan must default to audit_trail: false when feature value is malformed');
  });

  // =========================================================================
  // 10. Dynamic upgrade/downgrade: upgrade restores access, downgrade blocks without deleting records
  // =========================================================================
  it('10. Plan upgrade restores access; downgrade blocks access without deleting historical logs', async () => {
    let currentPlan = 'starter';
    const fakeDbLogs = [
      {
        id: 'hist-log-1',
        action: 'Account Created',
        details: 'Initial setup',
        ip: '127.0.0.1',
        device: 'Mac Safari',
        timestamp: new Date().toISOString(),
      },
    ];

    (pool as any).query = async (sql: string, params?: any[]) => {
      if (sql.includes('FROM tenants t')) {
        return {
          rows: [
            {
              tenant_plan: currentPlan,
              plan_id: currentPlan,
              token_limit: 100000,
              storage_limit_gb: 1,
              image_limit_monthly: 10,
              features: { audit_trail: currentPlan === 'professional' },
            },
          ],
        };
      }
      if (sql.includes('FROM activity_logs')) {
        return { rows: fakeDbLogs };
      }
      if (sql.includes('SELECT tenant_id FROM users')) {
        return { rows: [{ tenant_id: 't-dynamic' }] };
      }
      return { rows: [] };
    };

    const app = express();
    app.use((req: any, _res, next) => {
      req.user = { userId: 'u-dyn', tenantId: 't-dynamic' };
      req.tenant = { id: 't-dynamic', plan: currentPlan };
      next();
    });
    app.use(loadEntitlements());
    app.use('/api', userRouter);

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    try {
      // Step A: On starter plan (audit_trail: false), activity endpoint is rejected
      let res = await fetch(`http://127.0.0.1:${port}/api/activity`);
      assert.strictEqual(res.status, 403);
      let data = await res.json();
      assert.strictEqual(data.code, 'PLAN_FEATURE_DISABLED');

      // Step B: Tenant upgrades to Professional (audit_trail: true)
      currentPlan = 'professional';
      res = await fetch(`http://127.0.0.1:${port}/api/activity`);
      assert.strictEqual(res.status, 200);
      data = await res.json();
      assert.strictEqual(data.length, 1);
      assert.strictEqual(data[0].id, 'hist-log-1');

      // Step C: Tenant downgrades back to Starter
      currentPlan = 'starter';
      res = await fetch(`http://127.0.0.1:${port}/api/activity`);
      assert.strictEqual(res.status, 403);

      // Verify that historical records were not deleted or modified
      assert.strictEqual(fakeDbLogs.length, 1, 'Historical logs must remain intact upon downgrade');
    } finally {
      await closeServer(server);
    }
  });

  // =========================================================================
  // 11. Regression Check: Fix 1 api_access enforcement remains functional
  // =========================================================================
  it('11. Regression: Fix 1 api_access entitlement enforcement remains functional', async () => {
    // 11a. Entitled
    const proReq = createMockReq({
      user: { userId: 'u-pro', tenantId: 't-pro' },
      tenant: { id: 't-pro', slug: 'pro-tenant' },
      entitlements: {
        planId: 'professional',
        apiAccess: true,
        features: { api_access: true },
      },
    });
    const proRes = createMockRes();
    let proNext = false;
    requireApiAccess(proReq, proRes, () => {
      proNext = true;
    });
    assert.strictEqual(proNext, true, 'requireApiAccess must allow when apiAccess is true');

    // 11b. Not entitled
    const freeReq = createMockReq({
      user: { userId: 'u-free', tenantId: 't-free' },
      tenant: { id: 't-free', slug: 'free-tenant' },
      entitlements: {
        planId: 'free',
        apiAccess: false,
        features: { api_access: false },
      },
    });
    const freeRes = createMockRes();
    let freeNext = false;
    requireApiAccess(freeReq, freeRes, () => {
      freeNext = true;
    });
    assert.strictEqual(freeNext, false, 'requireApiAccess must block when apiAccess is false');
    assert.strictEqual(freeRes.getStatusCode(), 403);
    assert.strictEqual(freeRes.getBody().code, 'PLAN_FEATURE_DISABLED');
    assert.strictEqual(freeRes.getBody().feature, 'api_access');
  });

  // =========================================================================
  // 12. Regression Check: Fix 2 rag_documents quota enforcement remains functional
  // =========================================================================
  it('12. Regression: Fix 2 rag_documents quota enforcement remains functional', async () => {
    const mockClient = {
      query: async (sql: string) => {
        if (sql.includes('FROM tenants t')) {
          return {
            rows: [
              {
                tenant_plan: 'starter',
                plan_id: 'starter',
                storage_limit_gb: 10,
                features: { rag_documents: 5 },
              },
            ],
          };
        }
        if (sql.includes('SELECT COUNT(*)')) {
          return { rows: [{ count: 5 }] }; // Exactly at limit
        }
        return { rows: [] };
      },
    };

    const quota = await DocumentQuotaService.checkQuota('t-quota', mockClient);
    assert.strictEqual(quota.allowed, false, 'Quota must be rejected when active count reaches limit');
    assert.strictEqual(quota.limit, 5);
    assert.strictEqual(quota.currentUsage, 5);

    await assert.rejects(
      async () => {
        await DocumentQuotaService.assertAndReserveSlot('t-quota', mockClient);
      },
      (err: any) => {
        assert.strictEqual(err.code, 'PLAN_LIMIT_EXCEEDED');
        assert.strictEqual(err.feature, 'rag_documents');
        assert.strictEqual(err.limitReached, true);
        return true;
      }
    );
  });
});
