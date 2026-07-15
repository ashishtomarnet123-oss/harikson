import { z } from 'zod';

export const createAgentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  system_prompt: z.string().optional().nullable(),
  temperature: z.number().optional().nullable(),
  top_p: z.number().optional().nullable(),
  max_tokens: z.number().int().optional().nullable(),
  context_length: z.number().int().optional().nullable(),
  streaming_enabled: z.boolean().optional().nullable(),
  memory_enabled: z.boolean().optional().nullable(),
});

export const updateAgentSchema = createAgentSchema.extend({
  status: z.enum(['active', 'archived', 'disabled']).optional(),
});
