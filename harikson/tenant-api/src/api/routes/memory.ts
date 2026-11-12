import { Router, Request, Response } from 'express';
import { MemoryStore } from '../../services/memory/store.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// GET / - List all memories under active tenant/user scope
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId =
      (req as any).user?.tenantId ||
      (req as any).tenant?.id;
    const userId =
      (req as any).user?.userId ||
      (req as any).user?.id;

    if (!tenantId || !userId) {
      const errMsg = 'Unauthorized: Missing tenant or user context';
      return res.status(401).json({
        error: errMsg,
        message: errMsg,
        hariksonError: errMsg,
      });
    }

    const rawMemories = await MemoryStore.list(tenantId, userId);
    const standardized = rawMemories.map((m) => ({
      id: m.id,
      text: m.memory,
      importance: m.importance,
      createdAt: m.created_at,
      updatedAt: m.updated_at,
      hariksonMemoryId: m.id,
      hariksonMemoryText: m.memory,
      hariksonMemoryImportance: m.importance,
      hariksonCreatedAt: m.created_at,
      hariksonUpdatedAt: m.updated_at,
    }));

    return res.status(200).json({
      memories: standardized,
      total: standardized.length,
      hariksonMemories: standardized,
    });
  } catch (error: any) {
    const errMsg = error.message || 'Memory query error';
    return res.status(500).json({
      error: errMsg,
      message: errMsg,
      hariksonError: errMsg,
    });
  }
});

// DELETE /:id - Remove fact item from memory scope
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId =
      (req as any).user?.tenantId ||
      (req as any).tenant?.id;
    const userId =
      (req as any).user?.userId ||
      (req as any).user?.id;

    if (!tenantId || !userId) {
      const errMsg = 'Unauthorized: Missing tenant or user context';
      return res.status(401).json({
        error: errMsg,
        message: errMsg,
        hariksonError: errMsg,
      });
    }

    const deleted = await MemoryStore.delete(tenantId, userId, id);
    if (!deleted) {
      const errMsg = 'Memory not found or access denied.';
      return res.status(404).json({
        error: errMsg,
        message: errMsg,
        success: false,
        hariksonSuccess: false,
        hariksonMessage: errMsg,
      });
    }

    const successMsg = 'Memory deleted successfully from Xarwiz memory store.';
    return res.status(200).json({
      success: true,
      deletedId: id,
      message: successMsg,
      hariksonSuccess: true,
      hariksonDeletedId: id,
      hariksonMessage: successMsg,
    });
  } catch (error: any) {
    const errMsg = error.message || 'Memory delete error';
    return res.status(500).json({
      error: errMsg,
      message: errMsg,
      hariksonError: errMsg,
    });
  }
});

export default router;
