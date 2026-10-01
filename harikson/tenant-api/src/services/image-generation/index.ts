import crypto from 'crypto';
import logger from '../../utils/logger.js';
import { executeTenantQuery } from '../../db/pool.js';
import {
  ImageGenerationOptions,
  StoredImageResult,
  IImageProvider,
  ImageStylePreset,
  ImageAspectRatio,
} from './types.js';
import { FalFluxProvider } from './providers/falFluxProvider.js';
import { TogetherFluxProvider } from './providers/togetherFluxProvider.js';
import { OpenAIImageProvider } from './providers/openaiImageProvider.js';
import { PollinationsProvider } from './providers/pollinationsProvider.js';
import { ImageStorageService } from './storage/imageStorageService.js';

export interface GenerateImageRequest extends ImageGenerationOptions {
  tenantId: string;
  userId?: string | null;
  conversationId?: string | null;
  messageId?: string | null;
}

export class ImageGenerationEngine {
  private static falProvider = new FalFluxProvider();
  private static togetherProvider = new TogetherFluxProvider();
  private static openaiProvider = new OpenAIImageProvider();
  private static pollinationsProvider = new PollinationsProvider();

  public static async resolveProvider(requestedName?: string): Promise<IImageProvider> {
    const req = requestedName?.toLowerCase();

    if (req === 'fal' && (await this.falProvider.isAvailable())) {
      return this.falProvider;
    }
    if (req === 'together' && (await this.togetherProvider.isAvailable())) {
      return this.togetherProvider;
    }
    if ((req === 'openai' || req === 'dall-e' || req === 'dalle') && (await this.openaiProvider.isAvailable())) {
      return this.openaiProvider;
    }
    if (req === 'pollinations') {
      return this.pollinationsProvider;
    }

    // Automatic Cascade
    if (await this.falProvider.isAvailable()) {
      return this.falProvider;
    }
    if (await this.openaiProvider.isAvailable()) {
      return this.openaiProvider;
    }
    if (await this.togetherProvider.isAvailable()) {
      return this.togetherProvider;
    }

    // Instant zero-key fallback
    return this.pollinationsProvider;
  }

  public static async getTenantQuota(tenantId: string): Promise<{
    allowed: boolean;
    limit: number;
    used: number;
    remaining: number;
  }> {
    return executeTenantQuery(tenantId, async (client) => {
      // 1. Fetch tenant plan image limit
      const planRes = await client.query(
        `SELECT COALESCE(p.image_limit_monthly, 10) as limit
         FROM tenants t
         LEFT JOIN plans p ON LOWER(t.plan) = LOWER(p.id)
         WHERE t.id = $1`,
        [tenantId]
      );

      const limit = planRes.rows[0]?.limit ?? 10;

      // 2. Count images generated in current calendar month
      const countRes = await client.query(
        `SELECT COUNT(*)::int as count 
         FROM image_generations 
         WHERE tenant_id = $1 
           AND created_at >= date_trunc('month', NOW())`,
        [tenantId]
      );

      const used = countRes.rows[0]?.count ?? 0;
      const allowed = limit === -1 || used < limit;
      const remaining = limit === -1 ? 999999 : Math.max(0, limit - used);

      return { allowed, limit, used, remaining };
    });
  }

  public static async generateAndSaveImage(params: GenerateImageRequest): Promise<StoredImageResult> {
    const { tenantId, userId, conversationId, messageId, prompt } = params;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      throw new Error('Prompt is required for image generation.');
    }

    // 1. Check Quota
    const quota = await this.getTenantQuota(tenantId);
    if (!quota.allowed) {
      const err: any = new Error(
        `Monthly image generation limit reached (${quota.used}/${quota.limit}). Upgrade your plan for more generations.`
      );
      err.statusCode = 429;
      err.code = 'QUOTA_EXCEEDED';
      throw err;
    }

    // 2. Select Provider
    const provider = await this.resolveProvider(params.provider);
    const startTime = Date.now();

    logger.info(
      { tenantId, provider: provider.name, prompt: prompt.substring(0, 80) },
      'Starting image generation'
    );

    // 3. Generate Image
    const payload = await provider.generate(params);
    const durationMs = Date.now() - startTime;

    // 4. Ingest and Persist Asset Permanently
    const imageId = crypto.randomUUID();
    const storageMeta = await ImageStorageService.persistImage(imageId, tenantId, {
      buffer: payload.buffer,
      remoteUrl: payload.remoteUrl,
      mimeType: payload.mimeType,
    });

    const aspectRatio = params.aspectRatio || '1:1';
    const costCredits = 1;

