import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { DockerService } from './services/docker.service.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5001;

app.use(cors({ origin: '*' }));
app.use(express.json());

app.use((req, _res, next) => {
  console.log(`📡 [Orchestrator] ${req.method} ${req.path}`);
  next();
});

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
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
