import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(256),
});

export const taxRateSchema = z.object({
  country_code: z.string().length(2),
  region_code: z.string().max(10).optional(),
  tax_name: z.string().min(1).max(100),
  rate_percent: z.number().min(0).max(100),
  type: z.string().min(1).max(50),
  hsn_code: z.string().max(20).optional().default(''),
  is_active: z.boolean().optional().default(true),
});

export const userStatusSchema = z.object({
  status: z.enum(['active', 'suspended', 'pending']),
  reason: z.string().max(500).optional(),
});

export const legalHoldSchema = z.object({
  caseName: z.string().min(1).max(255),
  description: z.string().max(2000).optional().default(''),
  expiresAt: z.string().nullable().optional(),
});

export const legalHoldLiftSchema = z.object({
  reason: z.string().min(1).max(500),
});

export const widgetConfigSchema = z.object({
  theme: z.string().max(50).optional(),
  position: z.string().max(50).optional(),
  greeting: z.string().max(500).optional(),
  agent_id: z.string().uuid().optional().nullable(),
  allowed_domains: z.array(z.string().max(255)).optional(),
});

export const sendEmailSchema = z.object({
  subject: z.string().min(1).max(255),
  body: z.string().min(1).max(50000),
  templateId: z.string().uuid().optional(),
});

export const smtpConfigSchema = z.object({
  provider: z.enum(['resend', 'smtp', 'ses']).optional().default('resend'),
  resend_api_key: z.string().max(255).optional(),
  smtp_host: z.string().max(255).optional(),
  smtp_port: z.number().int().min(1).max(65535).optional(),
  smtp_user: z.string().max(255).optional(),
  smtp_pass: z.string().max(255).optional(),
  smtp_secure: z.boolean().optional().default(true),
  from_email: z.string().email().max(255).optional(),
  from_name: z.string().max(100).optional(),
});

export const adminResetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters long').max(256),
  forcePasswordChange: z.boolean().optional().default(true),
  revokeSessions: z.boolean().optional().default(true),
  sendEmailNotification: z.boolean().optional().default(false),
});
