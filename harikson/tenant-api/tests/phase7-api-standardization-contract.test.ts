if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';
}
if (!process.env.REDIS_URL) {
  process.env.REDIS_URL = 'redis://localhost:6379';
}

import { describe, it, after, afterEach } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import express from 'express';
import jwt from 'jsonwebtoken';
import { pool, redis } from '../src/db/pool.js';
import { parsePagination, buildPaginatedResponse } from '../src/utils/standardApi.js';
import agentRoutes from '../src/routes/agent.routes.js';
import workflowRoutes from '../src/routes/workflow.routes.js';
import notificationRoutes from '../src/routes/notification.routes.js';
import documentRoutes from '../src/routes/document.routes.js';
import searchRouter from '../src/api/routes/search.js';
import contextRouter from '../src/api/routes/context.js';
import toolsRouter from '../src/api/routes/tools.js';
import memoryRouter from '../src/api/routes/memory.js';
import indexerRouter from '../src/api/routes/indexer.js';
import orchestratorRouter from '../src/api/routes/orchestrator-routes.js';

const TEST_SECRET = '01234567890123456789012345678901';
process.env.JWT_SECRET = TEST_SECRET;

const tenantId = '11111111-1111-1111-1111-111111111111';
const userId = '22222222-2222-2222-2222-222222222222';

function generateToken(scopes: string[] = ['*'], isDeveloperKey = false) {
  return jwt.sign(
    {
      userId,
      tenantId,
      email: 'standardizer@xarwiz.com',
      role: 'admin',
      scopes,
      isDeveloperKey,
    },
    TEST_SECRET,
    { expiresIn: '1h' }
  );
}

function request(
  app: express.Express,
  method: string,
  path: string,
  headers: Record<string, string> = {},
  body?: any
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any; text: string }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const addr = server.address() as any;
      const port = addr.port;
      const payload = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined;

      const reqHeaders: Record<string, string> = { ...headers };
      if (payload && !reqHeaders['content-type']) {
        reqHeaders['content-type'] = 'application/json';
      }
      if (payload) {
        reqHeaders['content-length'] = Buffer.byteLength(payload).toString();
      }

      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path,
          method,
          headers: reqHeaders,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            server.close();
            let parsedBody = null;
            try {
              parsedBody = JSON.parse(data);
            } catch (_) {
              parsedBody = data;
            }
            resolve({
              status: res.statusCode || 200,
              headers: res.headers,
              body: parsedBody,
              text: data,
            });
          });
        }
      );

      req.on('error', (err) => {
        server.close();
        reject(err);
      });

      if (payload) {
        req.write(payload);
      }
      req.end();
    });
  });
}

