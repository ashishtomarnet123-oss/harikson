declare global {
  namespace Express {
    interface Request {
      tenant?: any;
      user?: any;
      usePrimaryDb?: boolean;
      userId?: any;
      id?: string;
      rawBody?: Buffer;
    }
  }
}

import logger from './utils/logger.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { runMigrations } from './utils/migrate.js';
import { pool, checkDbHealth } from './db/pool.js';
import { validateMasterKeyConfig } from './services/documentEncryptionService.js';
import { HariksonScheduler } from './workers/scheduler.js';

// Import domain route modules
import { loadEntitlements } from './middleware/entitlements.js';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import chatRoutes from './routes/chat.routes.js';
import documentRoutes from './routes/document.routes.js';
import billingRoutes from './routes/billing.routes.js';
import agentRoutes from './routes/agent.routes.js';
import widgetRoutes from './routes/widget.routes.js';
import adminRoutes from './routes/admin.routes.js';
import integrationsRoutes from './routes/integrations.routes.js';
import workflowRoutes from './routes/workflow.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import voiceRoutes from './routes/voice.routes.js';

// Import existing API sub-routers
import chatRouter from './routes/chat.js';
import documentsRouter from './routes/documents.js';
import widgetRouter from './routes/widget.js';
import memoryRouter from './api/routes/memory.js';
import indexerRouter from './api/routes/indexer.js';
import searchRouter from './api/routes/search.js';
import contextRouter from './api/routes/context.js';
import toolsRouter from './api/routes/tools.js';
import orchestratorRouter from './api/routes/orchestrator-routes.js';

dotenv.config();

if (!process.env.JWT_SECRET) {
  const secretFile = process.env.JWT_SECRET_FILE || './secrets/jwt_secret';
  try {
    const secretPath = path.resolve(secretFile);
    if (fs.existsSync(secretPath)) {
      process.env.JWT_SECRET = fs.readFileSync(secretPath, 'utf8').trim();
    }
  } catch (err) {
    logger.warn(`Failed to read JWT_SECRET_FILE at ${secretFile}:`, err);
  }
}

validateMasterKeyConfig();

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  logger.error('FATAL: JWT_SECRET not set or too short (min 32 characters)');
  process.exit(1);
}

const app = express();
app.set('trust proxy', true);

// Request-level logging — first middleware in the chain, before body
// parsing or anything else that could throw, so every request that
// reaches this process gets a start marker and a completion/duration
// entry no matter what happens to it downstream. Added specifically
// to catch intermittent hangs/socket resets on POST /api/chat that
// otherwise leave zero trace in the logs (the request appears to die
// before any of our route-level code ever logs anything).
app.use((req, res, next) => {
  const start = Date.now();
  logger.info({ method: req.method, url: req.originalUrl }, `[REQ] ${req.method} ${req.originalUrl}`);
  res.on('finish', () => {
    logger.info(
      { method: req.method, url: req.originalUrl, status: res.statusCode, durationMs: Date.now() - start },
      `[RES] ${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`
    );
  });
  res.on('close', () => {
    if (!res.writableEnded) {
      logger.warn(
        { method: req.method, url: req.originalUrl, durationMs: Date.now() - start },
        `[CLOSED-EARLY] ${req.method} ${req.originalUrl} after ${Date.now() - start}ms — client or proxy disconnected before a response was sent`
      );
    }
  });
  next();
});

