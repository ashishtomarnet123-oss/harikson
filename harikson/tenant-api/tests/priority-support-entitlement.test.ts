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
  requirePrioritySupport,
  requireWebhookLogging,
  requireAuditTrail,
  requireApiAccess,
} from '../src/middleware/entitlements.js';
import userRouter from '../src/routes/user.routes.js';

try {
  redis.on('error', () => {});
  redis.disconnect();
} catch (_) {}

describe('Xarwiz Isolated Bug Fix 5: Priority Support Plan Feature Enforcement Test Suite', () => {
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
  // 1. Tenant with priority_support: true receives supported priority treatment
  // =========================================================================
  it('1. Tenant with priority_support: true receives supported priority treatment', async () => {
    const req = createMockReq({
      user: { userId: 'u-pro', tenantId: 't-pro' },
      tenant: { id: 't-pro', slug: 'pro-tenant' },
      entitlements: {
        planId: 'professional',
        planName: 'Professional',
        tokenLimit: 5000000,
        storageLimitGb: 50,
        imageLimitMonthly: 100,
        features: { priority_support: true },
        prioritySupport: true,
        webhookLogging: true,
        apiAccess: true,
        auditTrail: true,
        ragDocumentsLimit: 50000,
        isTrial: false,
        trialEndsAt: null,
      },
      body: {
        subject: 'Database connection latency',
        message: 'We are noticing elevated response times.',
        category: 'technical',
      },
    });

    (pool as any).query = async (sql: string, params?: any[]) => {
      if (sql.includes('FROM users WHERE id = $1')) {
        return { rows: [{ tenant_id: 't-pro', role: 'member', email: 'pro@example.com' }] };
      }
      if (sql.includes('INSERT INTO support_tickets')) {
        return { rows: [] };
      }
      return { rows: [] };
    };

    // Middleware allows priority actions
    let nextCalled = false;
    const resMid = createMockRes();
    requirePrioritySupport(req, resMid, () => {
      nextCalled = true;
    });
    assert.strictEqual(nextCalled, true, 'requirePrioritySupport must call next() for entitled tenant');

    // Route applies priority status
    const app = express();
    app.use(express.json());
    app.use((r: any, _res, n) => {
      r.user = req.user;
      r.tenant = req.tenant;
      r.entitlements = req.entitlements;
      n();
    });
    app.use('/api/user', userRouter);

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/user/support/ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      });

      assert.strictEqual(response.status, 201, 'Should create ticket with 201 Created');
      const data: any = await response.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.ticket.priority, 'priority', 'Server must tag ticket priority as priority');
      assert.strictEqual(data.ticket.isPriority, true, 'Server must tag ticket isPriority as true');
      assert.ok(data.message.includes('priority handling'));
    } finally {
      await closeServer(server);
    }
  });

  // =========================================================================
  // 2. Tenant with priority_support: false retains standard support access
  // =========================================================================
  it('2. Tenant with priority_support: false retains standard support access', async () => {
    const req = createMockReq({
      user: { userId: 'u-starter', tenantId: 't-starter' },
      tenant: { id: 't-starter', slug: 'starter-tenant' },
      entitlements: {
        planId: 'starter',
        planName: 'Starter',
        tokenLimit: 1000000,
        storageLimitGb: 10,
        imageLimitMonthly: 20,
        features: { priority_support: false },
        prioritySupport: false,
        webhookLogging: false,
        apiAccess: true,
        auditTrail: false,
        ragDocumentsLimit: 500,
        isTrial: false,
        trialEndsAt: null,
      },
      body: {
        subject: 'How do I add a team member?',
        message: 'Looking for instructions on adding collaborators.',
      },
    });

    (pool as any).query = async (sql: string, params?: any[]) => {
      if (sql.includes('FROM users WHERE id = $1')) {
        return { rows: [{ tenant_id: 't-starter', role: 'member', email: 'starter@example.com' }] };
      }
      if (sql.includes('INSERT INTO support_tickets')) {
        return { rows: [] };
      }
      return { rows: [] };
    };

    const app = express();
    app.use(express.json());
    app.use((r: any, _res, n) => {
      r.user = req.user;
      r.tenant = req.tenant;
      r.entitlements = req.entitlements;
      n();
    });
    app.use('/api/user', userRouter);

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/user/support/ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      });

      assert.strictEqual(response.status, 201, 'Standard customers must retain ticket creation access (not 403)');
      const data: any = await response.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.ticket.priority, 'standard');
      assert.strictEqual(data.ticket.isPriority, false);
      assert.ok(data.message.includes('standard handling'));
    } finally {
      await closeServer(server);
    }
  });

  // =========================================================================
  // 3. Priority-only operations return 403 PLAN_FEATURE_DISABLED when disabled
  // =========================================================================
  it('3. Priority-only operations return 403 PLAN_FEATURE_DISABLED when disabled', async () => {
    const req = createMockReq({
      user: { userId: 'u-starter', tenantId: 't-starter' },
      tenant: { id: 't-starter', slug: 'starter-tenant' },
      entitlements: {
        planId: 'starter',
        planName: 'Starter',
        tokenLimit: 1000000,
        storageLimitGb: 10,
        imageLimitMonthly: 20,
        features: { priority_support: false },
        prioritySupport: false,
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
    requirePrioritySupport(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, false, 'requirePrioritySupport must NOT call next() when priority_support is false');
    assert.strictEqual(res.getStatusCode(), 403, 'Must return HTTP 403 Forbidden');
    const body = res.getBody();
    assert.strictEqual(body.code, 'PLAN_FEATURE_DISABLED');
    assert.strictEqual(body.feature, 'priority_support');
    assert.strictEqual(body.currentPlan, 'starter');
    assert.ok(body.error.toLowerCase().includes('priority support'));

    // Test API route protection on priority escalation
    const app = express();
    app.use(express.json());
    app.use((r: any, _res, n) => {
      r.user = req.user;
      r.tenant = req.tenant;
      r.entitlements = req.entitlements;
      n();
    });
    app.use('/api/user', userRouter);

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/user/support/priority-escalate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: 'tick-123', reason: 'High urgency' }),
      });

      assert.strictEqual(response.status, 403);
      const data: any = await response.json();
      assert.strictEqual(data.code, 'PLAN_FEATURE_DISABLED');
      assert.strictEqual(data.feature, 'priority_support');
    } finally {
      await closeServer(server);
    }
  });

  // =========================================================================
  // 4. Explicit boolean configuration overrides fallback behavior
  // =========================================================================
  it('4. Explicit boolean configuration overrides fallback behavior', async () => {
    // 4a: Starter plan with explicit priority_support: true override
    (pool as any).query = async (sql: string, params?: any[]) => {
      if (sql.includes('FROM tenants t')) {
        return {
          rows: [
            {
              plan_id: 'starter',
              plan_name: 'Custom Starter with Priority Support',
              token_limit: 1000000,
              storage_limit_gb: 10,
              image_limit_monthly: 20,
              features: JSON.stringify({ priority_support: true, api_access: true }),
            },
          ],
        };
      }
      return { rows: [] };
    };

    const reqStarter = createMockReq({ tenant: { id: 't-starter-custom' } });
    const resStarter = createMockRes();
    await loadEntitlements()(reqStarter, resStarter, () => {});

    assert.strictEqual(reqStarter.entitlements?.prioritySupport, true, 'Explicit true must override starter default');

    // 4b: Professional plan with explicit priority_support: false override
    (pool as any).query = async (sql: string, params?: any[]) => {
      if (sql.includes('FROM tenants t')) {
        return {
          rows: [
            {
              plan_id: 'professional',
              plan_name: 'Pro Basic',
              token_limit: 5000000,
              storage_limit_gb: 50,
              image_limit_monthly: 100,
              features: JSON.stringify({ priority_support: false, api_access: true }),
            },
          ],
        };
      }
      return { rows: [] };
    };

    const reqPro = createMockReq({ tenant: { id: 't-pro-override' } });
    const resPro = createMockRes();
    await loadEntitlements()(reqPro, resPro, () => {});

    assert.strictEqual(reqPro.entitlements?.prioritySupport, false, 'Explicit false must override professional default');
  });

  // =========================================================================
  // 5. Missing or malformed configuration follows documented fallback
  // =========================================================================
  it('5. Missing or malformed configuration follows documented fallback', async () => {
    // 5a: Free plan with null/empty features -> fallback false
    (pool as any).query = async (sql: string) => {
      if (sql.includes('FROM tenants t')) {
        return {
          rows: [
            {
              plan_id: 'free',
              plan_name: 'Free Plan',
              features: null,
            },
          ],
        };
      }
      return { rows: [] };
    };
    const reqFree = createMockReq({ tenant: { id: 't-free' } });
    await loadEntitlements()(reqFree, createMockRes(), () => {});
    assert.strictEqual(reqFree.entitlements?.prioritySupport, false, 'Free plan fallback must be false');

    // 5b: Starter plan with malformed features string -> fallback false
    (pool as any).query = async (sql: string) => {
      if (sql.includes('FROM tenants t')) {
        return {
          rows: [
            {
              plan_id: 'starter',
              plan_name: 'Starter Plan',
              features: 'malformed{{json',
            },
          ],
        };
      }
      return { rows: [] };
    };
    const reqStarter = createMockReq({ tenant: { id: 't-starter' } });
    await loadEntitlements()(reqStarter, createMockRes(), () => {});
    assert.strictEqual(reqStarter.entitlements?.prioritySupport, false, 'Starter plan fallback must be false');

    // 5c: Professional plan with array features (legacy migration 038 format) -> fallback true
    (pool as any).query = async (sql: string) => {
      if (sql.includes('FROM tenants t')) {
        return {
          rows: [
            {
              plan_id: 'professional',
              plan_name: 'Professional Plan',
              features: JSON.stringify(['Priority 24/7 Support', 'Custom Agents']),
            },
          ],
        };
      }
      return { rows: [] };
    };
    const reqPro = createMockReq({ tenant: { id: 't-pro' } });
    await loadEntitlements()(reqPro, createMockRes(), () => {});
    assert.strictEqual(reqPro.entitlements?.prioritySupport, true, 'Professional plan fallback must be true');

    // 5d: Enterprise plan with empty features object -> fallback true
    (pool as any).query = async (sql: string) => {
      if (sql.includes('FROM tenants t')) {
        return {
          rows: [
            {
              plan_id: 'enterprise',
              plan_name: 'Enterprise Plan',
              features: '{}',
            },
          ],
        };
      }
      return { rows: [] };
    };
    const reqEnt = createMockReq({ tenant: { id: 't-enterprise' } });
    await loadEntitlements()(reqEnt, createMockRes(), () => {});
    assert.strictEqual(reqEnt.entitlements?.prioritySupport, true, 'Enterprise plan fallback must be true');

    // 5e: Non-boolean string 'true' in priority_support -> safe fallback to plan tier policy
    (pool as any).query = async (sql: string) => {
      if (sql.includes('FROM tenants t')) {
        return {
          rows: [
            {
              plan_id: 'starter',
              plan_name: 'Starter Plan',
              features: JSON.stringify({ priority_support: 'true' }), // string, not boolean
            },
          ],
        };
      }
      return { rows: [] };
    };
    const reqString = createMockReq({ tenant: { id: 't-starter-string' } });
    await loadEntitlements()(reqString, createMockRes(), () => {});
    assert.strictEqual(reqString.entitlements?.prioritySupport, false, 'Non-boolean value must follow plan-tier fallback');
  });

  // =========================================================================
  // 6. Client-supplied plan names or feature flags cannot grant priority entitlement
  // =========================================================================
  it('6. Client-supplied plan names or feature flags cannot grant priority entitlement', async () => {
    const req = createMockReq({
      user: { userId: 'u-starter', tenantId: 't-starter' },
      tenant: { id: 't-starter', slug: 'starter-tenant' },
      entitlements: {
        planId: 'starter',
        planName: 'Starter',
        tokenLimit: 1000000,
        storageLimitGb: 10,
        imageLimitMonthly: 20,
        features: { priority_support: false },
        prioritySupport: false,
        webhookLogging: false,
        apiAccess: true,
        auditTrail: false,
        ragDocumentsLimit: 500,
        isTrial: false,
        trialEndsAt: null,
      },
    });

    (pool as any).query = async (sql: string) => {
      if (sql.includes('FROM users WHERE id = $1')) {
        return { rows: [{ tenant_id: 't-starter', role: 'member', email: 'starter@example.com' }] };
      }
      if (sql.includes('INSERT INTO support_tickets')) {
        return { rows: [] };
      }
      return { rows: [] };
    };

    const app = express();
    app.use(express.json());
    app.use((r: any, _res, n) => {
      r.user = req.user;
      r.tenant = req.tenant;
      r.entitlements = req.entitlements;
      n();
    });
    app.use('/api/user', userRouter);

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    try {
      // Client maliciously supplies priority: 'priority', isPriority: true, plan: 'enterprise'
      const response = await fetch(`http://127.0.0.1:${port}/api/user/support/ticket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-plan': 'enterprise',
          'x-priority': 'true',
        },
        body: JSON.stringify({
          subject: 'Self-escalated request',
          message: 'Trying to gain priority support',
          priority: 'priority',
          isPriority: true,
          is_priority: true,
          plan: 'enterprise',
        }),
      });

      assert.strictEqual(response.status, 201);
      const data: any = await response.json();
      assert.strictEqual(data.ticket.priority, 'standard', 'Server must ignore client priority parameter');
      assert.strictEqual(data.ticket.isPriority, false, 'Server must ignore client isPriority parameter');
    } finally {
      await closeServer(server);
    }
  });

  // =========================================================================
  // 7. Tenant A cannot read or modify Tenant B's support requests
  // =========================================================================
  it("7. Tenant A cannot read or modify Tenant B's support requests", async () => {
    const tenantATickets = [
      { id: 'tick-a1', tenant_id: 't-a', subject: 'Tenant A inquiry', message: 'Hello from A', priority: 'standard', is_priority: false },
    ];
    const tenantBTickets = [
      { id: 'tick-b1', tenant_id: 't-b', subject: 'Tenant B private issue', message: 'Secret B data', priority: 'priority', is_priority: true },
    ];

    (pool as any).query = async (sql: string, params?: any[]) => {
      if (sql.includes('FROM users WHERE id = $1')) {
        return { rows: [{ tenant_id: 't-a', role: 'member' }] };
      }
      if (sql.includes('SELECT * FROM support_tickets WHERE tenant_id = $1')) {
        if (params?.[0] === 't-a') return { rows: tenantATickets };
        if (params?.[0] === 't-b') return { rows: tenantBTickets };
      }
      if (sql.includes('SELECT * FROM support_tickets WHERE id = $1') || sql.includes('SELECT id, tenant_id')) {
        if (params?.[0] === 'tick-b1') return { rows: tenantBTickets };
        if (params?.[0] === 'tick-a1') return { rows: tenantATickets };
      }
      return { rows: [] };
    };

    const app = express();
    app.use(express.json());
    app.use((r: any, _res, n) => {
      r.user = { userId: 'u-tenant-a', tenantId: 't-a', role: 'member' };
      r.tenant = { id: 't-a', slug: 'tenant-a' };
      r.entitlements = { prioritySupport: true, planId: 'professional' };
      n();
    });
    app.use('/api/user', userRouter);

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    try {
      // 7a: Tenant A lists tickets -> only receives Tenant A's tickets
      const listRes = await fetch(`http://127.0.0.1:${port}/api/user/support/tickets`);
      assert.strictEqual(listRes.status, 200);
      const listData: any = await listRes.json();
      assert.strictEqual(listData.tickets.length, 1);
      assert.strictEqual(listData.tickets[0].id, 'tick-a1');
      assert.strictEqual(listData.tickets[0].tenant_id, 't-a');

      // 7b: Tenant A tries to modify Tenant B's ticket -> 403 Forbidden
      const patchRes = await fetch(`http://127.0.0.1:${port}/api/user/support/tickets/tick-b1`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Tampered by Tenant A' }),
      });
      assert.strictEqual(patchRes.status, 403, 'Must return 403 when updating another tenant ticket');

      // 7c: Tenant A tries to escalate Tenant B's ticket -> 403 Forbidden
      const escRes = await fetch(`http://127.0.0.1:${port}/api/user/support/priority-escalate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: 'tick-b1', reason: 'Cross-tenant escalate' }),
      });
      assert.strictEqual(escRes.status, 403, 'Must return 403 when escalating another tenant ticket');
    } finally {
      await closeServer(server);
    }
  });

  // =========================================================================
  // 8. Unauthorized users cannot set or change priority fields
  // =========================================================================
  it('8. Unauthorized users cannot set or change priority fields', async () => {
    const existingTicket = {
      id: 'tick-user1',
      tenant_id: 't-user',
      subject: 'My ticket',
      message: 'Original message',
      priority: 'standard',
      is_priority: false,
      status: 'open',
    };

    (pool as any).query = async (sql: string, params?: any[]) => {
      if (sql.includes('FROM users WHERE id = $1')) {
        return { rows: [{ tenant_id: 't-user', role: 'member' }] };
      }
      if (sql.includes('SELECT * FROM support_tickets WHERE id = $1')) {
        return { rows: [existingTicket] };
      }
      return { rows: [] };
    };

    const app = express();
    app.use(express.json());
    app.use((r: any, _res, n) => {
      r.user = { userId: 'u-reg', tenantId: 't-user', role: 'member' };
      r.tenant = { id: 't-user', slug: 'user-tenant' };
      r.entitlements = { prioritySupport: false, planId: 'starter' };
      n();
    });
    app.use('/api/user', userRouter);

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/user/support/tickets/tick-user1`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: 'priority', is_priority: true }),
      });

      assert.strictEqual(response.status, 403);
      const data: any = await response.json();
      assert.strictEqual(data.code, 'UNAUTHORIZED_PRIORITY_CHANGE');
    } finally {
      await closeServer(server);
    }
  });

  // =========================================================================
  // 9. Administrator support access and existing authorization remain intact
  // =========================================================================
  it('9. Administrator support access and existing authorization remain intact', async () => {
    const allTickets = [
      { id: 'tick-1', tenant_id: 't-1', priority: 'standard', is_priority: false },
      { id: 'tick-2', tenant_id: 't-2', priority: 'priority', is_priority: true },
    ];

    (pool as any).query = async (sql: string, params?: any[]) => {
      if (sql.includes('FROM users WHERE id = $1')) {
        return { rows: [{ tenant_id: 't-admin', role: 'admin' }] };
      }
      if (sql.includes('SELECT * FROM support_tickets WHERE is_priority = true')) {
        return { rows: allTickets.filter((t) => t.is_priority) };
      }
      if (sql.includes('SELECT * FROM support_tickets ORDER BY created_at DESC')) {
        return { rows: allTickets };
      }
      if (sql.includes('SELECT * FROM support_tickets WHERE id = $1')) {
        return { rows: [allTickets[0]] };
      }
      if (sql.includes('UPDATE support_tickets')) {
        return { rows: [] };
      }
      return { rows: [] };
    };

    const app = express();
    app.use(express.json());
    app.use((r: any, _res, n) => {
      r.user = { userId: 'u-superadmin', tenantId: 't-admin', role: 'admin' };
      r.tenant = { id: 't-admin', slug: 'system' };
      r.entitlements = { prioritySupport: true, planId: 'enterprise' };
      n();
    });
    app.use('/api/user', userRouter);

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    try {
      // 9a: Admin can list all tickets across tenants
      const allRes = await fetch(`http://127.0.0.1:${port}/api/user/support/tickets?all=true`);
      assert.strictEqual(allRes.status, 200);
      const allData: any = await allRes.json();
      assert.strictEqual(allData.tickets.length, 2);

      // 9b: Admin can filter by priority queue
      const prioRes = await fetch(`http://127.0.0.1:${port}/api/user/support/tickets?all=true&priority=priority`);
      assert.strictEqual(prioRes.status, 200);
      const prioData: any = await prioRes.json();
      assert.strictEqual(prioData.tickets.length, 1);
      assert.strictEqual(prioData.tickets[0].id, 'tick-2');

      // 9c: Admin can update priority fields
      const patchRes = await fetch(`http://127.0.0.1:${port}/api/user/support/tickets/tick-1`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: 'priority', is_priority: true }),
      });
      assert.strictEqual(patchRes.status, 200);
      const patchData: any = await patchRes.json();
      assert.strictEqual(patchData.ticket.priority, 'priority');
      assert.strictEqual(patchData.ticket.isPriority, true);

      // 9d: Internal service bypass
      const intReq = createMockReq({ user: { isInternal: true } });
      const intRes = createMockRes();
      let intNext = false;
      requirePrioritySupport(intReq, intRes, () => {
        intNext = true;
      });
      assert.strictEqual(intNext, true, 'Internal service must bypass requirePrioritySupport');
    } finally {
      await closeServer(server);
    }
  });

  // =========================================================================
  // 10. Existing support creation and notification flows continue working
  // =========================================================================
  it('10. Existing support creation and notification flows continue working', async () => {
    (pool as any).query = async (sql: string) => {
      if (sql.includes('FROM users WHERE id = $1')) {
        return { rows: [{ tenant_id: 't-reg', role: 'member', email: 'user@example.com' }] };
      }
      if (sql.includes('INSERT INTO support_tickets')) {
        return { rows: [] };
      }
      return { rows: [] };
    };

    const app = express();
    app.use(express.json());
    app.use((r: any, _res, n) => {
      r.user = { userId: 'u-reg', tenantId: 't-reg', role: 'member' };
      r.tenant = { id: 't-reg', slug: 'reg' };
      r.entitlements = { prioritySupport: false, planId: 'free' };
      n();
    });
    app.use('/api/user', userRouter);

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/user/support/ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: 'Documentation link broken',
          message: 'The link to docs returned a 404.',
          category: 'general',
        }),
      });

      assert.strictEqual(response.status, 201);
      const data: any = await response.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.ticket.subject, 'Documentation link broken');
      assert.strictEqual(data.ticket.category, 'general');
      assert.strictEqual(data.ticket.status, 'open');
      assert.ok(data.ticket.id);
    } finally {
      await closeServer(server);
    }
  });

  // =========================================================================
  // 11. No unimplemented SLA or escalation behavior is presented as operational
  // =========================================================================
  it('11. No unimplemented SLA or escalation behavior is presented as operational', async () => {
    const app = express();
    app.use(express.json());
    app.use((r: any, _res, n) => {
      r.user = { userId: 'u-pro', tenantId: 't-pro', role: 'member' };
      r.tenant = { id: 't-pro', slug: 'pro' };
      r.entitlements = { prioritySupport: true, planId: 'professional' };
      n();
    });
    app.use('/api/user', userRouter);

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/user/support/status`);
      assert.strictEqual(response.status, 200);
      const data: any = await response.json();

      assert.strictEqual(data.sla, null, 'Must not claim guaranteed SLA');
      assert.strictEqual(data.guaranteedResponseTime, null, 'Must not claim guaranteed response time');
      assert.strictEqual(data.prioritySupport, true);
      assert.strictEqual(data.supportTier, 'priority');
      assert.ok(!data.description.includes('24/7'), 'Must not claim 24/7 support');
      assert.ok(!data.description.includes('dedicated account manager'), 'Must not claim dedicated account manager');
    } finally {
      await closeServer(server);
    }
  });

  // =========================================================================
  // 12. Regression tests for Fixes 1–4 remain functional
  // =========================================================================
  it('12. Regression tests for Fixes 1-4 (api_access, rag_documents, audit_trail, webhook_logging) remain functional', async () => {
    // 12a: Fix 1 api_access
    const reqApiDisabled = createMockReq({
      user: { userId: 'u-free' },
      entitlements: { apiAccess: false, planId: 'free' },
    });
    const resApi = createMockRes();
    requireApiAccess(reqApiDisabled, resApi, () => {});
    assert.strictEqual(resApi.getStatusCode(), 403);
    assert.strictEqual(resApi.getBody()?.feature, 'api_access');

    // 12b: Fix 3 audit_trail
    const reqAuditDisabled = createMockReq({
      user: { userId: 'u-starter' },
      entitlements: { auditTrail: false, planId: 'starter' },
    });
    const resAudit = createMockRes();
    requireAuditTrail(reqAuditDisabled, resAudit, () => {});
    assert.strictEqual(resAudit.getStatusCode(), 403);
    assert.strictEqual(resAudit.getBody()?.feature, 'audit_trail');

    // 12c: Fix 4 webhook_logging
    const reqWebhookDisabled = createMockReq({
      user: { userId: 'u-starter' },
      entitlements: { webhookLogging: false, planId: 'starter' },
    });
    const resWebhook = createMockRes();
    requireWebhookLogging(reqWebhookDisabled, resWebhook, () => {});
    assert.strictEqual(resWebhook.getStatusCode(), 403);
    assert.strictEqual(resWebhook.getBody()?.feature, 'webhook_logging');

    // 12d: Verify that loadEntitlements populates all 5 feature entitlements simultaneously
    (pool as any).query = async (sql: string) => {
      if (sql.includes('FROM tenants t')) {
        return {
          rows: [
            {
              plan_id: 'professional',
              plan_name: 'Professional Plan',
              token_limit: 5000000,
              storage_limit_gb: 100,
              image_limit_monthly: 50,
              features: JSON.stringify({
                api_access: true,
                rag_documents: 50000,
                audit_trail: true,
                webhook_logging: true,
                priority_support: true,
              }),
            },
          ],
        };
      }
      return { rows: [] };
    };

    const reqAll = createMockReq({ tenant: { id: 't-pro-all' } });
    await loadEntitlements()(reqAll, createMockRes(), () => {});
    const ent = reqAll.entitlements;
    assert.ok(ent, 'Entitlements must be defined');
    assert.strictEqual(ent.apiAccess, true, 'Fix 1 apiAccess must be true');
    assert.strictEqual(ent.ragDocumentsLimit, 50000, 'Fix 2 ragDocumentsLimit must be 50000');
    assert.strictEqual(ent.auditTrail, true, 'Fix 3 auditTrail must be true');
    assert.strictEqual(ent.webhookLogging, true, 'Fix 4 webhookLogging must be true');
    assert.strictEqual(ent.prioritySupport, true, 'Fix 5 prioritySupport must be true');
  });
});
