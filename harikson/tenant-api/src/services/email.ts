import logger from '../utils/logger.js';
import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { Redis } from 'ioredis';
import { pool } from '../db/pool.js';
import { decryptSecret } from './emailCrypto.js';

const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');

/**
 * Retrieve active email / SMTP configuration from PostgreSQL database with transparent decryption,
 * falling back to environment variables.
 */
export async function getActiveSmtpConfig(): Promise<any> {
  try {
    const res = await pool.query('SELECT * FROM smtp_configs WHERE is_active = true ORDER BY updated_at DESC LIMIT 1');
    if (res.rows.length > 0) {
      const row = { ...res.rows[0] };
      if (row.smtp_pass) {
        row.smtp_pass = decryptSecret(row.smtp_pass);
      }
      if (row.resend_api_key) {
        row.resend_api_key = decryptSecret(row.resend_api_key);
      }
      return row;
    }
  } catch (err: any) {
    logger.warn('[EMAIL SERVICE] Failed to query active SMTP config from DB, falling back to environment:', err.message);
  }

  return {
    provider: process.env.SMTP_HOST ? 'smtp' : (process.env.RESEND_API_KEY ? 'resend' : 'smtp'),
    smtp_host: process.env.SMTP_HOST || 'mail.xarwiz.com',
    smtp_port: parseInt(process.env.SMTP_PORT || '587', 10),
    smtp_user: process.env.SMTP_USER || '',
    smtp_pass: process.env.SMTP_PASS || '',
    smtp_secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
    from_email: process.env.FROM_EMAIL || 'noreply@xarwiz.com',
    from_name: process.env.FROM_NAME || 'Xarwiz AI',
    resend_api_key: process.env.RESEND_API_KEY || null,
  };
}

/**
 * Test SMTP connection using Nodemailer verify
 */
export async function verifySmtpConnection(config: any): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const transporter = nodemailer.createTransport({
      host: config.smtp_host,
      port: config.smtp_port,
      secure: config.smtp_secure,
      auth: config.smtp_user && config.smtp_pass ? {
        user: config.smtp_user,
        pass: config.smtp_pass,
      } : undefined,
      tls: { rejectUnauthorized: false },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });

    await transporter.verify();
    return { success: true, message: 'SMTP server connection verified successfully' };
  } catch (err: any) {
    return { success: false, error: err.message || 'SMTP connection verification failed' };
  }
}

// Rate limit: max emails per address per hour (default 20)
export async function checkEmailRateLimit(email: string, maxLimit: number = 20): Promise<boolean> {
  try {
    const key = `ratelimit:emails:${email.toLowerCase().trim()}`;
    const attempts = await redis.incr(key);
    if (attempts === 1) {
      await redis.expire(key, 3600); // 1 hour expiration
    }
    if (attempts > maxLimit) {
      logger.warn(
        `[EMAIL RATE LIMIT EXCEEDED] Email "${email}" has requested too many emails in the last hour (${attempts}/${maxLimit}).`
      );
      return false;
    }
    return true;
  } catch (err: any) {
    logger.error('[EMAIL RATE LIMIT ERROR]:', err.message);
    return true;
  }
}

export async function resetEmailRateLimit(email: string): Promise<boolean> {
  if (!email) return false;
  try {
    const key = `ratelimit:emails:${email.toLowerCase().trim()}`;
    await redis.del(key);
    return true;
  } catch (err: any) {
    logger.warn('[EMAIL RATE LIMIT RESET ERROR]:', err.message);
    return false;
  }
}

/**
 * Persist dispatch telemetry to email_logs
 */
