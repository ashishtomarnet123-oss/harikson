import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { ImageGenerationEngine } from '../services/image-generation/index.js';
import { ImageOrchestrator } from '../services/image-generation/ImageOrchestrator.js';
import { ImageStorageService } from '../services/image-generation/storage/imageStorageService.js';
import { pool, executeTenantQuery } from '../db/pool.js';
import logger from '../utils/logger.js';

const router = Router();
const upload = multer({
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit for image attachments
});

// Middleware: Authenticate user for state-modifying & listing routes
const requireUserAuth = (req: any, res: Response, next: any) => {
  const authHeader = req.headers.authorization || '';
  const cookieToken = req.cookies?.hk_access_token;
  let token = '';

  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (cookieToken) {
    token = cookieToken;
  }

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET!);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token.' });
  }
};

// =========================================================================
// 1. PUBLIC / EMBEDDABLE IMAGE SERVING
// =========================================================================

// GET /api/v1/images/:id/view - Stream image binary to browser / <img> tags
router.get('/:id/view', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT storage_path, file_size_bytes FROM image_generations WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const { storage_path } = result.rows[0];
    const fileData = ImageStorageService.getImageBuffer(storage_path);

    if (!fileData.exists) {
      return res.status(404).json({ error: 'Image file not found on disk' });
    }

    let contentType = 'image/jpeg';
    if (storage_path.endsWith('.png')) contentType = 'image/png';
    else if (storage_path.endsWith('.webp')) contentType = 'image/webp';
    else if (storage_path.endsWith('.gif')) contentType = 'image/gif';
    else if (storage_path.endsWith('.svg')) contentType = 'image/svg+xml';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.end(fileData.buffer);
  } catch (err: any) {
    logger.error({ id, err }, 'Failed to stream image');
    return res.status(500).json({ error: 'Internal server error while serving image' });
  }
});

// GET /api/v1/images/:id/download - Force file download
router.get('/:id/download', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT storage_path, prompt FROM image_generations WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const { storage_path, prompt } = result.rows[0];
    const fileData = ImageStorageService.getImageBuffer(storage_path);

    if (!fileData.exists) {
      return res.status(404).json({ error: 'Image file not found on disk' });
    }

    let ext = 'jpg';
    let contentType = 'image/jpeg';
    if (storage_path.endsWith('.png')) {
      ext = 'png';
      contentType = 'image/png';
    } else if (storage_path.endsWith('.webp')) {
      ext = 'webp';
      contentType = 'image/webp';
    } else if (storage_path.endsWith('.svg')) {
      ext = 'svg';
      contentType = 'image/svg+xml';
    }

    const sanitizedPrompt = (prompt || 'xarwiz-image')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 30);
    const filename = `${sanitizedPrompt}_${id.slice(0, 8)}.${ext}`;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.end(fileData.buffer);
  } catch (err: any) {
    logger.error({ id, err }, 'Failed to download image');
    return res.status(500).json({ error: 'Internal server error while downloading image' });
  }
});

// =========================================================================
// 2. CORE REST OPERATIONS (GENERATE, EDIT, VARIATION, ANALYZE, UPLOAD)
// =========================================================================

// POST /api/v1/images/generate
router.post('/generate', requireUserAuth, async (req: any, res: Response) => {
  const tenantId = req.tenant?.id;
  const userId = req.user?.userId;

  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant context is missing.' });
  }

  const {
    prompt,
    negativePrompt,
    aspectRatio,
    stylePreset,
    provider,
    model,
    seed,
    conversationId,
    messageId,
  } = req.body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({ error: 'Prompt is required.' });
  }

  try {
    const result = await ImageGenerationEngine.generateAndSaveImage({
      tenantId,
      userId,
      conversationId,
      messageId,
      prompt: prompt.trim(),
      negativePrompt,
      aspectRatio,
      stylePreset,
      provider,
      model,
      seed: typeof seed === 'number' ? seed : undefined,
    });

    return res.status(201).json({
      success: true,
      image: result,
    });
  } catch (err: any) {
    logger.error({ tenantId, userId, prompt, err }, 'Image generation failed');
    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: err.message || 'Image generation failed.',
      code: err.code || 'GENERATION_FAILED',
    });
  }
});

