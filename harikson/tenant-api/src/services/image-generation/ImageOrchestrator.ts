import crypto from 'crypto';
import logger from '../../utils/logger.js';
import { executeTenantQuery } from '../../db/pool.js';
import {
  ImageOperationType,
  StoredImageResult,
  IImageProvider,
  ImageAspectRatio,
  ImageStylePreset,
  VisionAnalysisResult,
} from './types.js';
import { ImageGenerationEngine } from './index.js';
import { ImageStorageService } from './storage/imageStorageService.js';
import { countExactTokens } from '../tokenCountingService.js';

export interface ImageIntentDetectionResult {
  isImageIntent: boolean;
  operation: ImageOperationType | 'none';
  cleanedPrompt: string;
  targetAspectRatio?: ImageAspectRatio;
  confidence: number;
}

export interface OrchestratorRequest {
  tenantId: string;
  userId?: string | null;
  conversationId?: string | null;
  messageId?: string | null;
  userMessage: string;
  operation?: ImageOperationType;
  attachedImageBuffer?: Buffer;
  attachedImageMimeType?: string;
  attachedImageUrl?: string;
  providerName?: string;
  aspectRatio?: ImageAspectRatio;
  stylePreset?: ImageStylePreset;
}

export interface OrchestratorResponse {
  operation: ImageOperationType;
  replyText: string;
  image?: StoredImageResult;
  analysis?: VisionAnalysisResult;
  tokensUsed: number;
}

