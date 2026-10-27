import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(4, 'Password must be at least 4 characters'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required').optional(),
  phone: z.string().optional(),
  privacyNoticeAcknowledged: z.boolean().optional(),
  marketingConsent: z.boolean().optional(),
  source: z.string().optional(),
  companyName: z.string().optional(),
  company: z.string().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  email: z.string().email('Invalid email address').optional(),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export const forceChangePasswordSchema = z.object({
  tempToken: z.string().optional(),
  email: z.string().email('Invalid email address').optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(12, 'Password must be at least 12 characters'),
  confirmPassword: z.string().optional(),
});

