import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { DockerService } from './services/docker.service.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5001;

app.use(cors({ origin: false }));
app.use(express.json({ limit: '100kb' }));

app.use((req, _res, next) => {
  const sanitizedPath = req.path.replace(/[\r\n]/g, '');
  console.log(`📡 [Orchestrator Audit] ${req.method} ${sanitizedPath} - Source IP: ${req.ip}`);
  next();
});

// Public health check
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Guard all operational endpoints with internal secret authentication (fail-closed)
app.use((req, res, next) => {
  if (req.path === '/health') return next();

  const expectedSecret = process.env.INTERNAL_API_SECRET;
  if (!expectedSecret || expectedSecret.trim().length < 32) {
    console.error('🚨 [Orchestrator Security] INTERNAL_API_SECRET is missing or insufficiently random (<32 chars)');
    return res.status(503).json({ error: 'Service Unavailable: Orchestrator secret misconfigured' });
  }

  const providedSecret =
    req.headers['x-internal-secret'] ||
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null);

  if (!providedSecret || providedSecret !== expectedSecret) {
    console.warn(`⚠️ [Orchestrator Security] Unauthorized access attempt to ${req.method} ${req.path} from IP ${req.ip}`);
    return res.status(403).json({ error: 'Forbidden: Valid x-internal-secret required' });
  }

  next();
});

// Validate all ':name' parameters to prevent traversal / command injection
app.param('name', (req, res, next, val) => {
  if (!/^[a-zA-Z0-9_-]{2,64}$/.test(val)) {
    return res.status(400).json({ error: 'Invalid resource name: Alphanumeric, hyphen, and underscore only (2-64 chars)' });
  }
  next();
});

// Instances Actions (by name)
app.post('/instances', async (req, res, next) => {
  try {
    const { name, plan, apps } = req.body;
    const result = await DockerService.createInstance(name, plan, apps);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

app.post('/instances/:name/stop', async (req, res, next) => {
  try {
    await DockerService.stopInstance(req.params.name);
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.post('/instances/:name/start', async (req, res, next) => {
  try {
    await DockerService.startInstance(req.params.name);
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.post('/instances/:name/restart', async (req, res, next) => {
  try {
    await DockerService.restartInstance(req.params.name);
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.delete('/instances/:name', async (req, res, next) => {
  try {
    await DockerService.removeInstance(req.params.name);
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.post('/instances/:name/scale', async (req, res, next) => {
  try {
    const { cpuLimit, memoryLimit } = req.body;
    await DockerService.scaleInstance(req.params.name, cpuLimit, memoryLimit);
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.get('/instances/:name/metrics', async (req, res, next) => {
  try {
    const result = await DockerService.getMetrics(req.params.name);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

app.get('/instances/:name/logs', async (req, res, next) => {
  try {
    const result = await DockerService.getLogs(req.params.name);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

// Tenants Actions
app.post('/tenants', async (req, res, next) => {
  try {
    const { name, plan, agentType } = req.body;
    const result = await DockerService.createTenantStack(name, plan, agentType);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

app.post('/tenants/:name/stop', async (req, res, next) => {
  try {
    await DockerService.stopTenantStack(req.params.name);
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.post('/tenants/:name/start', async (req, res, next) => {
  try {
    await DockerService.startTenantStack(req.params.name);
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.post('/tenants/:name/restart', async (req, res, next) => {
  try {
    await DockerService.restartTenantStack(req.params.name);
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.delete('/tenants/:name', async (req, res, next) => {
  try {
    await DockerService.destroyTenantStack(req.params.name);
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.get('/tenants/:name/metrics', async (req, res, next) => {
  try {
    const containerId = req.query.containerId as string;
    const result = await DockerService.getTenantMetrics(req.params.name, containerId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

// Error handler
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('[Orchestrator Error]', err);
  res.status(500).json({ error: String(err.message || err) });
});

app.listen(port, () => {
  console.log(`⚡ [Orchestrator] Service operational on port ${port}`);
});
