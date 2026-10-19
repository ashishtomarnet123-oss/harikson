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
import userRouter, { checkSlaBreaches } from '../src/routes/user.routes.js';

try {
  redis.on('error', () => {});
  redis.disconnect();
} catch (_) {}

describe('Xarwiz Isolated Bug Fix 6: SLA Hours Plan Feature Enforcement Test Suite', () => {
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
  // 1. A ticket receives the correct configured SLA target at creation
  // =========================================================================
  it('1. A ticket receives the correct configured SLA target at creation (Starter=72h, Pro=12h, Ent=2h, Free=null)', async () => {
    let insertedTicket: any = null;
    (pool as any).query = async (sql: string, params?: any[]) => {
      if (sql.includes('FROM users WHERE id = $1')) {
        return { rows: [{ tenant_id: 't-pro', role: 'member', email: 'pro@example.com' }] };
      }
      if (sql.includes('INSERT INTO support_tickets')) {
        insertedTicket = {
          id: params?.[0],
          tenant_id: params?.[1],
          user_id: params?.[2],
          subject: params?.[3],
          sla_hours: params?.[8],
          first_response_due_at: params?.[9],
          sla_status: params?.[10],
        };
        return { rows: [] };
      }
      return { rows: [] };
    };

    const app = express();
    app.use(express.json());
    app.use((r: any, _res, n) => {
      r.user = { userId: 'u-pro', tenantId: 't-pro' };
      r.tenant = { id: 't-pro', slug: 'pro-tenant' };
      r.entitlements = {
        planId: 'professional',
        slaHours: 12,
        prioritySupport: true,
      };
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
        body: JSON.stringify({ subject: 'API timeout query', message: 'Experiencing slow queries' }),
      });

      assert.strictEqual(response.status, 201);
      const data: any = await response.json();
      assert.strictEqual(data.ticket.slaHours, 12, 'Pro plan ticket must have slaHours: 12');
      assert.strictEqual(data.ticket.slaStatus, 'within_sla');
      assert.ok(data.ticket.firstResponseDueAt, 'Must have a firstResponseDueAt timestamp');

      assert.strictEqual(insertedTicket.sla_hours, 12);
      assert.strictEqual(insertedTicket.sla_status, 'within_sla');
    } finally {
      await closeServer(server);
    }
  });

  // =========================================================================
  // 2. Deadline calculation is correct for supported target values
  // =========================================================================
  it('2. Deadline calculation is correct for supported target values (calendar hours from creation)', async () => {
    let calculatedDueAt: Date | null = null;
    (pool as any).query = async (sql: string, params?: any[]) => {
      if (sql.includes('FROM users WHERE id = $1')) {
        return { rows: [{ tenant_id: 't-ent', role: 'member' }] };
      }
      if (sql.includes('INSERT INTO support_tickets')) {
        calculatedDueAt = params?.[9];
        return { rows: [] };
      }
      return { rows: [] };
    };

    const app = express();
    app.use(express.json());
    app.use((r: any, _res, n) => {
      r.user = { userId: 'u-ent', tenantId: 't-ent' };
      r.tenant = { id: 't-ent', slug: 'ent' };
      r.entitlements = { planId: 'enterprise', slaHours: 2, prioritySupport: true };
      n();
    });
    app.use('/api/user', userRouter);

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    const beforeTime = Date.now();
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/user/support/ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: 'Critical outage', message: 'Cluster unresponsive' }),
      });
      const afterTime = Date.now();

      assert.strictEqual(response.status, 201);
      assert.ok(calculatedDueAt, 'Due at must be calculated');

      const expectedDueLow = beforeTime + 2 * 3600 * 1000;
      const expectedDueHigh = afterTime + 2 * 3600 * 1000;
      const actualDue = new Date(calculatedDueAt!).getTime();

      assert.ok(actualDue >= expectedDueLow && actualDue <= expectedDueHigh, 'Deadline must be exactly +2 hours');
    } finally {
      await closeServer(server);
    }
  });

  // =========================================================================
  // 3. Missing or malformed configuration follows the documented policy
  // =========================================================================
  it('3. Missing or malformed configuration follows documented fallback policy', async () => {
    // 3a: Enterprise plan with null features -> fallback 2 hours
    (pool as any).query = async (sql: string) => {
      if (sql.includes('FROM tenants t')) {
        return { rows: [{ plan_id: 'enterprise', plan_name: 'Enterprise', features: null }] };
      }
      return { rows: [] };
    };
    const reqEnt = createMockReq({ tenant: { id: 't-ent' } });
    await loadEntitlements()(reqEnt, createMockRes(), () => {});
    assert.strictEqual(reqEnt.entitlements?.slaHours, 2, 'Enterprise missing SLA must fallback to 2h');

    // 3b: Professional plan with malformed string -> fallback 12 hours
    (pool as any).query = async (sql: string) => {
      if (sql.includes('FROM tenants t')) {
        return { rows: [{ plan_id: 'professional', plan_name: 'Pro', features: JSON.stringify({ sla_hours: 'not-a-number' }) }] };
      }
      return { rows: [] };
    };
    const reqPro = createMockReq({ tenant: { id: 't-pro' } });
    await loadEntitlements()(reqPro, createMockRes(), () => {});
    assert.strictEqual(reqPro.entitlements?.slaHours, 12, 'Pro malformed SLA must fallback to 12h');

    // 3c: Starter plan with negative number -> fallback 72 hours
    (pool as any).query = async (sql: string) => {
      if (sql.includes('FROM tenants t')) {
        return { rows: [{ plan_id: 'starter', plan_name: 'Starter', features: JSON.stringify({ sla_hours: -10 }) }] };
      }
      return { rows: [] };
    };
    const reqStarter = createMockReq({ tenant: { id: 't-start' } });
    await loadEntitlements()(reqStarter, createMockRes(), () => {});
    assert.strictEqual(reqStarter.entitlements?.slaHours, 72, 'Starter negative SLA must fallback to 72h');

    // 3d: Free plan with empty features -> null (no SLA)
    (pool as any).query = async (sql: string) => {
      if (sql.includes('FROM tenants t')) {
        return { rows: [{ plan_id: 'free', plan_name: 'Free', features: '{}' }] };
      }
      return { rows: [] };
    };
    const reqFree = createMockReq({ tenant: { id: 't-free' } });
    await loadEntitlements()(reqFree, createMockRes(), () => {});
    assert.strictEqual(reqFree.entitlements?.slaHours, null, 'Free plan must have null SLA (no contractual SLA)');
  });

  // =========================================================================
  // 4. Explicit configured values are respected
  // =========================================================================
  it('4. Explicit configured values are respected (custom hours and 0 meaning no SLA)', async () => {
    // 4a: Explicit 24 hours on Pro plan
    (pool as any).query = async (sql: string) => {
      if (sql.includes('FROM tenants t')) {
        return { rows: [{ plan_id: 'professional', plan_name: 'Custom Pro', features: JSON.stringify({ sla_hours: 24 }) }] };
      }
      return { rows: [] };
    };
    const reqCustom = createMockReq({ tenant: { id: 't-custom' } });
    await loadEntitlements()(reqCustom, createMockRes(), () => {});
    assert.strictEqual(reqCustom.entitlements?.slaHours, 24, 'Explicit sla_hours: 24 must be respected');

    // 4b: Explicit 0 hours represents no SLA guarantee (null target)
    (pool as any).query = async (sql: string) => {
      if (sql.includes('FROM tenants t')) {
        return { rows: [{ plan_id: 'starter', plan_name: 'Starter No SLA', features: JSON.stringify({ sla_hours: 0 }) }] };
      }
      return { rows: [] };
    };
    const reqZero = createMockReq({ tenant: { id: 't-zero' } });
    await loadEntitlements()(reqZero, createMockRes(), () => {});
    assert.strictEqual(reqZero.entitlements?.slaHours, null, 'Explicit 0 hours must be interpreted as no SLA guarantee');
  });

  // =========================================================================
  // 5. A substantive response before the deadline is recorded correctly
  // =========================================================================
  it('5. A substantive response before the deadline is recorded correctly (sla_status: met)', async () => {
    const futureDue = new Date(Date.now() + 10 * 3600 * 1000); // due in 10 hours
    const mockTicket = {
      id: 'tick-before',
      tenant_id: 't-pro',
      user_id: 'u-user',
      subject: 'Latency question',
      message: 'Need help with latency',
      status: 'open',
      first_response_due_at: futureDue.toISOString(),
      first_responded_at: null,
      sla_status: 'within_sla',
    };

    (pool as any).query = async (sql: string, params?: any[]) => {
      if (sql.includes('FROM users WHERE id = $1')) {
        return { rows: [{ role: 'admin' }] };
      }
      if (sql.includes('SELECT * FROM support_tickets WHERE id = $1')) {
        return { rows: [mockTicket] };
      }
      if (sql.includes('UPDATE support_tickets')) {
        return {
          rows: [
            {
              ...mockTicket,
              first_responded_at: new Date().toISOString(),
              first_responder_id: 'u-admin',
              first_response_text: 'We have optimized your database indexing.',
              sla_status: 'met',
              status: 'in_progress',
            },
          ],
        };
      }
      return { rows: [] };
    };

    const app = express();
    app.use(express.json());
    app.use((r: any, _res, n) => {
      r.user = { userId: 'u-admin', role: 'admin' };
      n();
    });
    app.use('/api/user', userRouter);

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/user/support/tickets/tick-before/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'We have optimized your database indexing.' }),
      });

      assert.strictEqual(response.status, 200);
      const data: any = await response.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.slaStatus, 'met', 'Response before deadline must set sla_status: met');
      assert.strictEqual(data.ticket.sla_status, 'met');
      assert.ok(data.ticket.first_responded_at);
    } finally {
      await closeServer(server);
    }
  });

  // =========================================================================
  // 6. A response after the deadline is classified correctly
  // =========================================================================
  it('6. A response after the deadline is classified correctly (sla_status: breached)', async () => {
    const pastDue = new Date(Date.now() - 5 * 3600 * 1000); // overdue by 5 hours
    const mockTicket = {
      id: 'tick-after',
      tenant_id: 't-pro',
      user_id: 'u-user',
      subject: 'Old question',
      message: 'Still waiting',
      status: 'open',
      first_response_due_at: pastDue.toISOString(),
      first_responded_at: null,
      sla_status: 'breached',
    };

    (pool as any).query = async (sql: string, params?: any[]) => {
      if (sql.includes('FROM users WHERE id = $1')) {
        return { rows: [{ role: 'admin' }] };
      }
      if (sql.includes('SELECT * FROM support_tickets WHERE id = $1')) {
        return { rows: [mockTicket] };
      }
      if (sql.includes('UPDATE support_tickets')) {
        return {
          rows: [
            {
              ...mockTicket,
              first_responded_at: new Date().toISOString(),
              first_responder_id: 'u-admin',
              first_response_text: 'Apologies for the delay.',
              sla_status: 'breached',
              status: 'in_progress',
            },
          ],
        };
      }
      return { rows: [] };
    };

    const app = express();
    app.use(express.json());
    app.use((r: any, _res, n) => {
      r.user = { userId: 'u-admin', role: 'admin' };
      n();
    });
    app.use('/api/user', userRouter);

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/user/support/tickets/tick-after/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Apologies for the delay.' }),
      });

      assert.strictEqual(response.status, 200);
      const data: any = await response.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.slaStatus, 'breached', 'Response after deadline must set sla_status: breached');
    } finally {
      await closeServer(server);
    }
  });

  // =========================================================================
  // 7. Automated creation acknowledgments do not count as substantive first responses
  // =========================================================================
  it('7. Automated creation acknowledgments do not count as substantive first responses', async () => {
    (pool as any).query = async (sql: string) => {
      if (sql.includes('FROM users WHERE id = $1')) {
        return { rows: [{ tenant_id: 't-starter', role: 'member' }] };
      }
      if (sql.includes('INSERT INTO support_tickets')) {
        return { rows: [] };
      }
      return { rows: [] };
    };

    const app = express();
    app.use(express.json());
    app.use((r: any, _res, n) => {
      r.user = { userId: 'u-starter', tenantId: 't-starter' };
      r.tenant = { id: 't-starter' };
      r.entitlements = { planId: 'starter', slaHours: 72 };
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
        body: JSON.stringify({ subject: 'Ticket submission', message: 'Hello support' }),
      });

      assert.strictEqual(response.status, 201);
      const data: any = await response.json();
      assert.strictEqual(data.ticket.firstRespondedAt, null, 'firstRespondedAt must remain null upon ticket creation');
      assert.strictEqual(data.ticket.status, 'open', 'Ticket status must remain open');
    } finally {
      await closeServer(server);
    }
  });

  // =========================================================================
  // 8. Tenants cannot manipulate their own SLA targets, timestamps, or breach states
  // =========================================================================
  it('8. Tenants cannot manipulate their own SLA targets, timestamps, or breach states', async () => {
    (pool as any).query = async (sql: string) => {
      if (sql.includes('FROM users WHERE id = $1')) {
        return { rows: [{ tenant_id: 't-user', role: 'member' }] };
      }
      if (sql.includes('SELECT * FROM support_tickets WHERE id = $1')) {
        return {
          rows: [
            {
              id: 'tick-tamper',
              tenant_id: 't-user',
              subject: 'Test ticket',
              message: 'Original text',
              sla_hours: 72,
              first_response_due_at: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
              first_responded_at: null,
              sla_status: 'within_sla',
            },
          ],
        };
      }
      return { rows: [] };
    };

    const app = express();
    app.use(express.json());
    app.use((r: any, _res, n) => {
      r.user = { userId: 'u-user', tenantId: 't-user', role: 'member' };
      r.tenant = { id: 't-user' };
      r.entitlements = { planId: 'starter', slaHours: 72 };
      n();
    });
    app.use('/api/user', userRouter);

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    try {
      // 8a: User attempts to modify SLA target and status via PATCH
      const patchRes = await fetch(`http://127.0.0.1:${port}/api/user/support/tickets/tick-tamper`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sla_hours: 1,
          sla_status: 'met',
          first_responded_at: new Date().toISOString(),
        }),
      });

      assert.strictEqual(patchRes.status, 403, 'Must reject unauthorized SLA modification with 403');
      const patchData: any = await patchRes.json();
      assert.strictEqual(patchData.code, 'UNAUTHORIZED_SLA_CHANGE');
    } finally {
      await closeServer(server);
    }
  });

  // =========================================================================
  // 9. Cross-tenant ticket access remains blocked
  // =========================================================================
  it("9. Cross-tenant ticket access remains blocked (cannot read, respond, or modify)", async () => {
    const tenantBTicket = {
      id: 'tick-b',
      tenant_id: 't-b',
      subject: 'Tenant B issue',
      message: 'Private issue',
      sla_hours: 12,
    };

    (pool as any).query = async (sql: string, params?: any[]) => {
      if (sql.includes('FROM users WHERE id = $1')) {
        return { rows: [{ tenant_id: 't-a', role: 'member' }] };
      }
      if (sql.includes('SELECT * FROM support_tickets WHERE id = $1')) {
        return { rows: [tenantBTicket] };
      }
      return { rows: [] };
    };

    const app = express();
    app.use(express.json());
    app.use((r: any, _res, n) => {
      r.user = { userId: 'u-tenant-a', tenantId: 't-a', role: 'member' };
      r.tenant = { id: 't-a' };
      n();
    });
    app.use('/api/user', userRouter);

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    try {
      // 9a: Tenant A tries to read Tenant B's ticket
      const getRes = await fetch(`http://127.0.0.1:${port}/api/user/support/tickets/tick-b`);
      assert.strictEqual(getRes.status, 403, 'Tenant A cannot read Tenant B ticket');

      // 9b: Tenant A tries to patch Tenant B's ticket
      const patchRes = await fetch(`http://127.0.0.1:${port}/api/user/support/tickets/tick-b`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Illegal change' }),
      });
      assert.strictEqual(patchRes.status, 403, 'Tenant A cannot patch Tenant B ticket');
    } finally {
      await closeServer(server);
    }
  });

  // =========================================================================
  // 10. Unauthorized users cannot record support-agent responses
  // =========================================================================
  it('10. Unauthorized users cannot record support-agent responses (403 UNAUTHORIZED_AGENT_ACTION)', async () => {
    (pool as any).query = async (sql: string) => {
      if (sql.includes('FROM users WHERE id = $1')) {
        return { rows: [{ role: 'member' }] }; // Normal member, not an agent or admin
      }
      return { rows: [] };
    };

    const app = express();
    app.use(express.json());
    app.use((r: any, _res, n) => {
      r.user = { userId: 'u-regular', role: 'member' };
      n();
    });
    app.use('/api/user', userRouter);

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/user/support/tickets/tick-123/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'I am pretending to be support' }),
      });

      assert.strictEqual(response.status, 403);
      const data: any = await response.json();
      assert.strictEqual(data.code, 'UNAUTHORIZED_AGENT_ACTION');
    } finally {
      await closeServer(server);
    }
  });

  // =========================================================================
  // 11. Historical deadlines remain unchanged after a plan change
  // =========================================================================
  it('11. Historical deadlines remain unchanged after a tenant upgrades/downgrades plan', async () => {
    // Ticket was created under Starter plan (72h)
    const oldDeadline = new Date(Date.now() + 72 * 3600 * 1000).toISOString();
    const historicalTicket = {
      id: 'tick-historical',
      tenant_id: 't-upgraded',
      subject: 'Old Starter ticket',
      sla_hours: 72,
      first_response_due_at: oldDeadline,
      first_responded_at: null,
      sla_status: 'within_sla',
    };

    (pool as any).query = async (sql: string) => {
      if (sql.includes('FROM users WHERE id = $1')) {
        return { rows: [{ tenant_id: 't-upgraded', role: 'member' }] };
      }
      if (sql.includes('SELECT * FROM support_tickets WHERE id = $1')) {
        return { rows: [historicalTicket] };
      }
      return { rows: [] };
    };

    const app = express();
    app.use(express.json());
    app.use((r: any, _res, n) => {
      r.user = { userId: 'u-upgraded', tenantId: 't-upgraded', role: 'member' };
      r.tenant = { id: 't-upgraded' };
      // Tenant is now on Enterprise (2h)
      r.entitlements = { planId: 'enterprise', slaHours: 2, prioritySupport: true };
      n();
    });
    app.use('/api/user', userRouter);

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/user/support/tickets/tick-historical`);
      assert.strictEqual(response.status, 200);
      const data: any = await response.json();

      assert.strictEqual(data.ticket.sla_hours, 72, 'Historical ticket must retain original 72h target');
      assert.strictEqual(data.ticket.first_response_due_at, oldDeadline, 'Historical deadline must not be rewritten');
    } finally {
      await closeServer(server);
    }
  });

  // =========================================================================
  // 12. Concurrent responses do not create inconsistent first-response records
  // =========================================================================
  it('12. Concurrent responses do not create inconsistent first-response records', async () => {
    const originalDue = new Date(Date.now() + 10 * 3600 * 1000).toISOString();
    const existingTicket = {
      id: 'tick-race',
      tenant_id: 't-pro',
      subject: 'Race condition test',
      first_response_due_at: originalDue,
      first_responded_at: null,
      first_responder_id: null,
      first_response_text: null,
      sla_status: 'within_sla',
    };

    let firstSaved = false;
    (pool as any).query = async (sql: string, params?: any[]) => {
      if (sql.includes('FROM users WHERE id = $1')) {
        return { rows: [{ role: 'admin' }] };
      }
      if (sql.includes('SELECT * FROM support_tickets WHERE id = $1')) {
        return { rows: [existingTicket] };
      }
      if (sql.includes('UPDATE support_tickets')) {
        if (!firstSaved) {
          firstSaved = true;
          existingTicket.first_responded_at = '2026-10-19T07:00:00.000Z' as any;
          existingTicket.first_responder_id = params?.[1];
          existingTicket.first_response_text = params?.[2];
          existingTicket.sla_status = 'met';
        }
        return { rows: [existingTicket] };
      }
      return { rows: [] };
    };

    const app = express();
    app.use(express.json());
    app.use((r: any, _res, n) => {
      r.user = { userId: 'u-agent-1', role: 'admin' };
      n();
    });
    app.use('/api/user', userRouter);

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    try {
      // Send two concurrent responses
      const [res1, res2] = await Promise.all([
        fetch(`http://127.0.0.1:${port}/api/user/support/tickets/tick-race/respond`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'First agent response' }),
        }),
        fetch(`http://127.0.0.1:${port}/api/user/support/tickets/tick-race/respond`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Second concurrent response' }),
        }),
      ]);

      assert.strictEqual(res1.status, 200);
      assert.strictEqual(res2.status, 200);
      const data1: any = await res1.json();
      const data2: any = await res2.json();

      assert.strictEqual(data1.ticket.first_responded_at, data2.ticket.first_responded_at);
      assert.strictEqual(data1.ticket.first_response_text, 'First agent response');
      assert.strictEqual(data2.ticket.first_response_text, 'First agent response');
    } finally {
      await closeServer(server);
    }
  });

  // =========================================================================
  // 13. Breach-detection worker does not generate duplicate or false breach events
  // =========================================================================
  it('13. Breach-detection worker does not generate duplicate or false breach events', async () => {
    let updateExecuted = false;
    (pool as any).query = async (sql: string) => {
      if (sql.includes('UPDATE support_tickets') && sql.includes("sla_status = 'breached'")) {
        updateExecuted = true;
        return { rowCount: 3, rows: [{ id: '1' }, { id: '2' }, { id: '3' }] };
      }
      return { rows: [] };
    };

    const result = await checkSlaBreaches();
    assert.strictEqual(updateExecuted, true, 'checkSlaBreaches must execute update query');
    assert.strictEqual(result.breached, 3);
  });

  // =========================================================================
  // 14. Administrator authorization and existing ticket workflows remain intact
  // =========================================================================
  it('14. Administrator authorization and existing ticket workflows remain intact', async () => {
    (pool as any).query = async (sql: string, params?: any[]) => {
      if (sql.includes('FROM users WHERE id = $1')) {
        return { rows: [{ role: 'admin' }] };
      }
      if (sql.includes('SELECT * FROM support_tickets WHERE sla_status = $1')) {
        return { rows: [{ id: 'tick-breached-1', sla_status: 'breached' }] };
      }
      return { rows: [] };
    };

    const app = express();
    app.use(express.json());
    app.use((r: any, _res, n) => {
      r.user = { userId: 'u-admin', role: 'admin' };
      n();
    });
    app.use('/api/user', userRouter);

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/user/support/tickets?all=true&sla_status=breached`);
      assert.strictEqual(res.status, 200);
      const data: any = await res.json();
      assert.strictEqual(data.tickets.length, 1);
      assert.strictEqual(data.tickets[0].sla_status, 'breached');
    } finally {
      await closeServer(server);
    }
  });

  // =========================================================================
  // 15. Fixes 1–5 continue passing their regression tests
  // =========================================================================
  it('15. Fixes 1-5 (api_access, rag_documents, audit_trail, webhook_logging, priority_support) remain functional', async () => {
    // 15a: Fix 1 api_access
    const reqApiDisabled = createMockReq({
      user: { userId: 'u-free' },
      entitlements: { apiAccess: false, planId: 'free' },
    });
    const resApi = createMockRes();
    requireApiAccess(reqApiDisabled, resApi, () => {});
    assert.strictEqual(resApi.getStatusCode(), 403);
    assert.strictEqual(resApi.getBody()?.feature, 'api_access');

    // 15b: Fix 3 audit_trail
    const reqAuditDisabled = createMockReq({
      user: { userId: 'u-starter' },
      entitlements: { auditTrail: false, planId: 'starter' },
    });
    const resAudit = createMockRes();
    requireAuditTrail(reqAuditDisabled, resAudit, () => {});
    assert.strictEqual(resAudit.getStatusCode(), 403);
    assert.strictEqual(resAudit.getBody()?.feature, 'audit_trail');

    // 15c: Fix 4 webhook_logging
    const reqWebhookDisabled = createMockReq({
      user: { userId: 'u-starter' },
      entitlements: { webhookLogging: false, planId: 'starter' },
    });
    const resWebhook = createMockRes();
    requireWebhookLogging(reqWebhookDisabled, resWebhook, () => {});
    assert.strictEqual(resWebhook.getStatusCode(), 403);
    assert.strictEqual(resWebhook.getBody()?.feature, 'webhook_logging');

    // 15d: Fix 5 priority_support
    const reqPriorityDisabled = createMockReq({
      user: { userId: 'u-starter' },
      entitlements: { prioritySupport: false, planId: 'starter' },
    });
    const resPriority = createMockRes();
    requirePrioritySupport(reqPriorityDisabled, resPriority, () => {});
    assert.strictEqual(resPriority.getStatusCode(), 403);
    assert.strictEqual(resPriority.getBody()?.feature, 'priority_support');

    // 15e: Verify that loadEntitlements populates all 6 feature entitlements simultaneously
    (pool as any).query = async (sql: string) => {
      if (sql.includes('FROM tenants t')) {
        return {
          rows: [
            {
              plan_id: 'enterprise',
              plan_name: 'Enterprise Plan',
              token_limit: -1,
              storage_limit_gb: 1024,
              image_limit_monthly: 500,
              features: JSON.stringify({
                api_access: true,
                rag_documents: -1,
                audit_trail: true,
                webhook_logging: true,
                priority_support: true,
                sla_hours: 2,
              }),
            },
          ],
        };
      }
      return { rows: [] };
    };

    const reqAll = createMockReq({ tenant: { id: 't-ent-all' } });
    await loadEntitlements()(reqAll, createMockRes(), () => {});
    const ent = reqAll.entitlements;
    assert.ok(ent, 'Entitlements must be defined');
    assert.strictEqual(ent.apiAccess, true, 'Fix 1 apiAccess must be true');
    assert.strictEqual(ent.ragDocumentsLimit, -1, 'Fix 2 ragDocumentsLimit must be -1');
    assert.strictEqual(ent.auditTrail, true, 'Fix 3 auditTrail must be true');
    assert.strictEqual(ent.webhookLogging, true, 'Fix 4 webhookLogging must be true');
    assert.strictEqual(ent.prioritySupport, true, 'Fix 5 prioritySupport must be true');
    assert.strictEqual(ent.slaHours, 2, 'Fix 6 slaHours must be 2');
  });
});