export async function logEmailDispatch({
  tenant_id = null,
  user_id = null,
  recipient,
  email_type,
  subject,
  status,
  error_message = null,
  resend_id = null,
  metadata = {},
}: {
  tenant_id?: string | null;
  user_id?: string | null;
  recipient: string;
  email_type: string;
  subject: string;
  status: 'sent' | 'failed' | 'queued';
  error_message?: string | null;
  resend_id?: string | null;
  metadata?: any;
}) {
  try {
    await pool.query(
      `INSERT INTO email_logs (tenant_id, user_id, recipient, email_type, subject, status, error_message, resend_id, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      [tenant_id, user_id, recipient, email_type, subject, status, error_message, resend_id, JSON.stringify(metadata || {})]
    );
  } catch (err: any) {
    logger.error('[EMAIL LOGGING ERROR]: Failed to persist email dispatch log:', err.message);
  }
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  emailType?: string;
  from?: string;
  tenant_id?: string | null;
  user_id?: string | null;
  metadata?: any;
  bypassRateLimit?: boolean;
  maxLimit?: number;
}

/**
 * Unified enterprise email dispatcher for tenant-api.
 * Automatically routes through active SMTP configuration or Resend provider based on smtp_configs.
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  emailType = 'transactional',
  from,
  tenant_id = null,
  user_id = null,
  metadata = {},
  bypassRateLimit = false,
  maxLimit = 20,
}: SendEmailOptions): Promise<{ success: boolean; data?: any; error?: string }> {
  if (!to) {
    return { success: false, error: 'Recipient email is required' };
  }

  if (!bypassRateLimit && !(await checkEmailRateLimit(to, maxLimit))) {
    return {
      success: false,
      error: 'Rate limit exceeded. Please wait a few minutes before requesting another email.',
    };
  }

  const config = await getActiveSmtpConfig();
  const fromAddress = from || (config.from_name ? `"${config.from_name}" <${config.from_email || 'noreply@xarwiz.com'}>` : (config.from_email || 'noreply@xarwiz.com'));

  try {
    if (config.provider === 'smtp') {
      const transporter = nodemailer.createTransport({
        host: config.smtp_host,
        port: config.smtp_port,
        secure: config.smtp_secure,
        auth: config.smtp_user && config.smtp_pass ? {
          user: config.smtp_user,
          pass: config.smtp_pass,
        } : undefined,
        tls: { rejectUnauthorized: false },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });

      const info = await transporter.sendMail({
        from: fromAddress,
        to,
        subject,
        html,
        text: text || undefined,
      });

      await logEmailDispatch({
        tenant_id,
        user_id,
        recipient: to,
        email_type: emailType,
        subject,
        status: 'sent',
        resend_id: info.messageId,
        metadata: { ...metadata, provider: 'smtp', messageId: info.messageId },
      });

      return { success: true, data: { id: info.messageId } };
    } else {
      // Resend provider
      const apiKey = config.resend_api_key || process.env.RESEND_API_KEY;
      if (!apiKey || apiKey === 're_dev_key') {
        throw new Error('Resend API key is not configured');
      }
      const client = new Resend(apiKey);
      const { data, error } = await client.emails.send({
        from: fromAddress,
        to,
        subject,
        html,
        text: text || undefined,
      });

      if (error) {
        await logEmailDispatch({
          tenant_id,
          user_id,
          recipient: to,
          email_type: emailType,
          subject,
          status: 'failed',
          error_message: error.message || String(error),
          metadata: { ...metadata, provider: 'resend' },
        });
        return { success: false, error: error.message || 'Resend API dispatch failed' };
      }

      await logEmailDispatch({
        tenant_id,
        user_id,
        recipient: to,
        email_type: emailType,
        subject,
        status: 'sent',
        resend_id: data?.id,
        metadata: { ...metadata, provider: 'resend' },
      });

      return { success: true, data };
    }
  } catch (err: any) {
    logger.error(`[EMAIL DISPATCH FAILURE - ${emailType}]:`, err.message);
    await logEmailDispatch({
      tenant_id,
      user_id,
      recipient: to,
      email_type: emailType,
      subject,
      status: 'failed',
      error_message: err.message,
      metadata: { ...metadata, provider: config.provider },
    });
    return { success: false, error: err.message || 'Failed to dispatch email' };
  }
}

export const sendPasswordReset = async (to: string, resetUrl: string, options: { bypassRateLimit?: boolean; maxLimit?: number } = {}) => {
  const html = `
    <div style="font-family: sans-serif; padding: 20px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #3b82f6; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">Password Reset Request</h2>
      <p>We received a request to reset your password for your Xarwiz AI account.</p>
      <p>Please click the button below to reset your password (link is valid for 1 hour):</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
      </div>
      <p style="font-size: 13px; color: #64748b;">If the button doesn't work, you can copy and paste this link into your browser:</p>
      <p style="font-size: 13px; color: #3b82f6; word-break: break-all;">${resetUrl}</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 12px; color: #94a3b8;">If you did not request a password reset, you can safely ignore this email.</p>
    </div>
  `;

  return sendEmail({
    to,
    subject: 'Reset your password - Xarwiz AI',
    html,
    emailType: 'password_reset',
    bypassRateLimit: options.bypassRateLimit,
    maxLimit: options.maxLimit ?? 20,
  });
};

export const sendWelcomeEmail = async (to: string, name: string) => {
  const html = `
    <div style="font-family: sans-serif; padding: 20px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">Welcome to Xarwiz AI!</h2>
      <p>Hello ${name || 'there'},</p>
      <p>Welcome to Xarwiz AI — your enterprise-grade platform for intelligent, autonomous AI workflows.</p>
      <p>Here are a few quick tips to get you up to speed:</p>
      <ul>
        <li><strong>AI Agents:</strong> Create and deploy custom reasoning agents in minutes.</li>
        <li><strong>RAG Documents:</strong> Connect and search your private enterprise knowledge base with semantic search.</li>
        <li><strong>Workflows:</strong> Build complex, resilient multi-step automated execution pipelines.</li>
      </ul>
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://xarwiz.com/chat" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Get Started in Studio</a>
      </div>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 12px; color: #94a3b8;">Secured by Xarwiz AI &bull; Enterprise Operations</p>
    </div>
  `;

  return sendEmail({
    to,
    subject: 'Welcome to Xarwiz AI!',
    html,
    emailType: 'welcome',
  });
};

export interface InvoiceDetails {
  amount: number;
  currency: string;
  status: string;
  invoiceUrl?: string;
  pdfUrl?: string;
}

export const sendInvoiceReceipt = async (to: string, invoiceDetails: InvoiceDetails) => {
  const { amount, currency, status, invoiceUrl, pdfUrl } = invoiceDetails;
  const html = `
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
      <p style="font-size: 12px; color: #94a3b8;">Thank you for choosing Xarwiz AI!</p>
    </div>
  `;

  return sendEmail({
    to,
    subject: 'Payment Receipt - Xarwiz AI',
    html,
    emailType: 'invoice_receipt',
    metadata: { amount, currency, status },
  });
};

export const sendSubscriptionCancellation = async (to: string, planName: string, endDate: string) => {
  const html = `
    <div style="font-family: sans-serif; padding: 20px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #ef4444; border-bottom: 2px solid #ef4444; padding-bottom: 10px;">Subscription Cancelled</h2>
      <p>Hello,</p>
      <p>Your subscription to the <strong>${planName}</strong> plan has been cancelled as requested.</p>
      <p>Your access will remain active until the end of your billing cycle on <strong>${endDate}</strong>.</p>
      <p>If you change your mind, you can resubscribe at any time from your settings panel.</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 12px; color: #94a3b8;">Secured by Xarwiz · Enterprise AI Platform</p>
    </div>
  `;

  return sendEmail({
    to,
    subject: 'Subscription Cancelled - Xarwiz AI',
    html,
    emailType: 'subscription_cancelled',
    metadata: { planName, endDate },
  });
};

export const sendVerificationEmail = async (to: string, verificationUrl: string) => {
  const html = `
    <div style="font-family: sans-serif; padding: 20px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">Verify your Xarwiz Account</h2>
      <p>Welcome to Xarwiz!</p>
      <p>Please click the button below to verify your email address and activate your account (link expires in 24 hours):</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Verify Email Address</a>
      </div>
      <p style="font-size: 13px; color: #64748b;">If the button doesn't work, copy and paste this URL into your browser:</p>
      <p style="font-size: 13px; color: #2563eb; word-break: break-all;">${verificationUrl}</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 12px; color: #94a3b8;">If you did not register for a Xarwiz account, please ignore this message.</p>
    </div>
  `;

  return sendEmail({
    to,
    subject: 'Verify your email - Xarwiz',
    html,
    emailType: 'email_verification',
  });
};

export const sendAccountLockoutAlert = async (to: string, unlockUrl: string, durationText: string) => {
  const html = `
    <div style="font-family: sans-serif; padding: 20px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #fee2e2; border-radius: 8px;">
      <h2 style="color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 10px;">Security Alert: Account Temporarily Locked</h2>
      <p>We detected multiple failed login attempts on your Xarwiz AI account.</p>
      <p>To protect your workspace from brute-force access attempts, your account has been locked for <strong>${durationText}</strong>.</p>
      <p>If this was you or if you need to restore immediate access, please click the button below to safely unlock your account:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${unlockUrl}" style="display: inline-block; padding: 12px 24px; background-color: #dc2626; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Unlock Account Now</a>
      </div>
      <p style="font-size: 13px; color: #64748b;">Or copy and paste this link into your browser:</p>
      <p style="font-size: 13px; color: #dc2626; word-break: break-all;">${unlockUrl}</p>
      <hr style="border: 0; border-top: 1px solid #fee2e2; margin: 20px 0;" />
      <p style="font-size: 12px; color: #94a3b8;">If you did not attempt to log in, we recommend reviewing your account credentials immediately.</p>
    </div>
  `;

  return sendEmail({
    to,
    subject: 'Security Alert: Your Xarwiz account has been locked',
    html,
    emailType: 'security_alert',
  });
};

export const sendDeviceMismatchAlert = async (to: string, deviceName: string, ip: string) => {
  const html = `
    <div style="font-family: sans-serif; padding: 20px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #fee2e2; border-radius: 8px;">
      <h2 style="color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 10px;">Security Alert: Unrecognized Device Blocked</h2>
      <p>We blocked a refresh token request on your Xarwiz AI account from an unrecognized device.</p>
      <p><strong>Device:</strong> ${deviceName || 'Unknown Device'}</p>
      <p><strong>IP Address:</strong> ${ip || 'Unknown IP'}</p>
      <p><strong>Time:</strong> ${new Date().toUTCString()}</p>
      <p>For your security, access was blocked on that device and you must log in again to authenticate.</p>
      <hr style="border: 0; border-top: 1px solid #fee2e2; margin: 20px 0;" />
      <p style="font-size: 12px; color: #94a3b8;">If you did not initiate this request, we recommend changing your account password immediately.</p>
    </div>
  `;

  return sendEmail({
    to,
    subject: 'Security Alert: Device fingerprint mismatch detected',
    html,
    emailType: 'security_alert',
    metadata: { deviceName, ip },
  });
};

export const sendDunningNotice = async (to: string, dayStage: number, billingUrl: string = 'https://xarwiz.com/settings/billing') => {
  let subject = 'Payment Failed - Action Required';
  let heading = 'Payment Failed for Your Xarwiz Subscription';
  let message = 'We were unable to process the latest payment for your Xarwiz AI subscription. Please update your payment details to ensure uninterrupted service.';
  let buttonText = 'Update Billing Details';
  let color = '#dc2626';

  if (dayStage === 3) {
    subject = 'Reminder: Update Payment Method (27 Days Remaining)';
    heading = 'Your Subscription Will Be Suspended in 27 Days';
    message = 'Your subscription payment is past due. To prevent service interruption, please update your payment method.';
  } else if (dayStage === 7) {
    subject = 'Notice: Update Payment Method (23 Days Remaining)';
    heading = 'Your Subscription Will Be Suspended in 23 Days';
    message = 'We still have not received your subscription payment. Please update your card to maintain active access.';
  } else if (dayStage === 14) {
    subject = 'Final Notice: Update Payment Method or Lose Access';
    heading = 'Final Notice: Payment Overdue (Chat Access Restricted)';
    message = 'Your payment is now 14 days overdue. Chat generation is temporarily restricted until payment details are updated.';
    buttonText = 'Pay & Restore Access Now';
  } else if (dayStage === 30) {
    subject = 'Subscription Cancelled due to Non-Payment';
    heading = 'Your Xarwiz Subscription Has Been Cancelled';
    message = 'Your subscription was cancelled after 30 days of uncollected payment. Reactivate your plan anytime to restore access.';
    buttonText = 'Reactivate Subscription';
    color = '#4b5563';
  }

  const html = `
    <div style="font-family: sans-serif; padding: 20px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #fee2e2; border-radius: 8px;">
      <h2 style="color: ${color}; border-bottom: 2px solid ${color}; padding-bottom: 10px;">${heading}</h2>
      <p>${message}</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${billingUrl}" style="display: inline-block; padding: 12px 24px; background-color: ${color}; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">${buttonText}</a>
      </div>
      <hr style="border: 0; border-top: 1px solid #fee2e2; margin: 20px 0;" />
      <p style="font-size: 12px; color: #94a3b8;">If you believe this is an error or need billing support, contact support@xarwiz.com.</p>
    </div>
  `;

  return sendEmail({
    to,
    subject,
    html,
    emailType: 'dunning_notice',
    metadata: { dayStage, billingUrl },
  });
};

export const sendPrivacyRequestAcknowledgmentEmail = async (
  to: string,
  details: { trackingNumber: string; requestType: string; name: string }
) => {
  const formattedType = details.requestType.replace(/_/g, ' ').toUpperCase();
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #0f172a; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="border-bottom: 2px solid #3b82f6; padding-bottom: 12px; margin-bottom: 20px;">
        <h2 style="color: #1e293b; margin: 0; font-size: 20px;">Privacy Rights Request Acknowledgment</h2>
        <p style="color: #64748b; margin: 4px 0 0 0; font-size: 13px;">India Digital Personal Data Protection Act, 2023</p>
      </div>
      <p>Dear ${details.name || 'Data Principal'},</p>
      <p>We have received your statutory Data Principal rights request under the DPDP Act 2023. Our Privacy & Data Protection team has logged this request and begun review.</p>
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Tracking Number:</strong> <span style="font-family: monospace; color: #2563eb; font-weight: bold;">${details.trackingNumber}</span></p>
        <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Request Type:</strong> ${formattedType}</p>
        <p style="margin: 0; font-size: 14px;"><strong>Initial Status:</strong> Submitted / Under Verification</p>
      </div>
      <p style="font-size: 14px; line-height: 1.5; color: #334155;">
        You can monitor the status of this request at any time inside your Xarwiz Dashboard under <strong>Settings &gt; Privacy &amp; Data Rights</strong>, or by referencing your tracking number with our Privacy Office.
      </p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="font-size: 12px; color: #94a3b8; margin: 0;">
        VoltNovate Solutions LLP &bull; House No 2, Sai Dham Colony, DD Nagar, Gwalior, Madhya Pradesh - 474005, India &bull; Contact: privacy@xarwiz.com
      </p>
    </div>
  `;

  return sendEmail({
    to,
    subject: `[DPDP Privacy Request] Acknowledgment - ${details.trackingNumber}`,
    html,
    emailType: 'privacy_acknowledgment',
    metadata: details,
  });
};

export const sendGrievanceAcknowledgmentEmail = async (
  to: string,
  details: { grievanceNumber: string; subject: string; name: string; officerName: string; officerEmail: string }
) => {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #0f172a; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="border-bottom: 2px solid #8b5cf6; padding-bottom: 12px; margin-bottom: 20px;">
        <h2 style="color: #1e293b; margin: 0; font-size: 20px;">Grievance Redressal Acknowledgment</h2>
        <p style="color: #64748b; margin: 4px 0 0 0; font-size: 13px;">Section 13, Digital Personal Data Protection Act, 2023</p>
      </div>
      <p>Dear ${details.name || 'Complainant'},</p>
      <p>This is to confirm receipt of your grievance regarding personal data processing at Xarwiz. Your complaint has been formally registered with our designated Grievance Officer.</p>
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Grievance Reference:</strong> <span style="font-family: monospace; color: #7c3aed; font-weight: bold;">${details.grievanceNumber}</span></p>
        <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Subject:</strong> ${details.subject}</p>
        <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Designated Officer:</strong> ${details.officerName}</p>
        <p style="margin: 0; font-size: 14px;"><strong>Officer Email:</strong> ${details.officerEmail}</p>
      </div>
      <p style="font-size: 14px; line-height: 1.5; color: #334155;">
        In accordance with the DPDP Act 2023 and prescribed timeframes, your grievance is under immediate investigation. You will receive an official determination and resolution notes within statutory response timelines.
      </p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="font-size: 12px; color: #94a3b8; margin: 0;">
        VoltNovate Solutions LLP &bull; House No 2, Sai Dham Colony, DD Nagar, Gwalior, Madhya Pradesh - 474005, India &bull; Grievance Redressal Cell
      </p>
    </div>
  `;

  return sendEmail({
    to,
    subject: `[DPDP Grievance Redressal] Acknowledgment - ${details.grievanceNumber}`,
    html,
    emailType: 'grievance_acknowledgment',
    metadata: details,
  });
};
