import { Router } from 'express';
import { checkDbHealth } from '../db/pool.js';

const router = Router();

// GET /health - Basic application and DB health check
router.get('/health', async (_req, res) => {
  const dbHealthy = await checkDbHealth();
  if (!dbHealthy) {
    return res.status(503).json({ status: 'unhealthy', database: 'disconnected' });
  }
  res.json({ status: 'healthy', database: 'connected', timestamp: new Date().toISOString() });
});

// GET /health/liveness - Liveness probe
router.get('/health/liveness', (_req, res) => {
  res.status(200).json({ status: 'alive' });
});

// GET /health/readiness - Readiness probe checking DB connection
router.get('/health/readiness', async (_req, res) => {
  const dbHealthy = await checkDbHealth();
  if (dbHealthy) {
    return res.status(200).json({ status: 'ready' });
  }
  res.status(503).json({ status: 'not_ready' });
});

// GET /health/scheduler - Scheduler health check
router.get('/health/scheduler', (req, res) => {
  const healthy = (req.app as any).schedulerHealthy === true;
  const status = healthy ? 200 : 503;
  res.status(status).json({
    status: healthy ? 'active' : 'failed',
    scheduler: healthy ? 'running' : 'not_started',
  });
});

export default router;
