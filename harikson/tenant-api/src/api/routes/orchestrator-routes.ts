import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { HariksonOrchestrator } from '../../services/agents/orchestrator.js';
import { metrics } from '../../observability/metrics.js';
import { requireAuth } from '../../middleware/auth.js';
import { WorkspaceSandbox } from '../../services/sandbox/workspace-sandbox.js';
import crypto from 'crypto';

const router = Router();

const executeTaskSchema = z.object({
  userRequest: z.string().min(1),
  workspacePath: z.string().min(1),
  conversationId: z.string().uuid().optional(),
});

// POST /agents/execute - Triggers agent orchestrator subtasks under authenticated sandbox
router.post('/execute', requireAuth, async (req: Request, res: Response) => {
  try {
    const check = executeTaskSchema.safeParse(req.body);
    if (!check.success) {
      return res.status(400).json({
        hariksonError:
          "Invalid payload parameters. 'userRequest' and 'workspacePath' are required.",
      });
    }

    const { userRequest, workspacePath, conversationId } = check.data;
    const tenantId =
      (req as any).user?.tenantId ||
      (req as any).tenant?.id;

    if (!tenantId) {
      return res
        .status(403)
        .json({ error: 'Access Denied: Missing tenant authorization context.' });
    }

    const activeConversationId =
      conversationId || '00000000-0000-0000-0000-000000000000';

    // Sandbox workspace path strictly within tenant directory
    const safeWorkspacePath = WorkspaceSandbox.getTenantWorkspace(
      tenantId,
      workspacePath
    );

    const result = await HariksonOrchestrator.executeTask(
      tenantId,
      activeConversationId,
      safeWorkspacePath,
      userRequest
    );

    return res.status(200).json({
      planId: result.planId,
      finalOutput: result.finalOutput,
      steps: result.steps,
      hariksonPlanId: result.planId,
      hariksonFinalOutput: result.finalOutput,
      hariksonSteps: result.steps,
    });
  } catch (error: any) {
    const safeMessage = error.message?.includes('Security Exception')
      ? error.message
      : 'Orchestrator execution error';
    return res.status(500).json({ hariksonError: safeMessage });
  }
});

// GET /metrics - Exposes Prometheus metrics output (protected: loopback or internal secret only)
router.get('/metrics', (req: Request, res: Response) => {
  const internalSecret = req.headers['x-internal-secret'] as string | undefined;
  const configuredSecret = process.env.INTERNAL_API_SECRET;

  const isInternalSecretValid =
    internalSecret &&
    configuredSecret &&
    configuredSecret.length >= 32 &&
    crypto.timingSafeEqual(
      Buffer.from(internalSecret),
      Buffer.from(configuredSecret)
    );

  const clientIp = (req.ip || req.socket.remoteAddress || '').replace(/^.*:/, '');
  const isLoopback = clientIp === '1' || clientIp === '127.0.0.1';

  if (!isInternalSecretValid && !isLoopback && !(req as any).user) {
    return res.status(401).json({ error: 'Unauthorized: Metrics access restricted' });
  }

  res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  return res.status(200).send(metrics.getPrometheusFormat());
});

export default router;