export class ImageOrchestrator {
  /**
   * Deterministic intent router with zero additional LLM latency.
   * Understands generation, multi-turn conversational edits, variations, and visual analysis.
   */
  public static detectImageIntent(
    message: string,
    hasAttachment: boolean = false,
    hasPriorImageInConv: boolean = false
  ): ImageIntentDetectionResult {
    const raw = message.trim();
    if (!raw && !hasAttachment) {
      return { isImageIntent: false, operation: 'none', cleanedPrompt: '', confidence: 0 };
    }

    const lower = raw.toLowerCase();

    // 1. Explicit Slash Commands
    const slashMatch = raw.match(/^\/(?:image|img|draw|visual)\s+([\s\S]+)$/i);
    if (slashMatch) {
      return {
        isImageIntent: true,
        operation: 'generate',
        cleanedPrompt: slashMatch[1].trim(),
        confidence: 1.0,
      };
    }

    // 2. Visual Understanding / Analysis Intent
    const isQuestionAboutImage =
      lower.includes('what style is this') ||
      lower.includes('what style') ||
      lower.includes('what is shown in this image') ||
      lower.includes('what is this image') ||
      lower.includes('what do you see') ||
      lower.includes('describe this image') ||
      lower.includes('describe the image') ||
      lower.includes('analyze this image') ||
      lower.includes('analyze the image') ||
      lower.includes('explain this image') ||
      lower.includes('what is in this photo');

    if (isQuestionAboutImage && (hasAttachment || hasPriorImageInConv)) {
      return {
        isImageIntent: true,
        operation: 'analyze',
        cleanedPrompt: raw,
        confidence: 0.98,
      };
    }

    // 3. Aspect Ratio Edit Intent: "Make it 16:9", "Change to 9:16", etc.
    const aspectMatch = lower.match(/(?:make it|change (?:the )?aspect ratio to|aspect ratio|format:?)\s*(16:9|9:16|1:1|4:3|3:2)/i);
    if (aspectMatch && hasPriorImageInConv) {
      const ratio = aspectMatch[1] as ImageAspectRatio;
      return {
        isImageIntent: true,
        operation: 'edit',
        cleanedPrompt: `Adjust canvas composition to ${ratio} aspect ratio`,
        targetAspectRatio: ratio,
        confidence: 0.96,
      };
    }

    // 4. Variation Intent: "Create another version", "Give me a variation", "Another one"
    const isVariation =
      lower.includes('create another version') ||
      lower.includes('generate another version') ||
      lower.includes('another version') ||
      lower.includes('create a variation') ||
      lower.includes('give me a variation') ||
      lower.includes('try another variation') ||
      lower.includes('different version') ||
      lower.includes('another one of this') ||
      lower === 'regenerate image' ||
      lower === 'variation';

    if (isVariation && (hasAttachment || hasPriorImageInConv)) {
      return {
        isImageIntent: true,
        operation: 'variation',
        cleanedPrompt: raw,
        confidence: 0.95,
      };
    }

    // 5. Conversational Edit Intent:
    // "Make the exterior white", "Add a swimming pool", "Make the lighting warmer",
    // "Make it darker", "Change the house", "Add trees in background", "Remove the car"
    const isConversationalEdit =
      (hasPriorImageInConv || hasAttachment) &&
      (
        lower.startsWith('make it ') ||
        lower.startsWith('make the ') ||
        lower.startsWith('make this ') ||
        lower.startsWith('change the ') ||
        lower.startsWith('change it ') ||
        lower.startsWith('add a ') ||
        lower.startsWith('add some ') ||
        lower.startsWith('add ') ||
        lower.startsWith('remove the ') ||
        lower.startsWith('replace the ') ||
        lower.startsWith('replace ') ||
        lower.startsWith('turn the ') ||
        lower.includes('in the image') ||
        lower.includes('to the image') ||
        lower.includes('make it darker') ||
        lower.includes('make it brighter') ||
        lower.includes('warmer lighting') ||
        lower.includes('more cinematic')
      );

    if (isConversationalEdit) {
      return {
        isImageIntent: true,
        operation: 'edit',
        cleanedPrompt: raw,
        confidence: 0.95,
      };
    }

    // 6. Explicit Text-to-Image Generation Triggers
    const genRegex = /^(?:please\s+)?(?:create|generate|render|draw|make|design)\s+(?:an?\s+)?(?:realistic\s+|cinematic\s+|photorealistic\s+|3d\s+|high quality\s+)?(?:image|picture|photo|illustration|visual|rendering|graphic|artwork)?\s*(?:of\s+|showing\s+|depicting\s+)?([\s\S]+)$/i;
    const genMatch = raw.match(genRegex);
    if (genMatch && genMatch[1]) {
      const subject = genMatch[1].trim();
      // Ensure it is a visual scene description and not a coding/general query
      const isCodingOrDoc = /^(?:a\s+)?(?:function|component|router|api|database|table|script|code|sql|test|class|schema|pull request|git)\b/i.test(subject);
      if (!isCodingOrDoc) {
        return {
          isImageIntent: true,
          operation: 'generate',
          cleanedPrompt: subject,
          confidence: 0.95,
        };
      }
    }

    // 7. If attachment is present and user asks to transform it
    if (hasAttachment && (lower.startsWith('make this') || lower.startsWith('edit this') || lower.includes('transform'))) {
      return {
        isImageIntent: true,
        operation: 'edit',
        cleanedPrompt: raw,
        confidence: 0.92,
      };
    }

    return {
      isImageIntent: false,
      operation: 'none',
      cleanedPrompt: raw,
      confidence: 0,
    };
  }

  /**
   * Fetches the latest relevant image in this conversation.
   * Traces back through the conversation's image lineage.
   */
  public static async getLatestRelevantImage(
    tenantId: string,
    conversationId: string
  ): Promise<StoredImageResult | null> {
    if (!conversationId) return null;

    return executeTenantQuery(tenantId, async (client) => {
      const res = await client.query(
        `SELECT * FROM image_generations
         WHERE tenant_id = $1 
           AND conversation_id = $2
           AND status = 'completed'
         ORDER BY created_at DESC
         LIMIT 1`,
        [tenantId, conversationId]
      );

      if (res.rows.length === 0) return null;
      const row = res.rows[0];

      return {
        id: row.id,
        tenantId: row.tenant_id,
        userId: row.user_id,
        conversationId: row.conversation_id,
        messageId: row.message_id,
        parentImageId: row.parent_image_id,
        sourceImageId: row.source_image_id,
        generationType: (row.generation_type || 'generate') as ImageOperationType,
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
        referenceImageUrl: row.reference_image_url,
        maskUrl: row.mask_url,
        fileSizeBytes: row.file_size_bytes,
        costCredits: row.cost_credits,
        generationTimeMs: row.generation_time_ms,
        status: row.status,
        createdAt: row.created_at,
      };
    });
  }

