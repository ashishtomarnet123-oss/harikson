if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';
}
if (!process.env.REDIS_URL) {
  process.env.REDIS_URL = 'redis://localhost:6379';
}

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { requireAuth } from '../src/middleware/auth.js';
import { requireScopes } from '../src/middleware/scopeAuth.js';
import notificationRouter from '../src/routes/notification.routes.js';
import adminRouter from '../src/routes/admin.routes.js';
import pdfRouter from '../src/routes/pdf.routes.js';
import { pool, readPool, redis } from '../src/db/pool.js';

const TEST_SECRET = '01234567890123456789012345678901';
const TEST_INTERNAL_SECRET = 'internal-test-secret-min-32-chars-long!';
process.env.JWT_SECRET = TEST_SECRET;
process.env.INTERNAL_API_SECRET = TEST_INTERNAL_SECRET;

function createMockRes() {
  const res: any = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.body = data;
      return this;
    },
    send(data: any) {
      this.body = data;
      return this;
    },
    setHeader(name: string, value: string) {
      this.headers[name.toLowerCase()] = value;
      return this;
    },
    flushHeaders() {},
    end(data?: any) {
      if (data) this.body = data;
      return this;
    },
  };
  return res;
}

describe('Phase 2 — Backend Authentication & Authorization Test Suite', () => {
  after(() => {
    try {
      redis.disconnect();
    } catch (_) {}
    setTimeout(() => process.exit(0), 100);
  });

  const tenantA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const tenantB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const userA = '11111111-1111-1111-1111-111111111111';
  const userB = '22222222-2222-2222-2222-222222222222';

  // 1. Unauthenticated requests reject with 401
  it('1. Unauthenticated Rejection: protected endpoints reject unauthenticated requests with HTTP 401', () => {
    const req: any = { headers: {} };
    const res = createMockRes();
    let nextCalled = false;

    requireAuth(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 401);
    assert.ok(res.body?.error?.includes('Unauthorized'));
  });

  // 2. Invalid and expired JWT tokens reject with 401
  it('2. Invalid & Expired Token Rejection: malformed and expired JWTs return HTTP 401', () => {
    // Malformed token
    const reqInvalid: any = { headers: { authorization: 'Bearer this-is-not-a-valid-token' } };
    const resInvalid = createMockRes();
    let nextCalled = false;

    requireAuth(reqInvalid, resInvalid, () => {
      nextCalled = true;
    });
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(resInvalid.statusCode, 401);

    // Expired token
    const expiredToken = jwt.sign(
      { userId: userA, tenantId: tenantA },
      TEST_SECRET,
      { expiresIn: '-1s' }
    );
    const reqExpired: any = { headers: { authorization: `Bearer ${expiredToken}` } };
    const resExpired = createMockRes();
    nextCalled = false;

    requireAuth(reqExpired, resExpired, () => {
      nextCalled = true;
    });
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(resExpired.statusCode, 401);
  });

  // 3. Force-password-change token confinement
  it('3. Force-Password-Change Confinement: temporary password change tokens return HTTP 403 FORCE_PASSWORD_CHANGE_REQUIRED', () => {
    const tempToken = jwt.sign(
      { userId: userA, tenantId: tenantA, purpose: 'force_password_change' },
      TEST_SECRET,
      { expiresIn: '15m' }
    );
    const req: any = { headers: { authorization: `Bearer ${tempToken}` } };
    const res = createMockRes();
    let nextCalled = false;

    requireAuth(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body?.code, 'FORCE_PASSWORD_CHANGE_REQUIRED');
  });

  // 4. Cross-tenant header spoofing prevention
  it('4. Cross-Tenant Spoofing Prevention: client-supplied x-tenant-id mismatch returns HTTP 403 TENANT_MISMATCH', () => {
    const validTokenUserA = jwt.sign(
      { userId: userA, tenantId: tenantA, role: 'member' },
      TEST_SECRET,
      { expiresIn: '1h' }
    );

    // Caller presents User A's token, but request has Tenant B in pre-resolved tenant context (e.g. from x-tenant-id header)
    const req: any = {
      headers: {
        authorization: `Bearer ${validTokenUserA}`,
        'x-tenant-id': tenantB,
      },
      tenant: { id: tenantB },
    };
    const res = createMockRes();
    let nextCalled = false;

    requireAuth(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body?.code, 'TENANT_MISMATCH');
  });

  // 5. Valid session stamps verified identity and aligns tenant
  it('5. Identity Stamping: valid session sets req.user and populates req.tenant from verified claims', () => {
    const validToken = jwt.sign(
      { userId: userA, tenantId: tenantA, role: 'admin', email: 'user@tenant-a.com' },
      TEST_SECRET,
      { expiresIn: '1h' }
    );

    const req: any = {
      headers: {
        authorization: `Bearer ${validToken}`,
      },
    };
    const res = createMockRes();
    let nextCalled = false;

    requireAuth(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, true);
    assert.strictEqual(req.user?.userId, userA);
    assert.strictEqual(req.user?.tenantId, tenantA);
    assert.strictEqual(req.user?.authType, 'session');
    assert.strictEqual(req.user?.isDeveloperKey, false);
    assert.strictEqual(req.tenant?.id, tenantA);
  });

  // 6. ScopeAuth enforces exact scopes and rejects unauthorized API keys
  it('6. ScopeAuth Scoping: API key lacking required scope returns HTTP 403 INSUFFICIENT_SCOPES', () => {
    const apiKeyUser: any = {
      id: userA,
      isDeveloperKey: true,
      apiKeyId: 'key-123',
      scopes: ['chat:read'],
    };

    const req: any = {
      user: apiKeyUser,
      method: 'POST',
      url: '/api/v1/workflows',
    };
    const res = createMockRes();
    let nextCalled = false;

    const middleware = requireScopes('workflows:write');
    middleware(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body?.code, 'INSUFFICIENT_SCOPES');
    assert.deepStrictEqual(res.body?.requiredScopes, ['workflows:write']);
  });

  // 7. ScopeAuth allows wildcards (* and domain:*) and matching scopes
  it('7. ScopeAuth Wildcards & Matching: wildcard scopes and domain wildcards pass successfully', () => {
    // Exact match
    const reqExact: any = {
      user: { id: userA, isDeveloperKey: true, scopes: ['workflows:write'] },
      method: 'POST',
      url: '/api/v1/workflows',
    };
    let called = false;
    requireScopes('workflows:write')(reqExact, createMockRes(), () => { called = true; });
    assert.strictEqual(called, true);

    // Domain wildcard 'workflows:*'
    const reqDomainWildcard: any = {
      user: { id: userA, isDeveloperKey: true, scopes: ['workflows:*'] },
      method: 'POST',
      url: '/api/v1/workflows',
    };
    called = false;
    requireScopes('workflows:write')(reqDomainWildcard, createMockRes(), () => { called = true; });
    assert.strictEqual(called, true);

    // Global admin wildcard 'admin:*'
    const reqAdminWildcard: any = {
      user: { id: userA, isDeveloperKey: true, scopes: ['admin:*'] },
      method: 'DELETE',
      url: '/api/v1/workflows/wf-1',
    };
    called = false;
    requireScopes('workflows:write')(reqAdminWildcard, createMockRes(), () => { called = true; });
    assert.strictEqual(called, true);

    // Global wildcard '*'
    const reqStarWildcard: any = {
      user: { id: userA, isDeveloperKey: true, scopes: ['*'] },
      method: 'DELETE',
      url: '/api/v1/workflows/wf-1',
    };
    called = false;
    requireScopes('workflows:write')(reqStarWildcard, createMockRes(), () => { called = true; });
    assert.strictEqual(called, true);
  });

  // 8. Administrative Key Rotation and Internal Metrics Protection
  it('8. Internal Secret Verification: administrative routes reject missing or mismatched secret with timing-safe check', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/admin', adminRouter);

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    try {
      // 8a. GET /api/admin/metrics without secret -> 401
      const noSecretRes = await fetch(`http://127.0.0.1:${port}/api/admin/metrics`);
      assert.strictEqual(noSecretRes.status, 401);

      // 8b. GET /api/admin/metrics with wrong secret -> 403
      const badSecretRes = await fetch(`http://127.0.0.1:${port}/api/admin/metrics`, {
        headers: { 'x-internal-secret': 'wrong-secret-that-does-not-match-at-all!!' },
      });
      assert.strictEqual(badSecretRes.status, 403);

      // 8c. GET /api/admin/metrics with valid secret -> 200
      const validRes = await fetch(`http://127.0.0.1:${port}/api/admin/metrics`, {
        headers: { 'x-internal-secret': TEST_INTERNAL_SECRET },
      });
      assert.strictEqual(validRes.status, 200);
      const metricsData = await validRes.json();
      assert.strictEqual(metricsData.status, 'healthy');

      // 8d. POST /api/admin/rotate-keys without valid tenantId -> 400
      const badKeyRotateRes = await fetch(`http://127.0.0.1:${port}/api/admin/rotate-keys`, {
        method: 'POST',
        headers: {
          'x-internal-secret': TEST_INTERNAL_SECRET,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tenantId: 'not-a-uuid' }),
      });
      assert.strictEqual(badKeyRotateRes.status, 400);
    } finally {
      server.close();
    }
  });

  // 9. Notifications Route Protection & Multi-Tenant User Isolation
  it('9. Notifications Protection: notification endpoints enforce auth, scopes, and user/tenant isolation', async () => {
    let lastQuerySql = '';
    let lastQueryParams: any[] = [];

    const originalQuery = pool.query;
    const originalConnect = pool.connect;
    const originalReadConnect = (readPool as any).connect;

    (pool as any).query = async (sql: string, params?: any[]) => {
      lastQuerySql = sql;
      lastQueryParams = params || [];
      if (sql.includes('SELECT id, title, message')) {
        return {
          rows: [
            { id: 'notif-1', title: 'System Notice', message: 'Hello', read: false, is_read: false },
          ],
        };
      }
      if (sql.includes('COUNT(*)')) {
        return { rows: [{ unread: 1 }] };
      }
      if (sql.includes('UPDATE notifications') || sql.includes('DELETE FROM notifications')) {
        return { rows: [{ id: 'notif-1' }], rowCount: 1 };
      }
      return { rows: [] };
    };

    const mockClient = {
      query: async (sql: string, params?: any[]) => {
        if (sql.includes('SELECT 1')) {
          return { rows: [{ '?column?': 1 }] };
        }
        if (sql.includes('current_setting')) {
          return { rows: [{ tenant: '' }] };
        }
        if (sql.includes('set_config') || sql.includes('assert_tenant_context') || sql.includes('ROLLBACK')) {
          return { rows: [] };
        }
        return pool.query(sql, params);
      },
      release: () => {},
    };
    (pool as any).connect = async () => mockClient;
    (readPool as any).connect = async () => mockClient;

    const app = express();
    app.use(express.json());
    app.use('/api/notifications', notificationRouter);

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    try {
      // 9a. Unauthenticated GET /api/notifications -> 401
      const unauthRes = await fetch(`http://127.0.0.1:${port}/api/notifications`);
      assert.strictEqual(unauthRes.status, 401);

      // 9b. Authenticated GET /api/notifications -> 200 with tenant & user scoped query
      const validToken = jwt.sign(
        { userId: userA, tenantId: tenantA, role: 'member' },
        TEST_SECRET,
        { expiresIn: '1h' }
      );
      const authRes = await fetch(`http://127.0.0.1:${port}/api/notifications`, {
        headers: { authorization: `Bearer ${validToken}` },
      });
      assert.strictEqual(authRes.status, 200);
      assert.ok(lastQuerySql.includes('WHERE tenant_id = $1'));
      assert.strictEqual(lastQueryParams[0], tenantA);
      assert.strictEqual(lastQueryParams[1], userA);

      // 9c. Authenticated PUT /api/notifications/:id/read -> 200
      const readRes = await fetch(`http://127.0.0.1:${port}/api/notifications/notif-1/read`, {
        method: 'PUT',
        headers: { authorization: `Bearer ${validToken}` },
      });
      assert.strictEqual(readRes.status, 200);
      assert.ok(lastQuerySql.includes('UPDATE notifications'));
      assert.strictEqual(lastQueryParams[1], tenantA);
    } finally {
      (pool as any).query = originalQuery;
      pool.connect = originalConnect;
      (readPool as any).connect = originalReadConnect;
      server.close();
    }
  });

  // 10. PDF Download Sanitization & Scope Protection
  it('10. PDF Export & Download Protection: validates authorization scopes and rejects path traversal fileIds', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/pdf', pdfRouter);

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    try {
      // 10a. Unauthenticated PDF download -> 401
      const unauthRes = await fetch(`http://127.0.0.1:${port}/api/pdf/download/12345678-1234-1234-1234-123456789abc`);
      assert.strictEqual(unauthRes.status, 401);

      // 10b. Authenticated with path traversal attempt -> 400
      const validToken = jwt.sign(
        { userId: userA, tenantId: tenantA, role: 'member' },
        TEST_SECRET,
        { expiresIn: '1h' }
      );
      const traversalRes = await fetch(`http://127.0.0.1:${port}/api/pdf/download/..%2F..%2Fetc%2Fpasswd`, {
        headers: { authorization: `Bearer ${validToken}` },
      });
      assert.strictEqual(traversalRes.status, 400);
    } finally {
      server.close();
    }
  });
});
