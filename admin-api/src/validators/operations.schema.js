import { z } from 'zod';

export const activitySchema = z.object({
  tenant_id: z.string().uuid('Invalid tenant ID'),
  user_id: z.string().uuid('Invalid user ID'),
  agent_id: z.string().uuid('Invalid agent ID').optional().nullable(),
  model: z.string().optional().nullable(),
  status: z
    .enum([
      'waiting',
      'processing',
      'streaming',
      'completed',
      'failed',
      'cancelled',
    ])
    .optional(),
  tokens_in: z.number().int().optional().nullable(),
  tokens_out: z.number().int().optional().nullable(),
  latency_ms: z.number().int().optional().nullable(),
  gpu_percent: z.number().int().optional().nullable(),
  error_message: z.string().optional().nullable(),
});

export const workflowStepSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  type: z.string(),
  value: z.string().optional(),
  name: z.string().optional(),
  config: z.record(z.any()).optional(),
});

export const workflowSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional().nullable(),
  trigger_type: z.enum(['manual', 'scheduled', 'webhook', 'event', 'cron']).optional(),
  steps: z.array(workflowStepSchema).optional(),
  definition: z.any().optional(),
  tenant_id: z.string().uuid('Invalid tenant ID').optional().nullable(),
});

export const updateWorkflowSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional().nullable(),
  trigger_type: z.enum(['manual', 'scheduled', 'webhook', 'event', 'cron']).optional(),
  steps: z.array(workflowStepSchema).optional(),
  definition: z.any().optional(),
  status: z.enum(['active', 'disabled', 'archived']).optional(),
});

export const statusToggleSchema = z.object({
  status: z.enum(['active', 'disabled', 'archived']),
});

export const bulkActionSchema = z.object({
  action: z.enum(['pause', 'resume', 'delete']),
  workflow_ids: z.array(z.string()).min(1, 'At least one workflow ID is required'),
});

export const backupSchema = z.object({
  name: z.string().optional(),
  type: z.enum(['full', 'incremental', 'schema']).optional(),
  retention_days: z.number().int().optional(),
});

export const vectorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional().nullable(),
});

export const costSchema = z.object({
  category: z.enum([
    'gpu',
    'cpu',
    'storage',
    'embedding',
    'inference',
    'bandwidth',
    'other',
  ]),
  description: z.string().optional().nullable(),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().optional(),
  period_start: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid start date format (YYYY-MM-DD)'),
  period_end: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid end date format (YYYY-MM-DD)'),
});

export const notificationSchema = z.object({
  user_id: z.string().uuid('Invalid user ID').optional().nullable(),
  type: z.enum([
    'model_loaded',
    'model_failed',
    'gpu_high',
    'gpu_overheat',
    'disk_full',
    'workflow_failed',
    'security_alert',
    'tenant_suspended',
    'payment_received',
    'agent_error',
  ]),
  title: z.string().min(1, 'Title is required'),
  message: z.string().optional().nullable(),
  link: z.string().optional().nullable(),
});

export const integrationSchema = z.object({
  provider: z.string().min(1, 'Provider is required'),
  display_name: z.string().optional().nullable(),
  tenant_id: z.string().uuid('Invalid tenant ID').optional().nullable(),
  status: z.string().optional(),
});