// Security and utility middleware stack
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      scriptSrc: ["'none'"],
      styleSrc: ["'none'"],
      imgSrc: ["'none'"],
      connectSrc: ["'self'"],
      fontSrc: ["'none'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'none'"],
    },
  },
}));
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
      : ['http://localhost:3002', 'http://localhost:3018', 'http://localhost:3028'],
    credentials: true,
  })
);
app.use(
  express.json({
    limit: '25mb',
    // Webhook signature verification (Stripe, Razorpay) needs the exact raw
    // bytes that were signed — express.json() only leaves the parsed object
    // on req.body, so stash the raw buffer here for those routes to use.
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Custom simple cookie parser middleware
app.use((req, _res, next) => {
  const cookieHeader = req.headers.cookie || '';
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach((cookie) => {
    const idx = cookie.indexOf('=');
    if (idx > 0) {
      const name = cookie.substring(0, idx).trim();
      const value = cookie.substring(idx + 1).trim();
      if (name) cookies[name] = value;
    }
  });
  (req as any).cookies = cookies;
  next();
});

// Middleware: Tenant context resolution from header, subdomain, or API key
app.use(async (req, res, next) => {
  try {
    const host = req.headers.host || '';
    const authHeader = req.headers.authorization || '';
    const tenantHeader = (req.headers['x-tenant-id'] as string) || (req.headers['x-tenant-slug'] as string) || '';

    let tenant: any = null;

    if (tenantHeader) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantHeader);
      const tenantRes = isUuid
        ? await pool.query('SELECT * FROM tenants WHERE id = $1 OR slug = $2', [tenantHeader, tenantHeader]).catch(() => ({ rows: [] }))
        : await pool.query('SELECT * FROM tenants WHERE slug = $1', [tenantHeader]).catch(() => ({ rows: [] }));
      tenant = tenantRes.rows[0];
    }
    
    if (!tenant && authHeader.startsWith('Bearer hk_live_')) {
      const apiKey = authHeader.substring(7);
      const keyRes = await pool.query(
        'SELECT t.* FROM tenants t JOIN tenant_api_keys k ON k.tenant_id = t.id WHERE k.key_prefix = $1 AND k.status = \'active\'',
        [apiKey.substring(0, 12)]
      ).catch(() => ({ rows: [] }));
      tenant = keyRes.rows[0];
    }
    
    if (!tenant) {
      const parts = host.split('.');
      if (parts.length > 2 && parts[0] !== 'app' && parts[0] !== 'api' && parts[0] !== 'www') {
        const slug = parts[0];
        const tenantRes = await pool.query('SELECT * FROM tenants WHERE slug = $1', [slug]).catch(() => ({ rows: [] }));
        tenant = tenantRes.rows[0];
      }
    }

    // Try resolving tenant from authenticated user's JWT if present (cookie or Bearer)
    if (!tenant) {
      const token =
        ((req as any).cookies?.hk_access_token as string) ||
        (authHeader.startsWith('Bearer ') && !authHeader.startsWith('Bearer hk_live_')
          ? authHeader.substring(7)
          : '');
      if (token && process.env.JWT_SECRET) {
        try {
          const decoded: any = jwt.verify(token, process.env.JWT_SECRET);
          if (decoded?.userId) {
            const userTenantRes = await pool.query(
              'SELECT t.* FROM tenants t JOIN users u ON u.tenant_id = t.id WHERE u.id = $1',
              [decoded.userId]
            ).catch(() => ({ rows: [] }));
            if (userTenantRes.rows.length > 0) {
              tenant = userTenantRes.rows[0];
            }
          }
        } catch (_) {}
      }
    }

    if (!tenant) {
      // Health/readiness probes must work without a tenant
      if (req.path === '/health' || req.path === '/ready') {
        return next();
      }

      // Public authentication and onboarding routes (login, register, email verification, password reset, unlock)
      // must work without an existing tenant (e.g. self-serve registration creating a new tenant, or bare-domain login)
      const isAuthRoute =
        req.path.startsWith('/api/auth') ||
        req.path.startsWith('/api/v1/auth') ||
        req.path.startsWith('/auth');
      if (isAuthRoute) {
        return next();
      }

      // Fallback for 'default' tenant slug to primary workspace
      if (tenantHeader === 'default') {
        const defaultTenantRes = await pool.query(
          "SELECT * FROM tenants WHERE slug = 'default' OR slug != 'system' ORDER BY created_at ASC LIMIT 1"
        ).catch(() => ({ rows: [] }));
        if (defaultTenantRes.rows.length > 0) {
          tenant = defaultTenantRes.rows[0];
        }
      }

      if (!tenant) {
        // Single-tenant fallback: if only one tenant exists, use it
        const fallbackRes = await pool.query('SELECT * FROM tenants LIMIT 2').catch(() => ({ rows: [] }));
        if (fallbackRes.rows.length === 1) {
          tenant = fallbackRes.rows[0];
        } else {
          return res.status(400).json({ error: 'Tenant not found. Provide a valid x-tenant-slug header, API key, or use a tenant subdomain.' });
        }
      }
    }

    req.tenant = tenant;
    next();
  } catch (err) {
    logger.error('Tenant resolution error:', err);
    return res.status(500).json({ error: 'Tenant resolution failed' });
  }
});

// Load plan entitlements onto req.entitlements for all routes
app.use(loadEntitlements());

// Register Domain Route Modules
app.use('/', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/v1/user', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/v1/documents', documentRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/v1/billing', billingRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/v1/agents', agentRoutes);
app.use('/api/widget', widgetRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/v1/integrations', integrationsRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/v1/workflows', workflowRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/v1/voice', voiceRoutes);
// Google's registered OAuth redirect_uri is .../api/v1/user/integrations/google/callback
// (set up before the /api/integrations prefix above existed) — mounted here
// too so that exact, already-registered URL keeps resolving correctly.
app.use('/api/user/integrations', integrationsRoutes);
app.use('/api/v1/user/integrations', integrationsRoutes);

// Register specialized sub-routers
app.use('/api/routes/chat', chatRouter);
app.use('/api/routes/documents', documentsRouter);
app.use('/api/routes/widget', widgetRouter);
app.use('/api/memory', memoryRouter);
app.use('/api/indexer', indexerRouter);
app.use('/api/search', searchRouter);
app.use('/api/context', contextRouter);
app.use('/api/tools', toolsRouter);
app.use('/api/orchestrator', orchestratorRouter);


// Global Error Handler Middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 3008;

async function startServer() {
  try {
    await runMigrations(pool);
    logger.info('Database migrations completed successfully.');

    // Initialize background worker scheduler
    try {
      await HariksonScheduler.startAll();
      logger.info('Xarwiz background scheduler initialized.');
      (app as any).schedulerHealthy = true;
    } catch (schedErr: any) {
      logger.error('Scheduler failed to start — background jobs will not run:', schedErr.message);
      (app as any).schedulerHealthy = false;
    }

    app.listen(PORT, () => {
      logger.info(`🚀 [Xarwiz Tenant API] Running on port ${PORT}`);
    });
  } catch (err: any) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();

export default app;
