import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ToolExecutor } from '../../services/tools/executor.js';
import { requireAuth } from '../../middleware/auth.js';
import { WorkspaceSandbox } from '../../services/sandbox/workspace-sandbox.js';

const router = Router();

const executeToolsSchema = z.object({
  conversationId: z.string().uuid(),
  workspacePath: z.string().min(1),
  toolCalls: z.array(
    z.object({
      name: z.string(),
      params: z.any(),
    })
  ),
});

// POST /execute - Execute batch of tool calls sequentially under authenticated sandbox
router.post('/execute', requireAuth, async (req: Request, res: Response) => {
  try {
    const check = executeToolsSchema.safeParse(req.body);
    if (!check.success) {
      return res
        .status(400)
        .json({ hariksonError: 'Invalid payload parameters.' });
    }

    const { conversationId, workspacePath, toolCalls } = check.data;
    const tenantId =
      (req as any).user?.tenantId ||
      (req as any).tenant?.id;

    if (!tenantId) {
      return res
        .status(403)
        .json({ error: 'Access Denied: Missing tenant authorization context.' });
    }

    // Enforce workspace sandbox containment strictly within tenant directory
    const safeWorkspacePath = WorkspaceSandbox.getTenantWorkspace(
      tenantId,
      workspacePath
    );

    const results = await ToolExecutor.executeAll(
      tenantId,
      conversationId,
      safeWorkspacePath,
      toolCalls as any
    );

    return res.status(200).json({
      results,
      hariksonResults: results,
    });
  } catch (error: any) {
    const safeMessage = error.message?.includes('Security Exception')
      ? error.message
      : 'Tool execution encountered an error';
    return res.status(500).json({ hariksonError: safeMessage });
  }
});

export default router;