// POST /api/v1/images/edit
router.post('/edit', requireUserAuth, async (req: any, res: Response) => {
  const tenantId = req.tenant?.id;
  const userId = req.user?.userId;

  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant context is missing.' });
  }

  const {
    imageId,
    prompt,
    aspectRatio,
    conversationId,
    provider,
  } = req.body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({ error: 'Edit prompt instruction is required.' });
  }

  try {
    // If imageId provided, load it as parent
    let sourceImage: any = null;
    if (imageId) {
      sourceImage = await ImageGenerationEngine.getImageById(tenantId, imageId);
    } else if (conversationId) {
      sourceImage = await ImageOrchestrator.getLatestRelevantImage(tenantId, conversationId);
    }

    if (!sourceImage) {
      return res.status(404).json({ error: 'Source image not found for editing.' });
    }

    const opResult = await ImageOrchestrator.executeOperation({
      tenantId,
      userId,
      conversationId: conversationId || sourceImage.conversationId,
      userMessage: prompt.trim(),
      operation: 'edit',
      providerName: provider,
      aspectRatio: aspectRatio || sourceImage.aspectRatio,
    });

    return res.status(200).json({
      success: true,
      image: opResult.image,
      replyText: opResult.replyText,
    });
  } catch (err: any) {
    logger.error({ tenantId, imageId, prompt, err }, 'Image editing failed');
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Image editing failed.',
    });
  }
});

// POST /api/v1/images/variation
router.post('/variation', requireUserAuth, async (req: any, res: Response) => {
  const tenantId = req.tenant?.id;
  const userId = req.user?.userId;

  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant context is missing.' });
  }

  const { imageId, conversationId, provider } = req.body;

  try {
    let sourceImage: any = null;
    if (imageId) {
      sourceImage = await ImageGenerationEngine.getImageById(tenantId, imageId);
    } else if (conversationId) {
      sourceImage = await ImageOrchestrator.getLatestRelevantImage(tenantId, conversationId);
    }

    if (!sourceImage) {
      return res.status(404).json({ error: 'Source image not found for variation.' });
    }

    const opResult = await ImageOrchestrator.executeOperation({
      tenantId,
      userId,
      conversationId: conversationId || sourceImage.conversationId,
      userMessage: 'Create another version of this image',
      operation: 'variation',
      providerName: provider,
      aspectRatio: sourceImage.aspectRatio,
    });

    return res.status(200).json({
      success: true,
      image: opResult.image,
      replyText: opResult.replyText,
    });
  } catch (err: any) {
    logger.error({ tenantId, imageId, err }, 'Image variation failed');
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Image variation failed.',
    });
  }
});

// POST /api/v1/images/analyze
router.post('/analyze', requireUserAuth, async (req: any, res: Response) => {
  const tenantId = req.tenant?.id;
  const { imageId, prompt, imageUrl } = req.body;

  try {
    let targetUrl = imageUrl;
    if (imageId) {
      const sourceImage = await ImageGenerationEngine.getImageById(tenantId, imageId);
      if (sourceImage) targetUrl = sourceImage.publicUrl;
    }

    const opResult = await ImageOrchestrator.executeOperation({
      tenantId,
      userMessage: prompt || 'Describe the style, architecture, lighting, and composition of this image.',
      operation: 'analyze',
      attachedImageUrl: targetUrl,
    });

    return res.json({
      success: true,
      analysis: opResult.analysis,
      replyText: opResult.replyText,
    });
  } catch (err: any) {
    logger.error({ tenantId, imageId, err }, 'Image analysis failed');
    return res.status(500).json({
      success: false,
      error: err.message || 'Image analysis failed.',
    });
  }
});

// POST /api/v1/images/upload - Upload reference image
router.post('/upload', requireUserAuth, upload.single('file'), async (req: any, res: Response) => {
  const tenantId = req.tenant?.id;
  const userId = req.user?.userId;

  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded.' });
  }

  try {
    const { originalname, buffer, mimetype } = req.file;
    const asset = await ImageOrchestrator.ingestUploadedImage(
      tenantId,
      userId,
      req.body.conversationId,
      buffer,
      originalname,
      mimetype
    );

    return res.status(201).json({
      success: true,
      image: asset,
    });
  } catch (err: any) {
    logger.error({ tenantId, err }, 'Failed to upload image asset');
    return res.status(500).json({ error: 'Failed to process uploaded image' });
  }
});