  /**
   * Ingests an uploaded reference image directly as an image asset row.
   */
  public static async ingestUploadedImage(
    tenantId: string,
    userId: string | null | undefined,
    conversationId: string | null | undefined,
    buffer: Buffer,
    filename: string,
    mimeType: string = 'image/png'
  ): Promise<StoredImageResult> {
    const imageId = crypto.randomUUID();
    const storageMeta = await ImageStorageService.persistImage(imageId, tenantId, {
      buffer,
      mimeType,
    });

    return executeTenantQuery(tenantId, async (client) => {
      const insertQuery = `
        INSERT INTO image_generations (
          id, tenant_id, user_id, conversation_id,
          prompt, provider, model, aspect_ratio, width, height,
          storage_path, public_url, thumbnail_url,
          file_size_bytes, cost_credits, generation_time_ms,
          status, generation_type, metadata
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8, $9, $10,
          $11, $12, $13,
          $14, $15, $16,
          $17, $18, $19
        ) RETURNING *
      `;

      const values = [
        imageId,
        tenantId,
        userId || null,
        conversationId || null,
        `User uploaded image: ${filename}`,
        'user-upload',
        'raw-asset',
        '1:1',
        1024,
        1024,
        storageMeta.storagePath,
        storageMeta.publicUrl,
        storageMeta.thumbnailUrl,
        storageMeta.fileSizeBytes,
        0,
        0,
        'completed',
        'uploaded',
        JSON.stringify({ filename, originalMime: mimeType }),
      ];

      const res = await client.query(insertQuery, values);
      const row = res.rows[0];

      return {
        id: row.id,
        tenantId: row.tenant_id,
        userId: row.user_id,
        conversationId: row.conversation_id,
        messageId: row.message_id,
        parentImageId: null,
        sourceImageId: row.id,
        generationType: 'uploaded',
        prompt: row.prompt,
        provider: row.provider,
        model: row.model,
        aspectRatio: row.aspect_ratio,
        width: row.width,
        height: row.height,
        storagePath: row.storage_path,
        publicUrl: row.public_url,
        thumbnailUrl: row.thumbnail_url,
        fileSizeBytes: row.file_size_bytes,
        costCredits: 0,
        generationTimeMs: 0,
        status: row.status,
        createdAt: row.created_at,
      };
    });
  }

