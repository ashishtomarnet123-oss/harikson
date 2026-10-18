import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ContextBuilder } from '../../services/context/context-builder.js';
import { requireAuth } from '../../middleware/auth.js';
import { WorkspaceSandbox } from '../../services/sandbox/workspace-sandbox.js';

const router = Router();
router.use(requireAuth);

const buildContextSchema = z.object({
  conversationId: z.string().uuid().nullable().optional(),
  userPrompt: z.string().min(1),
  workspacePath: z.string().min(1),
  currentFile: z.string().optional(),
  cursorPosition: z.number().optional(),
});

// POST /build - Assembles context-aware prompt under authenticated sandbox
router.post('/build', async (req: Request, res: Response) => {
  try {
    const check = buildContextSchema.safeParse(req.body);
    if (!check.success) {
      return res
        .status(400)
        .json({ hariksonError: 'Invalid payload parameters.' });
    }

    const {
      conversationId,
      userPrompt,
      workspacePath,
      currentFile,
      cursorPosition,
    } = check.data;
    const tenantId =
      (req as any).user?.tenantId ||
      (req as any).tenant?.id;
    const userId =
      (req as any).user?.userId ||
      (req as any).user?.id;

    if (!tenantId || !userId) {
      return res.status(401).json({ hariksonError: 'Unauthorized: Missing tenant or user context' });
    }

    // Sandbox workspace path strictly within tenant directory
    const safeWorkspacePath = WorkspaceSandbox.getTenantWorkspace(
      tenantId,
      workspacePath
    );

    const result = await ContextBuilder.build(
      tenantId,
      userId,
      userPrompt,
      conversationId || null,
      safeWorkspacePath,
      currentFile,
      cursorPosition
    );

    return res.status(200).json({
      finalPrompt: result.finalPrompt,
      tokenBreakdown: result.tokenBreakdown,
      contextSources: result.contextSources,
      hariksonFinalPrompt: result.finalPrompt,
      hariksonTokenBreakdown: result.tokenBreakdown,
      hariksonContextSources: result.contextSources,
    });
  } catch (error: any) {
    const safeMessage = error.message?.includes('Security Exception')
      ? error.message
      : 'Context assembly error';
    return res.status(500).json({ hariksonError: safeMessage });
  }
});

export default router;