    // 5. Record in Database
    return executeTenantQuery(tenantId, async (client) => {
      const insertQuery = `
        INSERT INTO image_generations (
          id, tenant_id, user_id, conversation_id, message_id,
          prompt, revised_prompt, negative_prompt,
          provider, model, aspect_ratio, width, height,
          storage_path, public_url, thumbnail_url,
          file_size_bytes, cost_credits, generation_time_ms,
          status, metadata
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8,
          $9, $10, $11, $12, $13,
          $14, $15, $16,
          $17, $18, $19,
          $20, $21
        ) RETURNING *
      `;

      const values = [
        imageId,
        tenantId,
        userId || null,
        conversationId || null,
        messageId || null,
        prompt.trim(),
        payload.revisedPrompt || null,
        params.negativePrompt || null,
        payload.provider,
        payload.model,
        aspectRatio,
        payload.width,
        payload.height,
        storageMeta.storagePath,
        storageMeta.publicUrl,
        storageMeta.thumbnailUrl,
        storageMeta.fileSizeBytes,
        costCredits,
        durationMs,
        'completed',
        JSON.stringify({ seed: payload.seed, stylePreset: params.stylePreset || 'none' }),
      ];

      const res = await client.query(insertQuery, values);
      const row = res.rows[0];

      return {
        id: row.id,
        tenantId: row.tenant_id,
        userId: row.user_id,
        conversationId: row.conversation_id,
        parentImageId: row.parent_image_id || null,
        sourceImageId: row.source_image_id || null,
        generationType: (row.generation_type || 'generate') as any,
        prompt: row.prompt,
        revisedPrompt: row.revised_prompt,
        negativePrompt: row.negative_prompt,
        provider: row.provider,
        model: row.model,
        aspectRatio: row.aspect_ratio,
        width: row.width,
        height: row.height,
        storagePath: row.storage_path,
        publicUrl: row.public_url,
        thumbnailUrl: row.thumbnail_url,
        fileSizeBytes: row.file_size_bytes,
        costCredits: row.cost_credits,
        generationTimeMs: row.generation_time_ms,
        status: row.status,
        createdAt: row.created_at,
      };
    });
  }

  public static async listImages(
    tenantId: string,
    options: {
      page?: number;
      limit?: number;
      userId?: string;
      conversationId?: string;
    } = {}
  ): Promise<{ images: StoredImageResult[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;

    return executeTenantQuery(tenantId, async (client) => {
      let whereClauses = ['tenant_id = $1'];
      let queryParams: any[] = [tenantId];
      let paramIdx = 2;

      if (options.userId) {
        whereClauses.push(`user_id = $${paramIdx++}`);
        queryParams.push(options.userId);
      }

      if (options.conversationId) {
        whereClauses.push(`conversation_id = $${paramIdx++}`);
        queryParams.push(options.conversationId);
      }

      const whereStr = whereClauses.join(' AND ');

      const countRes = await client.query(
        `SELECT COUNT(*)::int as total FROM image_generations WHERE ${whereStr}`,
        queryParams
      );
      const total = countRes.rows[0]?.total ?? 0;

      const listRes = await client.query(
        `SELECT * FROM image_generations 
         WHERE ${whereStr} 
         ORDER BY created_at DESC 
         LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
        [...queryParams, limit, offset]
      );

      const images: StoredImageResult[] = listRes.rows.map((row) => ({
        id: row.id,
        tenantId: row.tenant_id,
        userId: row.user_id,
        conversationId: row.conversation_id,
        messageId: row.message_id,
        parentImageId: row.parent_image_id || null,
        sourceImageId: row.source_image_id || null,
        generationType: (row.generation_type || 'generate') as any,
        prompt: row.prompt,
        revisedPrompt: row.revised_prompt,
        negativePrompt: row.negative_prompt,
        provider: row.provider,
        model: row.model,
        aspectRatio: row.aspect_ratio,
        width: row.width,
        height: row.height,
        storagePath: row.storage_path,
        publicUrl: row.public_url,
        thumbnailUrl: row.thumbnail_url,
        fileSizeBytes: row.file_size_bytes,
        costCredits: row.cost_credits,
        generationTimeMs: row.generation_time_ms,
        status: row.status,
        createdAt: row.created_at,
      }));

      return { images, total, page, limit };
    });
  }

  public static async getImageById(tenantId: string, imageId: string): Promise<StoredImageResult | null> {
    return executeTenantQuery(tenantId, async (client) => {
      const res = await client.query(
        `SELECT * FROM image_generations WHERE id = $1 AND tenant_id = $2`,
        [imageId, tenantId]
      );
      if (res.rows.length === 0) return null;
      const row = res.rows[0];
      return {
        id: row.id,
        tenantId: row.tenant_id,
        userId: row.user_id,
        conversationId: row.conversation_id,
        messageId: row.message_id,
        parentImageId: row.parent_image_id || null,
        sourceImageId: row.source_image_id || null,
        generationType: (row.generation_type || 'generate') as any,
        prompt: row.prompt,
        revisedPrompt: row.revised_prompt,
        negativePrompt: row.negative_prompt,
        provider: row.provider,
        model: row.model,
        aspectRatio: row.aspect_ratio,
        width: row.width,
        height: row.height,
        storagePath: row.storage_path,
        publicUrl: row.public_url,
        thumbnailUrl: row.thumbnail_url,
        fileSizeBytes: row.file_size_bytes,
        costCredits: row.cost_credits,
        generationTimeMs: row.generation_time_ms,
        status: row.status,
        createdAt: row.created_at,
      };
    });
  }

  public static async deleteImage(tenantId: string, imageId: string): Promise<boolean> {
    const existing = await this.getImageById(tenantId, imageId);
    if (!existing) return false;

    // Delete local file
    ImageStorageService.deleteImageFile(existing.storagePath);

    // Delete db record
    return executeTenantQuery(tenantId, async (client) => {
      await client.query(
        `DELETE FROM image_generations WHERE id = $1 AND tenant_id = $2`,
        [imageId, tenantId]
      );
      return true;
    });
  }
}

export { ImageOrchestrator } from './ImageOrchestrator.js';