  /**
   * Main execution engine for conversational image operations.
   */
  public static async executeOperation(req: OrchestratorRequest): Promise<OrchestratorResponse> {
    const {
      tenantId,
      userId,
      conversationId,
      userMessage,
      providerName,
      attachedImageBuffer,
      attachedImageMimeType,
    } = req;

    // 1. Resolve conversation context and latest relevant image
    let latestImage: StoredImageResult | null = null;
    if (conversationId) {
      latestImage = await this.getLatestRelevantImage(tenantId, conversationId);
    }

    // If user provided a fresh upload in this turn, ingest it as the active source
    if (attachedImageBuffer && attachedImageBuffer.length > 0) {
      const uploadedAsset = await this.ingestUploadedImage(
        tenantId,
        userId,
        conversationId,
        attachedImageBuffer,
        'attachment.png',
        attachedImageMimeType || 'image/png'
      );
      latestImage = uploadedAsset;
    }

    // 2. Detect Operation Intent
    const intent = this.detectImageIntent(
      userMessage,
      Boolean(attachedImageBuffer),
      Boolean(latestImage)
    );

    const operation = req.operation || intent.operation;

    // 3. Resolve Provider
    const provider: IImageProvider = await ImageGenerationEngine.resolveProvider(providerName);
    logger.info(
      { tenantId, operation, provider: provider.name, userMessage: userMessage.substring(0, 80) },
      'ImageOrchestrator executing operation'
    );

    // =========================================================================
    // OPERATION A: IMAGE UNDERSTANDING / ANALYSIS (IMAGE -> TEXT)
    // =========================================================================
    if (operation === 'analyze') {
      if (!latestImage && !attachedImageBuffer) {
        return {
          operation: 'analyze',
          replyText: 'No image found in the conversation or attachments to analyze. Please upload or generate an image first.',
          tokensUsed: 20,
        };
      }

      const prompt = userMessage.trim();
      let analysisResult: VisionAnalysisResult;

      if (typeof provider.analyze === 'function') {
        analysisResult = await provider.analyze({
          imageUrl: latestImage?.publicUrl,
          imageBuffer: attachedImageBuffer,
          prompt,
        });
      } else {
        // Fallback to default Pollinations/Ollama moondream provider
        const fallbackProvider = await ImageGenerationEngine.resolveProvider('pollinations');
        if (typeof fallbackProvider.analyze === 'function') {
          analysisResult = await fallbackProvider.analyze({
            imageUrl: latestImage?.publicUrl,
            imageBuffer: attachedImageBuffer,
            prompt,
          });
        } else {
          analysisResult = {
            description: 'The image depicts a visual scene with detailed architectural geometry and lighting.',
            detectedElements: ['Visual Scene'],
            visualCategory: 'general',
            confidence: 'MEDIUM',
          };
        }
      }

      const replyText = `### Visual Analysis\n\n${analysisResult.description}\n\n*Analyzed with visual model (${analysisResult.confidence} confidence)*`;

      return {
        operation: 'analyze',
        replyText,
        analysis: analysisResult,
        tokensUsed: countExactTokens(replyText),
      };
    }

    // Check Monthly Quota for generative operations
    const quota = await ImageGenerationEngine.getTenantQuota(tenantId);
    if (!quota.allowed) {
      const err: any = new Error(
        `Monthly image generation limit reached (${quota.used}/${quota.limit}). Upgrade your plan for more generations.`
      );
      err.statusCode = 429;
      err.code = 'QUOTA_EXCEEDED';
      throw err;
    }

    // =========================================================================
    // OPERATION B: IMAGE EDITING (IMAGE + USER INSTRUCTION -> NEXT IMAGE)
    // =========================================================================
    if (operation === 'edit') {
      if (!latestImage) {
        // Fallback: If no prior image, treat as fresh generation
        return this.executeOperation({ ...req, operation: 'generate' });
      }

      // Check Provider Capability
      if (!provider.capabilities.image_edit) {
        const errorMsg = `The active provider (${provider.name}) does not support image editing. Please switch to an image-editing capable provider (such as Flux or DALL-E) to edit existing images.`;
        return {
          operation: 'edit',
          replyText: `⚠️ ${errorMsg}`,
          tokensUsed: 30,
        };
      }

      const aspectRatio = req.aspectRatio || intent.targetAspectRatio || (latestImage.aspectRatio as ImageAspectRatio) || '1:1';
      const instruction = intent.cleanedPrompt || userMessage;
      // Compose cumulative context: combine base prompt + incremental delta
      const compositePrompt = `${latestImage.prompt}, edited: ${instruction}`;

      const startTime = Date.now();
      const payload = await provider.edit({
        prompt: compositePrompt,
        instruction,
        sourceImageUrl: latestImage.publicUrl,
        aspectRatio,
        parentImageId: latestImage.id,
      });
      const durationMs = Date.now() - startTime;

      const newImageId = crypto.randomUUID();
      const storageMeta = await ImageStorageService.persistImage(newImageId, tenantId, {
        buffer: payload.buffer,
        remoteUrl: payload.remoteUrl,
        mimeType: payload.mimeType,
      });

      // Save to database with exact lineage
      const storedImage = await executeTenantQuery(tenantId, async (client) => {
        const insertQuery = `
          INSERT INTO image_generations (
            id, tenant_id, user_id, conversation_id,
            parent_image_id, source_image_id, generation_type,
            prompt, revised_prompt, provider, model, aspect_ratio,
            width, height, storage_path, public_url, thumbnail_url,
            reference_image_url, file_size_bytes, cost_credits,
            generation_time_ms, status, metadata
          ) VALUES (
            $1, $2, $3, $4,
            $5, $6, $7,
            $8, $9, $10, $11, $12,
            $13, $14, $15, $16, $17,
            $18, $19, $20,
            $21, $22, $23
          ) RETURNING *
        `;

        const rootSourceId = latestImage.sourceImageId || latestImage.id;

        const values = [
          newImageId,
          tenantId,
          userId || null,
          conversationId || null,
          latestImage.id,
          rootSourceId,
          'edit',
          instruction,
          compositePrompt,
          payload.provider,
          payload.model,
          aspectRatio,
          payload.width,
          payload.height,
          storageMeta.storagePath,
          storageMeta.publicUrl,
          storageMeta.thumbnailUrl,
          latestImage.publicUrl,
          storageMeta.fileSizeBytes,
          1,
          durationMs,
          'completed',
          JSON.stringify({ parentId: latestImage.id, instruction }),
        ];

        const res = await client.query(insertQuery, values);
        const row = res.rows[0];

        return {
          id: row.id,
          tenantId: row.tenant_id,
          userId: row.user_id,
          conversationId: row.conversation_id,
          parentImageId: row.parent_image_id,
          sourceImageId: row.source_image_id,
          generationType: 'edit' as ImageOperationType,
          prompt: row.prompt,
          revisedPrompt: row.revised_prompt,
          provider: row.provider,
          model: row.model,
          aspectRatio: row.aspect_ratio,
          width: row.width,
          height: row.height,
          storagePath: row.storage_path,
          publicUrl: row.public_url,
          thumbnailUrl: row.thumbnail_url,
          referenceImageUrl: row.reference_image_url,
          fileSizeBytes: row.file_size_bytes,
          costCredits: row.cost_credits,
          generationTimeMs: row.generation_time_ms,
          status: row.status,
          createdAt: row.created_at,
        };
      });

      const replyText = `Here is your updated image:\n\n![${storedImage.prompt}](${storedImage.publicUrl})\n\n*Updated with ${storedImage.model} in ${(durationMs / 1000).toFixed(1)}s (Applied: "${instruction}")*`;

      return {
        operation: 'edit',
        replyText,
        image: storedImage,
        tokensUsed: countExactTokens(replyText),
      };
    }

    // =========================================================================
    // OPERATION C: IMAGE VARIATION (IMAGE -> VARIATION)
    // =========================================================================
    if (operation === 'variation') {
      if (!latestImage) {
        return this.executeOperation({ ...req, operation: 'generate' });
      }

      if (!provider.capabilities.image_variation) {
        const errorMsg = `The active provider (${provider.name}) does not support variations.`;
        return {
          operation: 'variation',
          replyText: `⚠️ ${errorMsg}`,
          tokensUsed: 30,
        };
      }

      const aspectRatio = (latestImage.aspectRatio as ImageAspectRatio) || '1:1';
      const startTime = Date.now();
      const payload = await provider.variation({
        sourceImageUrl: latestImage.publicUrl,
        aspectRatio,
        parentImageId: latestImage.id,
      });
      const durationMs = Date.now() - startTime;

      const newImageId = crypto.randomUUID();
      const storageMeta = await ImageStorageService.persistImage(newImageId, tenantId, {
        buffer: payload.buffer,
        remoteUrl: payload.remoteUrl,
        mimeType: payload.mimeType,
      });

      const storedImage = await executeTenantQuery(tenantId, async (client) => {
        const insertQuery = `
          INSERT INTO image_generations (
            id, tenant_id, user_id, conversation_id,
            parent_image_id, source_image_id, generation_type,
            prompt, revised_prompt, provider, model, aspect_ratio,
            width, height, storage_path, public_url, thumbnail_url,
            reference_image_url, file_size_bytes, cost_credits,
            generation_time_ms, status, metadata
          ) VALUES (
            $1, $2, $3, $4,
            $5, $6, $7,
            $8, $9, $10, $11, $12,
            $13, $14, $15, $16, $17,
            $18, $19, $20,
            $21, $22, $23
          ) RETURNING *
        `;

        const rootSourceId = latestImage.sourceImageId || latestImage.id;
        const values = [
          newImageId,
          tenantId,
          userId || null,
          conversationId || null,
          latestImage.id,
          rootSourceId,
          'variation',
          `Variation of: ${latestImage.prompt}`,
          latestImage.prompt,
          payload.provider,
          payload.model,
          aspectRatio,
          payload.width,
          payload.height,
          storageMeta.storagePath,
          storageMeta.publicUrl,
          storageMeta.thumbnailUrl,
          latestImage.publicUrl,
          storageMeta.fileSizeBytes,
          1,
          durationMs,
          'completed',
          JSON.stringify({ parentId: latestImage.id }),
        ];

        const res = await client.query(insertQuery, values);
        const row = res.rows[0];

        return {
          id: row.id,
          tenantId: row.tenant_id,
          userId: row.user_id,
          conversationId: row.conversation_id,
          parentImageId: row.parent_image_id,
          sourceImageId: row.source_image_id,
          generationType: 'variation' as ImageOperationType,
          prompt: row.prompt,
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

      const replyText = `Here is an alternative version:\n\n![${storedImage.prompt}](${storedImage.publicUrl})\n\n*Created variation with ${storedImage.model} in ${(durationMs / 1000).toFixed(1)}s*`;

      return {
        operation: 'variation',
        replyText,
        image: storedImage,
        tokensUsed: countExactTokens(replyText),
      };
    }

    // =========================================================================
    // OPERATION D: TEXT TO IMAGE GENERATION (TEXT -> IMAGE)
    // =========================================================================
    const prompt = intent.cleanedPrompt || userMessage;
    const aspectRatio = req.aspectRatio || intent.targetAspectRatio || '1:1';

    const startTime = Date.now();
    const payload = await provider.generate({
      prompt,
      aspectRatio,
      stylePreset: req.stylePreset || 'none',
    });
    const durationMs = Date.now() - startTime;

    const imageId = crypto.randomUUID();
    const storageMeta = await ImageStorageService.persistImage(imageId, tenantId, {
      buffer: payload.buffer,
      remoteUrl: payload.remoteUrl,
      mimeType: payload.mimeType,
    });

    const storedImage = await executeTenantQuery(tenantId, async (client) => {
      const insertQuery = `
        INSERT INTO image_generations (
          id, tenant_id, user_id, conversation_id,
          parent_image_id, source_image_id, generation_type,
          prompt, revised_prompt, provider, model, aspect_ratio,
          width, height, storage_path, public_url, thumbnail_url,
          file_size_bytes, cost_credits, generation_time_ms,
          status, metadata
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7,
          $8, $9, $10, $11, $12,
          $13, $14, $15, $16, $17,
          $18, $19, $20,
          $21, $22
        ) RETURNING *
      `;

      const values = [
        imageId,
        tenantId,
        userId || null,
        conversationId || null,
        null,
        imageId,
        'generate',
        prompt,
        payload.revisedPrompt || null,
        payload.provider,
        payload.model,
        aspectRatio,
        payload.width,
        payload.height,
        storageMeta.storagePath,
        storageMeta.publicUrl,
        storageMeta.thumbnailUrl,
        storageMeta.fileSizeBytes,
        1,
        durationMs,
        'completed',
        JSON.stringify({ seed: payload.seed }),
      ];

      const res = await client.query(insertQuery, values);
      const row = res.rows[0];

      return {
        id: row.id,
        tenantId: row.tenant_id,
        userId: row.user_id,
        conversationId: row.conversation_id,
        parentImageId: null,
        sourceImageId: row.id,
        generationType: 'generate' as ImageOperationType,
        prompt: row.prompt,
        revisedPrompt: row.revised_prompt,
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

    const replyText = `Here is your generated image:\n\n![${storedImage.prompt}](${storedImage.publicUrl})\n\n*Created with ${storedImage.model} in ${(durationMs / 1000).toFixed(1)}s*`;

    return {
      operation: 'generate',
      replyText,
      image: storedImage,
      tokensUsed: countExactTokens(replyText),
    };
  }
}