function buildTestApp() {
  const app = express();
  app.use(express.json());

  // Inject dummy tenant context for routes that rely on tenant middleware
  app.use((req: any, _res, next) => {
    req.tenant = { id: tenantId, name: 'Acme Test Corp', plan: 'enterprise' };
    next();
  });

  // Dual-mount versioning parity
  app.use('/api/agents', agentRoutes);
  app.use('/api/v1/agents', agentRoutes);
  app.use('/api/workflows', workflowRoutes);
  app.use('/api/v1/workflows', workflowRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/v1/notifications', notificationRoutes);
  app.use('/api/documents', documentRoutes);
  app.use('/api/v1/documents', documentRoutes);

  // Legacy standardized sub-routers
  app.use('/api/search', searchRouter);
  app.use('/api/context', contextRouter);
  app.use('/api/tools', toolsRouter);
  app.use('/api/memory', memoryRouter);
  app.use('/api/indexer', indexerRouter);
  app.use('/api/orchestrator', orchestratorRouter);

  return app;
}

describe('Phase 7 — Complete API Standardization & Contract Verification', () => {
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

  // ─── 1. Standard API Utility Contracts ──────────────────────────────────────────
  it('1. standardApi Parser & Formatter: parsePagination and buildPaginatedResponse adhere to specification', () => {
    const mockReq1: any = { query: { page: '3', limit: '15' } };
    const p1 = parsePagination(mockReq1);
    assert.strictEqual(p1.page, 3);
    assert.strictEqual(p1.limit, 15);
    assert.strictEqual(p1.offset, 30);

    const mockReq2: any = { query: { offset: '40', limit: '20' } };
    const p2 = parsePagination(mockReq2);
    assert.strictEqual(p2.offset, 40);
    assert.strictEqual(p2.limit, 20);
    assert.strictEqual(p2.page, 3);

    const mockReq3: any = { query: { limit: '99999' } };
    const p3 = parsePagination(mockReq3, 20, 100);
    assert.strictEqual(p3.limit, 100); // Clamped to maxLimit

    const paginated = buildPaginatedResponse('items', [{ id: '1' }, { id: '2' }], 55, p1, { extraKey: 'val' });
    assert.strictEqual(paginated.total, 55);
    assert.strictEqual(paginated.page, 3);
    assert.strictEqual(paginated.limit, 15);
    assert.strictEqual(paginated.totalPages, 4);
    assert.strictEqual(paginated.hasMore, true);
    assert.strictEqual(paginated.items.length, 2);
    assert.strictEqual(paginated.extraKey, 'val');
  });

  // ─── 2. Standardized Legacy Error Envelopes ──────────────────────────────────
  it('2. Legacy Error Envelope Standardization: Search endpoint returns error, message, and legacy hariksonError', async () => {
    const app = buildTestApp();
    const token = generateToken(['chat:read']);

    const res = await request(app, 'POST', '/api/search', {
      authorization: `Bearer ${token}`,
    }, {}); // missing query

    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error);
    assert.ok(res.body.message);
    assert.ok(res.body.hariksonError);
    assert.strictEqual(res.body.error, res.body.hariksonError);
  });

  it('3. Legacy Context Error Envelope: returns standard error and backward compatible hariksonError', async () => {
    const app = buildTestApp();
    const token = generateToken(['chat:read']);

    const res = await request(app, 'POST', '/api/context/build', {
      authorization: `Bearer ${token}`,
    }, {}); // missing context params

    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error);
    assert.ok(res.body.message);
    assert.ok(res.body.hariksonError);
  });

  it('4. Legacy Tools Error Envelope: returns standard error and hariksonError on tool execution failure', async () => {
    const app = buildTestApp();
    const token = generateToken(['chat:write']);

    const res = await request(app, 'POST', '/api/tools/execute', {
      authorization: `Bearer ${token}`,
    }, { toolCalls: 'invalid-not-array' });

    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error);
    assert.ok(res.body.message);
    assert.ok(res.body.hariksonError);
  });

  it('5. Legacy Orchestrator Error Envelope: returns standard error and hariksonError when prompt is absent', async () => {
    const app = buildTestApp();
    const token = generateToken(['chat:write']);

    const res = await request(app, 'POST', '/api/orchestrator/execute', {
      authorization: `Bearer ${token}`,
    }, {}); // missing prompt

    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error);
    assert.ok(res.body.message);
    assert.ok(res.body.hariksonError);
  });

  // ─── 3. Standardized Pagination on Collections ──────────────────────────────
  it('6. Document Collection Pagination: GET /api/documents returns documents array and standard pagination meta', async () => {
    const app = buildTestApp();
    const token = generateToken(['documents:read']);

    (pool as any).connect = async () => ({
      query: async (q: string) => {
        if (q.includes('COUNT(*)')) {
          return { rows: [{ total: 42 }] };
        }
        return {
          rows: [
            { id: 'doc-1', filename: 'report.pdf', file_size: 1024, status: 'ready' },
            { id: 'doc-2', filename: 'invoice.pdf', file_size: 2048, status: 'ready' },
          ],
        };
      },
      release: () => {},
    });

    const res = await request(app, 'GET', '/api/documents?page=2&limit=10', {
      authorization: `Bearer ${token}`,
    });

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.documents));
    assert.strictEqual(res.body.total, 42);
    assert.strictEqual(res.body.page, 2);
    assert.strictEqual(res.body.limit, 10);
    assert.strictEqual(res.body.totalPages, 5);
    assert.strictEqual(res.body.hasMore, true);
  });

  it('7. Workflow Collection Pagination: GET /api/workflows returns workflows array and pagination meta', async () => {
    const app = buildTestApp();
    const token = generateToken(['workflows:read']);

    (pool as any).connect = async () => ({
      query: async (q: string) => {
        if (q.includes('COUNT(*)')) {
          return { rows: [{ total: 12 }] };
        }
        return {
          rows: [{ id: 'wf-1', name: 'Lead Enrichment Workflow', is_active: true }],
        };
      },
      release: () => {},
    });

    const res = await request(app, 'GET', '/api/workflows?page=1&limit=5', {
      authorization: `Bearer ${token}`,
    });

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.workflows));
    assert.strictEqual(res.body.total, 12);
    assert.strictEqual(res.body.page, 1);
    assert.strictEqual(res.body.limit, 5);
    assert.strictEqual(res.body.totalPages, 3);
    assert.strictEqual(res.body.hasMore, true);
  });

  it('8. Notification Collection: returns notifications array, dual unread counts (unreadCount, unread_count), and pagination', async () => {
    const app = buildTestApp();
    const token = generateToken(['notifications:read']);

    (pool as any).connect = async () => ({
      query: async (q: string) => {
        if (q.includes('unread')) {
          return { rows: [{ unread: 3 }] };
        }
        if (q.includes('COUNT(*)')) {
          return { rows: [{ total: 25 }] };
        }
        return {
          rows: [{ id: 'notif-1', title: 'Payment received', read: false, is_read: false }],
        };
      },
      release: () => {},
    });

    const res = await request(app, 'GET', '/api/notifications?page=1&limit=10', {
      authorization: `Bearer ${token}`,
    });

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.notifications));
    assert.strictEqual(res.body.unreadCount, 3);
    assert.strictEqual(res.body.unread_count, 3);
    assert.strictEqual(res.body.total, 25);
    assert.strictEqual(res.body.page, 1);
    assert.strictEqual(res.body.limit, 10);
    assert.strictEqual(res.body.totalPages, 3);
  });

  it('9. Agent Collection Pagination: GET /api/agents returns agents array and pagination meta', async () => {
    const app = buildTestApp();
    const token = generateToken(['chat:read']);

    (pool as any).connect = async () => ({
      query: async (q: string) => {
        if (q.includes('COUNT(*)')) {
          return { rows: [{ total: 8 }] };
        }
        return {
          rows: [
            { id: 'ag-1', name: 'Support Copilot', model: 'qwen3-coder', status: 'active' },
          ],
        };
      },
      release: () => {},
    });

    const res = await request(app, 'GET', '/api/agents?page=1&limit=5', {
      authorization: `Bearer ${token}`,
    });

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.agents));
    assert.strictEqual(res.body.total, 8);
    assert.strictEqual(res.body.page, 1);
    assert.strictEqual(res.body.limit, 5);
    assert.strictEqual(res.body.totalPages, 2);
  });

  // ─── 4. Dual-Mount Parity (/api/v1/... vs /api/...) ──────────────────────────
  it('10. Dual-Mount Versioning Parity: /api/agents and /api/v1/agents return matching contracts', async () => {
    const app = buildTestApp();
    const token = generateToken(['chat:read']);

    (pool as any).connect = async () => ({
      query: async (q: string) => {
        if (q.includes('COUNT(*)')) {
          return { rows: [{ total: 1 }] };
        }
        return {
          rows: [{ id: 'ag-test', name: 'Test Parity Agent', model: 'qwen3-coder' }],
        };
      },
      release: () => {},
    });

    const resUnversioned = await request(app, 'GET', '/api/agents', {
      authorization: `Bearer ${token}`,
    });
    const resVersioned = await request(app, 'GET', '/api/v1/agents', {
      authorization: `Bearer ${token}`,
    });

    assert.strictEqual(resUnversioned.status, 200);
    assert.strictEqual(resVersioned.status, 200);
    assert.deepStrictEqual(resUnversioned.body.agents, resVersioned.body.agents);
    assert.strictEqual(resUnversioned.body.total, resVersioned.body.total);
  });

  // ─── 5. Status Code Adherence (401, 403, 400) ───────────────────────────────
  it('11. Status Code Adherence: 401 on missing auth, 403 on scope mismatch, 400 on invalid mutation payload', async () => {
    const app = buildTestApp();

    // 401: Unauthenticated
    const res401 = await request(app, 'GET', '/api/agents');
    assert.strictEqual(res401.status, 401);
    assert.ok(res401.body.error);

    // 403: Missing required scope (API key mode)
    (pool as any).query = async (q: string) => {
      if (q.includes('tenant_api_keys')) {
        return {
          rows: [
            {
              id: 'key-1',
              tenant_id: tenantId,
              user_id: userId,
              scopes: ['documents:read'], // lacks chat:write
              status: 'active',
              resolved_tenant_id: tenantId,
              tenant_slug: 'test',
              tenant_plan: 'enterprise',
              tenant_status: 'active',
              plan_features: { api_access: true },
            },
          ],
        };
      }
      return { rows: [] };
    };

    const res403 = await request(app, 'POST', '/api/agents', {
      authorization: 'Bearer hk_live_test_readonly_key_123',
    }, { name: 'New Agent' });
    assert.strictEqual(res403.status, 403);
    assert.strictEqual(res403.body.code, 'INSUFFICIENT_SCOPES');

    // 400: Validation error on missing required field
    const writeToken = generateToken(['chat:write']);
    const res400 = await request(app, 'POST', '/api/agents', {
      authorization: `Bearer ${writeToken}`,
    }, { name: '' }); // invalid empty name
    assert.strictEqual(res400.status, 400);
    assert.strictEqual(res400.body.code, 'INVALID_REQUEST');
  });
});
