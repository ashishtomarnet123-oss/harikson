import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { RagService } from '../services/rag.service.js';
import { OllamaService } from '../services/ollama.service.js';
import { ValidationService } from '../services/validation.service.js';
import { MemoryRetriever } from '../services/memory/retriever.js';
import { MemoryExtractor } from '../services/memory/extractor.js';

const router = Router();

const chatSchema = z.object({
  message: z.string().min(1),
  useRag: z.boolean().default(true),
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const check = chatSchema.safeParse(req.body);
    if (!check.success) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const { message, useRag } = check.data;
    const tenantId =
      (req.headers['x-tenant-id'] as string) ||
      '00000000-0000-0000-0000-000000000000';
    const userId =
      (req.headers['x-user-id'] as string) ||
      '00000000-0000-0000-0000-000000000001';

    let context = '';

    if (useRag) {
      context = await RagService.queryContext(tenantId, message);
    }

    // Retrieve memories
    const memories = await MemoryRetriever.retrieve(tenantId, userId, message);
    let memoryContext = '';
    if (memories.length > 0) {
      memoryContext =
        '\nRelevant Memories about User:\n' +
        memories.map((m) => `- ${m.memory}`).join('\n');
    }

    // Enrich prompt with both document chunks and memory items
    let enrichedPrompt = message;
    if (context || memoryContext) {
      enrichedPrompt = `Use the following context to answer the user request:\n\n[CONTEXT]${context ? `\nDocuments:\n${context}` : ''}${memoryContext}\n\n[USER REQUEST]\n${message}`;
    }

    const systemPrompt =
      'You are a professional, white-labeled AI support agent deployed via Neuravolt Cloud. Help customers with their requests.';
    const response = await OllamaService.generate(enrichedPrompt, systemPrompt);

    // Call memory extraction in a background fire-and-forget task
    const conversationContextText = `User: ${message}\nAssistant: ${response}`;
    MemoryExtractor.extractAndSave(
      tenantId,
      userId,
      message,
      conversationContextText
    ).catch((err) =>
      console.error('⚠️ [Harikson Memory] Background extraction failed:', err)
    );

    // Run response through toxicity and PII validation gates
    const validation = ValidationService.validateChat(response);
    if (!validation.isValid) {
      console.warn(
        '⚠️ [Chat Router] Blocked unsafe generated output:',
        validation.reason
      );
      return res.status(400).json({
        error: 'Generation Blocked',
        reason:
          validation.reason ||
          'Output failed safety checks (potential toxicity or PII leak detected)',
      });
    }

    return res.status(200).json({ response });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
