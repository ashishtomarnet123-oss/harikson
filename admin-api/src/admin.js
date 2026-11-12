import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import logger from './utils/logger.js';
import { requestContext } from './utils/context.js';
import pool from './db.js';
import redis from './redis.js';
import { adminAuth } from './middleware/adminAuth.js';

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

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  logger.error('FATAL: JWT_SECRET not set or too short (min 32 characters)');
  process.exit(1);
}

// Re-exports for backward compatibility
export { default as pool } from './db.js';
export { sanitizeCsvCell } from './utils/csv.js';
export { validatePaymentKeyConfig, encryptText, decryptText } from './utils/paymentCrypto.js';

// Modular Sub-Routers
import authRouter from './routers/auth.router.js';
import usersRouter from './routers/users.router.js';
import billingRouter from './routers/billing.router.js';
import emailRouter from './routers/email.router.js';
import tenantsRouter from './routers/tenants.router.js';
import systemRouter from './routers/system.router.js';

// Domain Feature Routers
import agentsRouter from './routers/agents.js';
import analyticsRouter from './routers/analytics.js';
import operationsRouter from './routers/operations.js';
import privacyRouter from './routers/privacy.js';
import {
  router as integrationsRouter,
  startIntegrationWorkers,
} from './routers/integrations.js';

import { startEmailWorker, stopEmailWorker } from './services/emailQueue.js';

// Schema initialization validation
async function initDb() {
  logger.info('[DB] Schema managed via npm run migrate');
  try {
    const providers = await pool.query(
      'SELECT COUNT(*) FROM payment_providers WHERE is_active = true'
    );
    if (parseInt(providers.rows[0].count) === 0) {
      logger.warn(
        '⚠️ No active payment providers configured. Add Razorpay or Stripe merchant settings in Xarwiz Admin Panel.'
      );
    }
  } catch (err) {
    logger.warn('[DB] payment_providers table check failed (may not exist yet):', err.message);
  }
}

const app = express();
app.set('redis', redis);
const port = process.env.PORT || 4000;

const defaultOrigins = [
  'https://xarwiz.com',
  'https://www.xarwiz.com',
  'https://admin.xarwiz.com',
  'http://localhost:3002',
  'http://localhost:3018',
  'http://localhost:3028',
];

let allowedOrigins = defaultOrigins;
if (process.env.ALLOWED_ORIGINS) {
  allowedOrigins = process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
}

if (process.env.NODE_ENV === 'production') {
  allowedOrigins = allowedOrigins.filter(
    (o) => !o.includes('localhost') && !o.includes('127.0.0.1')
  );
}

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false,
    frameguard: {
      action: 'deny',
    },
  })
);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (process.env.NODE_ENV !== 'production') return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS policy violation'));
      }
    },
    credentials: true,
    exposedHeaders: ['x-request-id', 'X-Request-ID'],
  })
);

app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.use((req, res, next) => {
  if (req.url.startsWith('/v1/admin/')) {
    req.url = req.url.replace('/v1/admin/', '/admin/');
  } else if (req.url.startsWith('/admin/')) {
    res.setHeader('Deprecation', 'true');
    res.setHeader('Sunset', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString());
  }
  next();
});

// General rate limiter: 100 requests per minute per IP for admin endpoints
const rateLimitStore = new Map();
setInterval(() => rateLimitStore.clear(), 60000);
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') return next();
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  const count = (rateLimitStore.get(ip) || 0) + 1;
  rateLimitStore.set(ip, count);
  res.setHeader('X-RateLimit-Limit', '100');
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, 100 - count)));
  if (count > 100) {
    return res.status(429).json({ error: 'Too many requests. Please slow down.' });
  }
  next();
});

app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('x-request-id', req.id);
  requestContext.run({ req }, () => {
    next();
  });
});

// Custom request logger middleware with PII query redaction
app.use((req, res, next) => {
  const query = { ...req.query };
  const sensitiveKeys = ['password', 'token', 'refreshToken', 'apiKey', 'key', 'secret', 'email', 'phone'];
  for (const k of sensitiveKeys) {
    if (k in query) {
      query[k] = '[REDACTED]';
    }
  }
  logger.info({
    msg: `Incoming Request: ${req.method} ${req.path}`,
    method: req.method,
    path: req.path,
    query,
  });
  next();
});

// ────────────────────────────────────────────────────────────
// ROUTER MOUNTING
// ────────────────────────────────────────────────────────────

// 1. Authentication & Session Management
app.use(authRouter);

// 2. User & Credential Management
app.use(usersRouter);

// 3. Billing, Plans, Webhooks & Tax
app.use(billingRouter);

// 4. Email Telemetry, SMTP & Broadcasts
app.use(emailRouter);

// 5. Tenant Lifecycle, Widget Config & Legal Holds
app.use(tenantsRouter);

// 6. Domain-specific Feature Routers
app.use('/admin/agents', adminAuth, agentsRouter);
app.use(['/admin/analytics', '/v1/admin/analytics'], adminAuth, analyticsRouter);
app.use('/admin', adminAuth, operationsRouter);
app.use(['/admin/privacy', '/v1/admin/privacy'], adminAuth, privacyRouter);
app.use(
  '/admin/integrations',
  adminAuth,
  (req, _res, next) => {
    req.pool = pool;
    next();
  },
  integrationsRouter
);
app.use(
  '/admin/webhooks',
  adminAuth,
  (req, _res, next) => {
    req.pool = pool;
    next();
  },
  integrationsRouter
);

// 7. System, Metrics, vLLM, Logs & Voice Telemetry
app.use(systemRouter);

// 8. Service Health Check Endpoint
app.get('/health', async (req, res) => {
  let dbStatus = 'up';
  let dbLatency = 0;
  const dbStart = Date.now();
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      dbLatency = Date.now() - dbStart;
    } finally {
      client.release();
    }
  } catch (err) {
    dbStatus = 'down';
    logger.error('Database health check failed:', err.message);
  }

  let redisStatus = 'up';
  let redisLatency = 0;
  const rStart = Date.now();
  try {
    await redis.ping();
    redisLatency = Date.now() - rStart;
  } catch (err) {
    redisStatus = 'down';
    logger.error('Redis health check failed:', err.message);
  }

  const isHealthy = dbStatus === 'up' && redisStatus === 'up';
  const statusCode = isHealthy ? 200 : 503;

  res.status(statusCode).json({
    status: isHealthy ? 'healthy' : 'degraded',
    service: 'admin-api',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor(process.uptime()),
    database: {
      status: dbStatus,
      latency_ms: dbLatency,
    },
    redis: {
      status: redisStatus,
      latency_ms: redisLatency,
    },
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  logger.error(err, 'Unhandled Admin server error');
  res.status(500).json({ error: 'Internal Server Error' });
});

const server = app.listen(port, () => {
  logger.info(
    `⚡ [Admin Management API] Operational and listening on port ${port}`
  );
  startIntegrationWorkers(pool);
  startEmailWorker();
  initDb().catch((err) => logger.warn('[DB] initDb failed on startup:', err.message));
});

const gracefulShutdown = (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  stopEmailWorker();
  server.close(async () => {
    logger.info('HTTP server closed. Closing connection pools...');
    try {
      await pool.end();
      await redis.quit();
      logger.info('Connections closed. Exiting.');
      process.exit(0);
    } catch (err) {
      logger.error('Error during graceful shutdown:', err);
      process.exit(1);
    }
  });

  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
