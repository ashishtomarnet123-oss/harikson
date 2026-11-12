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
import { pool, redis } from '../src/db/pool.js';
import widgetRoutes from '../src/routes/widget.routes.js';
import privacyRoutes from '../src/routes/privacy.routes.js';
import notificationRoutes from '../src/routes/notification.routes.js';

describe('Phase 6 — Admin Panel, User Panel & Chat Widget Test Suite', () => {
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
              let parsed = null;
              try {
                parsed = JSON.parse(data);
              } catch (_) {
                parsed = null;
              }
              resolve({
                status: res.statusCode || 500,
                headers: res.headers,
                body: parsed,
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

  // 1. Embed script distribution
  it('1. GET /api/widget/embed.js delivers self-executing chat widget JS bundle', async () => {
    const app = express();
    app.use('/api/widget', widgetRoutes);

    const res = await request(app, 'GET', '/api/widget/embed.js');
    assert.strictEqual(res.status, 200);
    assert.match(res.headers['content-type'] || '', /javascript/);
    assert.ok(res.text.includes('XarwizWidget'), 'Must define XarwizWidget API');
    assert.ok(res.text.includes('xarwiz-widget-container'), 'Must include widget DOM container');
    assert.ok(res.text.includes('xarwiz-widget-btn'), 'Must include launcher button');
    assert.ok(res.text.includes('/api/widget/chat'), 'Must include chat POST endpoint call');
  });

  // 2. Backward-compatible script.js
  it('2. GET /api/widget/script.js delivers identical production widget bundle', async () => {
    const app = express();
    app.use('/api/widget', widgetRoutes);

    const res = await request(app, 'GET', '/api/widget/script.js');
    assert.strictEqual(res.status, 200);
    assert.match(res.headers['content-type'] || '', /javascript/);
    assert.ok(res.text.includes('XarwizWidget'), 'Must define XarwizWidget API');
    assert.ok(res.text.includes('xarwiz-widget-box'), 'Must include chat box modal');
  });

  // 3. Widget config retrieval for authorized tenant
  it('3. GET /api/widget/config returns custom tenant branding and greeting', async () => {
    const app = express();
    app.use('/api/widget', widgetRoutes);

    (pool.query as any) = async (sql: string, params: any[]) => {
      if (sql.includes('SELECT id, name, slug, widget_config, widget_allowed_origins FROM tenants')) {
        return {
          rows: [
            {
              id: '11111111-1111-1111-1111-111111111111',
              name: 'Acme Health',
              slug: 'acme-health',
              widget_allowed_origins: ['https://acmehealth.com', 'https://portal.acmehealth.com'],
              widget_config: {
                title: 'Acme Care Assistant',
                color: '#0284c7',
                greeting: 'Welcome to Acme Care! How can we help you?',
              },
            },
          ],
        };
      }
      return { rows: [] };
    };

    const res = await request(
      app,
      'GET',
      '/api/widget/config?key=acme-health',
      { Origin: 'https://acmehealth.com' }
    );

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.slug, 'acme-health');
    assert.strictEqual(res.body.config.title, 'Acme Care Assistant');
    assert.strictEqual(res.body.config.color, '#0284c7');
  });

  // 4. Widget origin restriction enforcement
  it('4. GET /api/widget/config enforces widget_allowed_origins and rejects unauthorized origin', async () => {
    const app = express();
    app.use('/api/widget', widgetRoutes);

    (pool.query as any) = async (sql: string, params: any[]) => {
      if (sql.includes('SELECT id, name, slug, widget_config, widget_allowed_origins FROM tenants')) {
        return {
          rows: [
            {
              id: '11111111-1111-1111-1111-111111111111',
              name: 'Acme Health',
              slug: 'acme-health',
              widget_allowed_origins: ['https://acmehealth.com'],
            },
          ],
        };
      }
      return { rows: [] };
    };

    const res = await request(
      app,
      'GET',
      '/api/widget/config?key=acme-health',
      { Origin: 'https://malicious-phishing.org' }
    );

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.error, 'WIDGET_ORIGIN_NOT_ALLOWED');
  });

  // 5. POST /api/widget/chat rejects unauthorized cross-origin execution
  it('5. POST /api/widget/chat rejects messages from unauthorized origins', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/widget', widgetRoutes);

    (pool.query as any) = async (sql: string, params: any[]) => {
      if (sql.includes('SELECT id, slug, widget_allowed_origins FROM tenants')) {
        return {
          rows: [
            {
              id: '11111111-1111-1111-1111-111111111111',
              slug: 'acme-health',
              widget_allowed_origins: ['https://acmehealth.com'],
            },
          ],
        };
      }
      return { rows: [] };
    };

    const res = await request(
      app,
      'POST',
      '/api/widget/chat',
      {
        'Content-Type': 'application/json',
        Origin: 'https://unauthorized-domain.com',
      },
      {
        tenantSlug: 'acme-health',
        message: 'Hello, what are your hours?',
      }
    );

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.error, 'WIDGET_ORIGIN_NOT_ALLOWED');
  });

  // 6. POST /api/widget/chat processes message for authorized origin
  it('6. POST /api/widget/chat accepts and processes message for authorized origin', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/widget', widgetRoutes);

    (pool.query as any) = async (sql: string, params: any[]) => {
      if (sql.includes('SELECT id, slug, widget_allowed_origins FROM tenants')) {
        return {
          rows: [
            {
              id: '11111111-1111-1111-1111-111111111111',
              slug: 'acme-health',
              widget_allowed_origins: ['https://acmehealth.com'],
            },
          ],
        };
      }
      return { rows: [] };
    };

    const res = await request(
      app,
      'POST',
      '/api/widget/chat',
      {
        'Content-Type': 'application/json',
        Origin: 'https://acmehealth.com',
      },
      {
        tenantSlug: 'acme-health',
        message: 'What are your clinic visiting hours?',
      }
    );

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(typeof res.body.response === 'string' && res.body.response.length > 0);
  });

  // 7. POST /api/widget/chat/stream supports SSE streaming
  it('7. POST /api/widget/chat/stream connects and streams SSE response', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/widget', widgetRoutes);

    (pool.query as any) = async (sql: string, params: any[]) => {
      if (sql.includes('SELECT id, slug, widget_allowed_origins FROM tenants')) {
        return {
          rows: [
            {
              id: '11111111-1111-1111-1111-111111111111',
              slug: 'acme-health',
              widget_allowed_origins: ['*'],
            },
          ],
        };
      }
      return { rows: [] };
    };

    const res = await request(
      app,
      'POST',
      '/api/widget/chat/stream',
      {
        'Content-Type': 'application/json',
      },
      {
        tenantSlug: 'acme-health',
        message: 'Can you stream an answer?',
      }
    );

    assert.strictEqual(res.status, 200);
    assert.match(res.headers['content-type'] || '', /text\/event-stream/);
    assert.ok(res.text.includes('event'), 'Must contain SSE events');
    assert.ok(res.text.includes('chunk') || res.text.includes('done'), 'Must include stream payload');
  });

  // 8. DPDP Grievance Registration
  it('8. POST /api/privacy/grievances registers DPDP grievance with Grievance Officer', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/privacy', privacyRoutes);

    (pool.query as any) = async (sql: string, params: any[]) => {
      if (sql.includes('INSERT INTO privacy_grievances')) {
        return {
          rows: [
            {
              id: '22222222-2222-2222-2222-222222222222',
              grievance_number: params[0],
              tenant_id: params[1],
              complainant_name: params[3],
              complainant_email: params[4],
              category: params[6],
              subject: params[7],
              status: 'registered',
              assigned_officer: 'Ashish Pratap Singh Tomar',
              created_at: new Date().toISOString(),
            },
          ],
        };
      }
      return { rows: [] };
    };

    const res = await request(
      app,
      'POST',
      '/api/privacy/grievances',
      { 'Content-Type': 'application/json' },
      {
        complainantName: 'Rohan Sharma',
        complainantEmail: 'rohan.sharma@example.com',
        category: 'consent_withdrawal',
        subject: 'Revocation of marketing consent',
        description: 'Please withdraw my marketing processing consent under DPDP Section 6.',
      }
    );

    assert.strictEqual(res.status, 201);
    assert.ok(res.body.grievanceNumber.startsWith('GRV-'), 'Must generate GRV reference');
    assert.strictEqual(res.body.assignedOfficer, 'Ashish Pratap Singh Tomar');
    assert.strictEqual(res.body.status, 'registered');
  });

  // 9. DPDP Grievance Status Tracking with Email Verification
  it('9. GET /api/privacy/grievances/:number returns grievance status when email matches', async () => {
    const app = express();
    app.use('/api/privacy', privacyRoutes);

    (pool.query as any) = async (sql: string, params: any[]) => {
      if (sql.includes('SELECT * FROM privacy_grievances WHERE grievance_number = $1')) {
        return {
          rows: [
            {
              id: '22222222-2222-2222-2222-222222222222',
              grievance_number: 'GRV-20261111-9876',
              complainant_name: 'Rohan Sharma',
              complainant_email: 'rohan.sharma@example.com',
              category: 'consent_withdrawal',
              subject: 'Revocation of marketing consent',
              status: 'under_investigation',
              assigned_officer: 'Ashish Pratap Singh Tomar',
              resolution_notes: 'Investigation initiated by Grievance Officer.',
              created_at: new Date().toISOString(),
              resolved_at: null,
            },
          ],
        };
      }
      return { rows: [] };
    };

    const res = await request(
      app,
      'GET',
      '/api/privacy/grievances/GRV-20261111-9876?email=rohan.sharma@example.com'
    );

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.grievance.grievance_number, 'GRV-20261111-9876');
    assert.strictEqual(res.body.grievance.status, 'under_investigation');
    assert.strictEqual(res.body.grievance.assigned_officer, 'Ashish Pratap Singh Tomar');
  });

  // 10. DPDP Grievance Status Privacy Guard (Rejects unverified or mismatch email)
  it('10. GET /api/privacy/grievances/:number returns 404 when email does not match complainant', async () => {
    const app = express();
    app.use('/api/privacy', privacyRoutes);

    (pool.query as any) = async (sql: string, params: any[]) => {
      if (sql.includes('SELECT * FROM privacy_grievances WHERE grievance_number = $1')) {
        // If email verification parameter does not match registered email, return 0 rows
        if (params && params[1] && params[1] !== 'rohan.sharma@example.com') {
          return { rows: [] };
        }
        return {
          rows: [
            {
              id: '22222222-2222-2222-2222-222222222222',
              grievance_number: 'GRV-20261111-9876',
              complainant_email: 'rohan.sharma@example.com',
            },
          ],
        };
      }
      return { rows: [] };
    };

    const res = await request(
      app,
      'GET',
      '/api/privacy/grievances/GRV-20261111-9876?email=imposter@phishing.com'
    );

    assert.strictEqual(res.status, 404);
    assert.ok(res.body.error.includes('email verification failed'));
  });

  // 11. Notification Unread Count Dual-Key Compatibility
  it('11. Notification endpoint returns both unreadCount and unread_count for cross-panel compatibility', async () => {
    const app = express();
    // Simulate authenticated middleware injecting req.tenant and req.user
    app.use((req: any, _res, next) => {
      req.tenant = { id: '11111111-1111-1111-1111-111111111111' };
      req.user = { userId: '33333333-3333-3333-3333-333333333333', id: '33333333-3333-3333-3333-333333333333' };
      req.userScopes = ['user:read', 'notifications:read'];
      next();
    });
    app.use('/api/notifications', notificationRoutes);

    (pool.connect as any) = async () => ({
      query: async (sql: string, params: any[]) => {
        if (sql.includes('COUNT(*)::int as unread')) {
          return { rows: [{ unread: 5 }] };
        }
        if (sql.includes('FROM notifications')) {
          return {
            rows: [
              { id: 'notif-1', title: 'System Alert', read: false, is_read: false },
              { id: 'notif-2', title: 'Plan Activated', read: false, is_read: false },
            ],
          };
        }
        return { rows: [] };
      },
      release: () => {},
    });

    const res = await request(app, 'GET', '/api/notifications');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.unreadCount, 5, 'Must provide unreadCount for user-portal');
    assert.strictEqual(res.body.unread_count, 5, 'Must provide unread_count for admin-panel');
    assert.strictEqual(res.body.notifications.length, 2);
  });
});
