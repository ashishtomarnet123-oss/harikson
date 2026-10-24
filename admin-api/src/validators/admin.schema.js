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
  recipientType: z.enum(['single', 'all']).default('single'),
  recipientEmail: z.string().email().max(255).optional().nullable(),
  templateKey: z.string().max(100).optional().nullable(),
  subject: z.string().max(255).optional().nullable(),
  body_html: z.string().max(100000).optional().nullable(),
  variables: z.record(z.any()).optional().default({}),
}).refine((data) => {
  if (data.recipientType === 'single' && !data.recipientEmail) {
    return false;
  }
  if (!data.templateKey && (!data.subject || !data.body_html)) {
    return false;
  }
  return true;
}, {
  message: 'recipientEmail is required for single mail, and either templateKey or subject and body_html are required',
});

export const smtpConfigSchema = z.object({
  provider: z.enum(['resend', 'smtp']).default('resend'),
  resend_api_key: z.string().max(255).optional().nullable(),
  smtp_host: z.string().max(255).optional().nullable(),
  smtp_port: z.union([z.number().int().min(1).max(65535), z.string()]).optional().nullable(),
  smtp_user: z.string().max(255).optional().nullable(),
  smtp_pass: z.string().max(255).optional().nullable(),
  smtp_secure: z.boolean().optional().default(true),
  from_email: z.string().email().max(255).optional().nullable(),
  from_name: z.string().max(100).optional().nullable(),
});

export const createEmailTemplateSchema = z.object({
  template_key: z.string().min(1).max(100).regex(/^[a-z0-9_-]+$/i, 'Template key must be alphanumeric, hyphen or underscore'),
  name: z.string().min(1).max(255),
  subject: z.string().min(1).max(255),
  body_html: z.string().min(1).max(100000),
  body_text: z.string().max(100000).optional().nullable(),
  available_variables: z.array(z.string().max(100)).optional().default([]),
});

export const updateEmailTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  subject: z.string().min(1).max(255).optional(),
  body_html: z.string().min(1).max(100000).optional(),
  body_text: z.string().max(100000).optional().nullable(),
  available_variables: z.array(z.string().max(100)).optional().nullable(),
  is_active: z.boolean().optional(),
});

export const adminResetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters long').max(256),
  forcePasswordChange: z.boolean().optional().default(true),
  revokeSessions: z.boolean().optional().default(true),
  sendEmailNotification: z.boolean().optional().default(false),
});
