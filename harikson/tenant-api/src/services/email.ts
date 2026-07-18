import logger from '../utils/logger.js';
import { Resend } from 'resend';
import { Redis } from 'ioredis';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dev_key');
const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');

// Rate limit: max 3 emails per address per hour
async function checkEmailRateLimit(email: string): Promise<boolean> {
  try {
    const key = `ratelimit:emails:${email.toLowerCase()}`;
    const attempts = await redis.incr(key);
    if (attempts === 1) {
      await redis.expire(key, 3600); // 1 hour expiration
    }
    if (attempts > 3) {
      logger.warn(
        `[EMAIL RATE LIMIT EXCEEDED] Email "${email}" has requested too many emails in the last hour.`
      );
      return false;
    }
    return true;
  } catch (err: any) {
    logger.error('[EMAIL RATE LIMIT ERROR]:', err.message);
    return true;
  }
}

export const sendPasswordReset = async (to: string, resetUrl: string) => {
  if (!(await checkEmailRateLimit(to))) {
    return {
      success: false,
      error: 'Rate limit exceeded. Max 3 emails per hour.',
    };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'Harikson AI <noreply@neuravolt.cloud>',
      to,
      subject: 'Reset your password',
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #3b82f6; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">Password Reset Request</h2>
          <p>We received a request to reset your password for your Harikson AI account.</p>
          <p>Please click the button below to reset your password (link is valid for 1 hour):</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
          </div>
          <p style="font-size: 13px; color: #64748b;">If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="font-size: 13px; color: #3b82f6; word-break: break-all;">${resetUrl}</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #94a3b8;">If you did not request a password reset, you can safely ignore this email.</p>
        </div>
      `,
    });
    if (error) {
      logger.error(
        '[EMAIL SEND ERROR - PASSWORD RESET]:',
        error.message || error
      );
      return {
        success: false,
        error: error.message || 'Failed to send password reset email',
      };
    }
    return { success: true, data };
  } catch (err: any) {
    logger.error('[EMAIL SEND ERROR - PASSWORD RESET]:', err.message);
    return { success: false, error: 'Failed to send password reset email' };
  }
};

export const sendWelcomeEmail = async (to: string, name: string) => {
  if (!(await checkEmailRateLimit(to))) {
    return {
      success: false,
      error: 'Rate limit exceeded. Max 3 emails per hour.',
    };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'Harikson AI <noreply@neuravolt.cloud>',
      to,
      subject: 'Welcome to Harikson AI!',
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #10b981; border-bottom: 2px solid #10b981; padding-bottom: 10px;">Welcome to Harikson AI!</h2>
          <p>Hello ${name || 'there'},</p>
          <p>Thank you for signing up to Harikson AI Platform. Your workspace is now active and ready to build state-of-the-art AI systems.</p>
          <p>Visit your dashboard to create your first agent or knowledge base documents library.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #94a3b8;">Secured by Harikson · Enterprise AI Platform</p>
        </div>
      `,
    });
    if (error) {
      logger.error('[EMAIL SEND ERROR - WELCOME]:', error.message || error);
      return {
        success: false,
        error: error.message || 'Failed to send welcome email',
      };
    }
    return { success: true, data };
  } catch (err: any) {
    logger.error('[EMAIL SEND ERROR - WELCOME]:', err.message);
    return { success: false, error: 'Failed to send welcome email' };
  }
};

interface InvoiceDetails {
  amount: number;
  currency: string;
  status: string;
  invoiceUrl?: string;
  pdfUrl?: string;
}

export const sendInvoiceReceipt = async (to: string, invoiceDetails: InvoiceDetails) => {
  if (!(await checkEmailRateLimit(to))) {
    return {
      success: false,
      error: 'Rate limit exceeded. Max 3 emails per hour.',
    };
  }

  try {
    const { amount, currency, status, invoiceUrl, pdfUrl } = invoiceDetails;
    const { data, error } = await resend.emails.send({
      from: 'Harikson AI <noreply@neuravolt.cloud>',
      to,
      subject: 'Payment Receipt - Harikson AI',
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #059669; border-bottom: 2px solid #059669; padding-bottom: 10px;">Payment Receipt</h2>
          <p>Thank you for your payment!</p>
          <p><strong>Amount Paid:</strong> ${(amount / 100).toFixed(2)} ${currency.toUpperCase()}</p>
          <p><strong>Status:</strong> ${status.toUpperCase()}</p>
          <p>You can view your invoice online here:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${invoiceUrl || '#'}" style="display: inline-block; padding: 12px 24px; background-color: #059669; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">View Invoice</a>
          </div>
          ${pdfUrl ? `<p>Or download the PDF copy <a href="${pdfUrl}">here</a>.</p>` : ''}
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #94a3b8;">Thank you for choosing Harikson AI!</p>
        </div>
      `,
    });

    if (error) {
      logger.error('[EMAIL SEND ERROR - INVOICE]:', error.message || error);
      return {
        success: false,
        error: error.message || 'Failed to send invoice receipt',
      };
    }
    return { success: true, data };
  } catch (err: any) {
    logger.error('[EMAIL SEND ERROR - INVOICE]:', err.message);
    return { success: false, error: 'Failed to send invoice receipt' };
  }
};

export const sendSubscriptionCancellation = async (to: string, planName: string, endDate: string) => {
  if (!(await checkEmailRateLimit(to))) {
    return {
      success: false,
      error: 'Rate limit exceeded. Max 3 emails per hour.',
    };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'Harikson AI <noreply@neuravolt.cloud>',
      to,
      subject: 'Subscription Cancelled — Harikson AI',
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #ef4444; border-bottom: 2px solid #ef4444; padding-bottom: 10px;">Subscription Cancelled</h2>
          <p>Hello,</p>
          <p>Your subscription to the <strong>${planName}</strong> plan has been cancelled as requested.</p>
          <p>Your access will remain active until the end of your billing cycle on <strong>${endDate}</strong>.</p>
          <p>If you change your mind, you can resubscribe at any time from your settings panel.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #94a3b8;">Secured by Harikson · Enterprise AI Platform</p>
        </div>
      `,
    });
    if (error) {
      logger.error('[EMAIL SEND ERROR - CANCEL]:', error.message || error);
      return {
        success: false,
        error: error.message || 'Failed to send cancellation email',
      };
    }
    return { success: true, data };
  } catch (err: any) {
    logger.error('[EMAIL SEND ERROR - CANCEL]:', err.message);
    return { success: false, error: 'Failed to send cancellation email' };
  }
};

