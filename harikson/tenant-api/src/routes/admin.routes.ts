import { Router } from 'express';
import crypto from 'crypto';
import { pool, getCacheHitMetrics } from '../db/pool.js';
import { rotateDocumentKeys } from '../services/documentEncryptionService.js';
import { executeDatabaseCleanup } from '../services/cleanupService.js';
import logger from '../utils/logger.js';

const router = Router();

// Shared-secret guard for service-to-service calls from admin-api. This
// endpoint runs privileged administrative operations (cleanup, key rotation, metrics)
// and must never be reachable without timing-safe cryptographic verification.
function requireInternalSecret(req: any, res: any, next: any) {
  const expected = process.env.INTERNAL_API_SECRET;
  if (!expected || expected.length < 32) {
    return res.status(503).json({ error: 'Internal API secret not configured or too short' });
  }

  const provided = (req.headers['x-internal-secret'] as string) || '';
  if (!provided) {
    return res.status(401).json({ error: 'Unauthorized: Internal service secret required' });
  }

  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);

  if (
    providedBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(providedBuf, expectedBuf)
  ) {
    return res.status(403).json({ error: 'Forbidden: Invalid internal secret' });
  }

  next();
}

// POST /api/admin/cleanup - internal-only manual cleanup trigger, called by
// admin-api's POST /admin/cleanup. Runs the same executeDatabaseCleanup()
// the background scheduler already uses (workers/scheduler.ts), just forced
// to bypass the cron lock.
router.post('/cleanup', requireInternalSecret, async (_req, res) => {
  try {
    const result = await executeDatabaseCleanup(true);
    res.status(200).json({ success: true, deleted: result.deleted || {} });
  } catch (err: any) {
    logger.error('Manual cleanup execution error:', err);
    res.status(500).json({ error: 'Manual cleanup failed', message: err.message });
  }
});

// POST /api/admin/rotate-keys - Document encryption key rotation (internal service only)
router.post('/rotate-keys', requireInternalSecret, async (req: any, res) => {
  const tenantId = req.body?.tenantId || req.query?.tenantId || req.tenant?.id;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!tenantId || !isUuid.test(tenantId)) {
    return res.status(400).json({ error: 'Valid tenantId UUID required for key rotation' });
  }

  try {
    const count = await rotateDocumentKeys(tenantId);
    res.json({ success: true, rotatedCount: count });
  } catch (err: any) {
    logger.error('Document key rotation error:', err);
    res.status(500).json({ error: 'Failed to rotate document encryption keys' });
  }
});

// GET /api/admin/metrics - Redis & DB performance metrics (protected internal diagnostic)
router.get('/metrics', requireInternalSecret, (_req, res) => {
  const cacheMetrics = getCacheHitMetrics();
  res.json({
    cache: cacheMetrics,
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

export default router;