// GET /api/v1/images/quota - Get current monthly usage and limits
router.get('/quota', requireUserAuth, async (req: any, res: Response) => {
  const tenantId = req.tenant?.id;
  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant context is missing.' });
  }

  try {
    const quota = await ImageGenerationEngine.getTenantQuota(tenantId);
    return res.json({ success: true, quota });
  } catch (err: any) {
    logger.error({ tenantId, err }, 'Failed to fetch tenant image quota');
    return res.status(500).json({ error: 'Failed to fetch image quota' });
  }
});

// GET /api/v1/images - List tenant images with pagination
router.get('/', requireUserAuth, async (req: any, res: Response) => {
  const tenantId = req.tenant?.id;
  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant context is missing.' });
  }

  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 24;
  const conversationId = (req.query.conversationId as string) || undefined;
  const userId = req.query.mine === 'true' ? req.user?.userId : undefined;

  try {
    const data = await ImageGenerationEngine.listImages(tenantId, {
      page,
      limit,
      conversationId,
      userId,
    });

    return res.json({ success: true, ...data });
  } catch (err: any) {
    logger.error({ tenantId, err }, 'Failed to list tenant images');
    return res.status(500).json({ error: 'Failed to list images' });
  }
});

// GET /api/v1/images/:id/history - Trace image version lineage
router.get('/:id/history', requireUserAuth, async (req: any, res: Response) => {
  const tenantId = req.tenant?.id;
  const { id } = req.params;

  try {
    const history = await executeTenantQuery(tenantId, async (client) => {
      // Find current image
      const currRes = await client.query(
        `SELECT id, parent_image_id, source_image_id, conversation_id, prompt, public_url, generation_type, created_at
         FROM image_generations WHERE id = $1 AND tenant_id = $2`,
        [id, tenantId]
      );
      if (currRes.rows.length === 0) return null;

      const current = currRes.rows[0];
      const rootId = current.source_image_id || current.id;

      // Fetch all nodes belonging to this lineage tree
      const treeRes = await client.query(
        `SELECT id, parent_image_id, source_image_id, prompt, public_url, generation_type, aspect_ratio, created_at
         FROM image_generations
         WHERE tenant_id = $1 AND (source_image_id = $2 OR id = $2)
         ORDER BY created_at ASC`,
        [tenantId, rootId]
      );

      return treeRes.rows;
    });

    if (!history) {
      return res.status(404).json({ error: 'Image not found' });
    }

    return res.json({ success: true, lineage: history });
  } catch (err: any) {
    logger.error({ tenantId, id, err }, 'Failed to fetch image lineage history');
    return res.status(500).json({ error: 'Failed to fetch image history' });
  }
});

// GET /api/v1/images/:id - Get metadata of a single image
router.get('/:id', requireUserAuth, async (req: any, res: Response) => {
  const tenantId = req.tenant?.id;
  const { id } = req.params;

  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant context is missing.' });
  }

  try {
    const image = await ImageGenerationEngine.getImageById(tenantId, id);
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    return res.json({ success: true, image });
  } catch (err: any) {
    logger.error({ tenantId, id, err }, 'Failed to get image metadata');
    return res.status(500).json({ error: 'Failed to get image' });
  }
});

// DELETE /api/v1/images/:id - Delete an image
router.delete('/:id', requireUserAuth, async (req: any, res: Response) => {
  const tenantId = req.tenant?.id;
  const { id } = req.params;

  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant context is missing.' });
  }

  try {
    const deleted = await ImageGenerationEngine.deleteImage(tenantId, id);
    if (!deleted) {
      return res.status(404).json({ error: 'Image not found or already deleted' });
    }

    return res.json({ success: true, message: 'Image deleted successfully' });
  } catch (err: any) {
    logger.error({ tenantId, id, err }, 'Failed to delete image');
    return res.status(500).json({ error: 'Failed to delete image' });
  }
});

export default router;
