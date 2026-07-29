import { Router } from 'express';
import { pool, getCacheHitMetrics } from '../db/pool.js';
import { rotateDocumentKeys } from '../services/documentEncryptionService.js';
import { executeDatabaseCleanup } from '../services/cleanupService.js';
import logger from '../utils/logger.js';

const router = Router();

// Shared-secret guard for service-to-service calls from admin-api. This
// endpoint runs the same batched deletion logic the scheduler already runs
// on a cron — it must not be reachable by anything other than admin-api's
// own manual-trigger route, so it never uses cookie/JWT auth.
function requireInternalSecret(req: any, res: any, next: any) {
  const expected = process.env.INTERNAL_API_SECRET;
  if (!expected) {
    return res.status(503).json({ error: 'Internal API secret not configured on this service' });
  }
  const provided = req.headers['x-internal-secret'];
  if (provided !== expected) {
    return res.status(403).json({ error: 'Forbidden' });
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

// POST /api/admin/rotate-keys - Document encryption key rotation
router.post('/rotate-keys', async (req: any, res) => {
  if (!req.tenant) req.tenant = { id: '00000000-0000-0000-0000-000000000000', name: 'Neuravolt Default', slug: 'neuravolt', status: 'active' };

  try {
    const count = await rotateDocumentKeys(req.tenant.id);
    res.json({ success: true, rotatedCount: count });
  } catch (err: any) {
    logger.error('Document key rotation error:', err);
    res.status(500).json({ error: 'Failed to rotate document encryption keys' });
  }
});

// GET /api/admin/metrics - Redis & DB performance metrics
router.get('/metrics', (_req, res) => {
  const cacheMetrics = getCacheHitMetrics();
  res.json({
    cache: cacheMetrics,
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

export default router;
