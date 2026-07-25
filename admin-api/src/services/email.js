import logger from '../utils/logger.js';
import { Resend } from 'resend';
import Redis from 'ioredis';
import pg from 'pg';
import nodemailer from 'nodemailer';

const { Pool } = pg;
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://neuravolt:neuravolt_dev_pwd@harikson-postgres:5432/neuravolt',
});

const resend = new Resend(process.env.RESEND_API_KEY || 're_dev_key');
const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');

// Helper to log all email dispatches into email_logs table
export async function logEmailDispatch(recipient, emailType, subject, status, errorMessage = null, resendId = null, metadata = {}) {
  try {
    await pool.query(
      `INSERT INTO email_logs (recipient, email_type, subject, status, error_message, resend_id, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [recipient, emailType, subject, status, errorMessage, resendId, JSON.stringify(metadata)]
    );
  } catch (err) {
    logger.warn('[EMAIL LOG INSERT FAILED]:', err.message);
  }
}

// Helper to fetch active SMTP config from database
export async function getActiveSmtpConfig() {
  try {
    const res = await pool.query('SELECT * FROM smtp_configs WHERE is_active = true ORDER BY updated_at DESC LIMIT 1');
    if (res.rows.length > 0) {
      return res.rows[0];
    }
  } catch (err) {
    logger.warn('[SMTP CONFIG FETCH FAILED]:', err.message);
  }
  return {
    provider: 'resend',
    resend_api_key: process.env.RESEND_API_KEY || 're_dev_key',
    from_email: 'noreply@neuravolt.cloud',
    from_name: 'Neuravolt Cloud'
  };
}

// Helper to test SMTP connection
export async function verifySmtpConnection(config) {
  if (config.provider === 'resend') {
    if (!config.resend_api_key || config.resend_api_key === 're_dev_key') {
      return { success: false, error: 'Invalid or default dev Resend API key provided' };
    }
    return { success: true, message: 'Resend API key configured' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.smtp_host,
      port: parseInt(config.smtp_port || 587),
      secure: config.smtp_secure !== false && parseInt(config.smtp_port) === 465,
      auth: config.smtp_user ? {
        user: config.smtp_user,
        pass: config.smtp_pass
      } : undefined,
      tls: {
        rejectUnauthorized: false
      }
    });

    await transporter.verify();
    return { success: true, message: 'SMTP server connection verified successfully!' };
  } catch (err) {
    logger.error('[SMTP VERIFICATION ERROR]:', err.message);
    return { success: false, error: err.message || 'Failed to connect to SMTP server' };
  }
}

// Universal Email Dispatcher (Supports both Resend & Custom SMTP)
export async function sendEmail({ to, subject, html, text, emailType = 'custom', metadata = {} }) {
  if (!(await checkEmailRateLimit(to))) {
    await logEmailDispatch(to, emailType, subject, 'failed', 'Rate limit exceeded. Max 3 emails per hour.');
    return { success: false, error: 'Rate limit exceeded. Max 3 emails per hour.' };
  }

  const config = await getActiveSmtpConfig();
  const fromAddress = `"${config.from_name || 'Neuravolt Cloud'}" <${config.from_email || 'noreply@neuravolt.cloud'}>`;

  if (config.provider === 'smtp') {
    try {
      const transporter = nodemailer.createTransport({
        host: config.smtp_host,
        port: parseInt(config.smtp_port || 587),
        secure: config.smtp_secure !== false && parseInt(config.smtp_port) === 465,
        auth: config.smtp_user ? {
          user: config.smtp_user,
          pass: config.smtp_pass
        } : undefined,
        tls: {
          rejectUnauthorized: false
        }
      });

      const info = await transporter.sendMail({
        from: fromAddress,
        to,
        subject,
        html,
        text
      });

      await logEmailDispatch(to, emailType, subject, 'sent', null, info.messageId, metadata);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      logger.error(`[SMTP SEND ERROR - ${emailType}]:`, err.message);
      await logEmailDispatch(to, emailType, subject, 'failed', err.message, null, metadata);
      return { success: false, error: err.message || 'Failed to send email via SMTP' };
    }
  } else {
    // Fallback to Resend SDK
    const resendClient = config.resend_api_key ? new Resend(config.resend_api_key) : resend;
    try {
      const { data, error } = await resendClient.emails.send({
        from: fromAddress,
        to,
        subject,
        html
      });

      if (error) {
        logger.error(`[RESEND ERROR - ${emailType}]:`, error.message || error);
        await logEmailDispatch(to, emailType, subject, 'failed', error.message || String(error), null, metadata);
        return { success: false, error: error.message || 'Failed to send email via Resend' };
      }

      await logEmailDispatch(to, emailType, subject, 'sent', null, data?.id, metadata);
      return { success: true, data };
    } catch (err) {
      logger.error(`[RESEND ERROR - ${emailType}]:`, err.message);
      await logEmailDispatch(to, emailType, subject, 'failed', err.message, null, metadata);
      return { success: false, error: err.message || 'Failed to send email via Resend' };
    }
  }
}

// Render dynamic email template replacing placeholders {{key}}
export async function renderAndSendTemplate(templateKey, recipient, variables = {}) {
  try {
    const templateRes = await pool.query('SELECT * FROM email_templates WHERE template_key = $1 AND is_active = true', [templateKey]);
    if (templateRes.rows.length === 0) {
      return { success: false, error: `Email template '${templateKey}' not found or inactive` };
    }

    const template = templateRes.rows[0];
    let subject = template.subject;
    let html = template.body_html;
    let text = template.body_text || '';

    // Replace variables
    Object.keys(variables).forEach((key) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      subject = subject.replace(regex, variables[key] || '');
      html = html.replace(regex, variables[key] || '');
      text = text.replace(regex, variables[key] || '');
    });

    return await sendEmail({
      to: recipient,
      subject,
      html,
      text,
      emailType: templateKey,
      metadata: { templateKey, variables }
    });
  } catch (err) {
    logger.error(`[TEMPLATE RENDER ERROR - ${templateKey}]:`, err.message);
    return { success: false, error: 'Failed to render and send email template' };
  }
}

// Rate limit: max 3 emails per address per hour
async function checkEmailRateLimit(email) {
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
  } catch (err) {
    // If Redis is not available or errors out, fallback to allowing the email send
    logger.error('[EMAIL RATE LIMIT ERROR]:', err.message);
    return true;
  }
}

export const sendPasswordReset = async (to, resetUrl) => {
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
  } catch (err) {
    logger.error('[EMAIL SEND ERROR - PASSWORD RESET]:', err.message);
    return { success: false, error: 'Failed to send password reset email' };
  }
};

export const sendWelcomeEmail = async (to, name) => {
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
  } catch (err) {
    logger.error('[EMAIL SEND ERROR - WELCOME]:', err.message);
    return { success: false, error: 'Failed to send welcome email' };
  }
};

export const sendAccountApprovalEmail = async (to, name) => {
  const loginUrl = process.env.USER_PORTAL_URL || 'https://app.neuravolt.cloud/login';
  const result = await renderAndSendTemplate('access_approval', to, { name: name || 'there', email: to, loginUrl });
  if (result.success) return result;

  // Fallback if template rendering fails
  return await sendEmail({
    to,
    subject: 'Your Neuravolt Cloud Access Has Been Approved',
    html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; padding: 24px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <h2 style="color: #6366f1; border-bottom: 2px solid #6366f1; padding-bottom: 12px; margin-top: 0;">Access Approved</h2>
        <p>Hi ${name || 'there'},</p>
        <p>Your access to Neuravolt Cloud has been approved.</p>
        <p>You can now sign in using the email address and password you used when requesting access.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${loginUrl}" style="display: inline-block; padding: 14px 28px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">Sign In to Neuravolt Cloud</a>
        </div>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 12px; color: #94a3b8;">Neuravolt Cloud · Sovereign Enterprise AI Platform</p>
      </div>
    `,
    emailType: 'access_approval'
  });
};

export const sendInvoiceReceipt = async (to, invoiceDetails) => {
  if (!(await checkEmailRateLimit(to))) {
    return {
      success: false,
      error: 'Rate limit exceeded. Max 3 emails per hour.',
    };
  }

  const {
    id,
    amount,
    currency = 'INR',
    status = 'paid',
    invoice_url,
    invoiceUrl,
    pdf_url,
    pdfUrl,
    provider = 'stripe',
    provider_invoice_id,
    invoice_number,
    plan_name = 'Enterprise AI OS Plan',
    payment_last4 = '4242',
  } = invoiceDetails;

  const finalInvoiceUrl = invoice_url || invoiceUrl || '#';
  const finalPdfUrl = pdf_url || pdfUrl || null;
  const invoiceNum = invoice_number || provider_invoice_id || (id ? id.substring(0, 8) : 'INV-001');
  const formattedAmount = (amount / (amount > 10000 ? 100 : 1)).toFixed(2);
  const formattedCurrency = currency.toUpperCase();

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 32px 20px; background-color: #f8fafc; color: #1e293b;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        
        <!-- Header -->
        <div style="border-bottom: 1px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h2 style="margin: 0; color: #4f46e5; font-size: 24px; font-weight: 800; letter-spacing: -0.02em;">Neuravolt Cloud</h2>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">Payment Receipt</p>
          </div>
          <span style="font-size: 14px; font-weight: 700; color: #059669; background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 4px 12px; border-radius: 20px;">
            ${status.toUpperCase()}
          </span>
        </div>

        <!-- Body -->
        <p style="font-size: 15px; color: #334155; line-height: 1.6;">
          Hello, thank you for your payment to <strong>Neuravolt Cloud</strong>. Your payment for invoice <strong>#${invoiceNum}</strong> has been processed successfully.
        </p>

        <!-- Invoice Details Box -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
            <tr style="border-bottom: 1px dashed #cbd5e1;">
              <td style="padding: 8px 0; color: #64748b;">Invoice Number:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #0f172a;">#${invoiceNum}</td>
            </tr>
            <tr style="border-bottom: 1px dashed #cbd5e1;">
              <td style="padding: 8px 0; color: #64748b;">Plan:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #0f172a;">${plan_name}</td>
            </tr>
            <tr style="border-bottom: 1px dashed #cbd5e1;">
              <td style="padding: 8px 0; color: #64748b;">Payment Method:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #0f172a;">•••• ${payment_last4} (${provider.toUpperCase()})</td>
            </tr>
            <tr>
              <td style="padding: 12px 0 4px 0; font-size: 16px; font-weight: 700; color: #0f172a;">Amount Paid:</td>
              <td style="padding: 12px 0 4px 0; text-align: right; font-size: 20px; font-weight: 800; color: #4f46e5;">${formattedAmount} ${formattedCurrency}</td>
            </tr>
          </table>
        </div>

        <!-- Action Buttons -->
        <div style="text-align: center; margin: 32px 0; display: flex; gap: 12px; justify-content: center;">
          <a href="${finalInvoiceUrl}" style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 700;">
            View Invoice
          </a>
          ${
            finalPdfUrl
              ? `<a href="${finalPdfUrl}" style="display: inline-block; padding: 12px 24px; background-color: #ffffff; border: 1px solid #cbd5e1; color: #334155; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">
                  Download PDF
                </a>`
              : ''
          }
        </div>

        <!-- Footer -->
        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 28px 0 20px 0;" />
        <div style="font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.5;">
          <p style="margin: 0 0 4px 0;">Need help? Contact our support team at <a href="mailto:support@neuravolt.cloud" style="color: #6366f1; text-decoration: none;">support@neuravolt.cloud</a> or read our <a href="https://neuravolt.cloud/billing-faq" style="color: #6366f1; text-decoration: none;">Billing FAQ</a>.</p>
          <p style="margin: 0;">Neuravolt Cloud Services India Pvt Ltd · Enterprise AI Operating System</p>
        </div>

      </div>
    </div>
  `;

  // 3x Retry Logic with Exponential Backoff (1s, 2s, 4s)
  let attempts = 0;
  const maxAttempts = 3;
  let lastError = null;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      const { data, error } = await resend.emails.send({
        from: 'Neuravolt Cloud Billing <noreply@neuravolt.cloud>',
        to,
        bcc: 'billing@neuravolt.cloud',
        subject: `Your Neuravolt Invoice — #${invoiceNum}`,
        html,
      });

      if (error) {
        lastError = error.message || String(error);
        logger.warn(`⚠️ [Email Retry ${attempts}/${maxAttempts}] Resend failed: ${lastError}`);
      } else {
        logger.info(`✅ [INVOICE EMAIL] Receipt sent successfully to ${to} for invoice #${invoiceNum}`);
        return { success: true, data };
      }
    } catch (err) {
      lastError = err.message || String(err);
      logger.warn(`⚠️ [Email Retry ${attempts}/${maxAttempts}] Resend threw exception: ${lastError}`);
    }

    if (attempts < maxAttempts) {
      const backoffMs = Math.pow(2, attempts - 1) * 1000;
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  logger.error(`❌ [INVOICE EMAIL FAILED] All ${maxAttempts} retries failed for invoice #${invoiceNum} (Recipient: ${to}). Error: ${lastError}`);
  return {
    success: false,
    error: `Failed to send invoice receipt after ${maxAttempts} retries: ${lastError}`,
  };
};

export const sendImpersonationAlert = async (to, details = {}) => {
  if (!(await checkEmailRateLimit(to))) {
    return {
      success: false,
      error: 'Rate limit exceeded. Max 3 emails per hour.',
    };
  }

  const adminName = details.adminName || 'System Administrator';
  const timestamp = details.timestamp || new Date().toISOString();
  const ip = details.ip || 'Unknown IP';

  try {
    const { data, error } = await resend.emails.send({
      from: 'Harikson AI <noreply@neuravolt.cloud>',
      to,
      subject: 'Security Alert: Account Impersonation Access',
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #e11d48; border-bottom: 2px solid #e11d48; padding-bottom: 10px;">Security Alert: Impersonation Access</h2>
          <p>An administrator has initiated an impersonation session and accessed your account.</p>
          <div style="background-color: #f8fafc; padding: 12px 16px; border-radius: 6px; border-left: 4px solid #e11d48; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>Administrator:</strong> ${adminName}</p>
            <p style="margin: 4px 0;"><strong>Timestamp:</strong> ${timestamp}</p>
            <p style="margin: 4px 0;"><strong>IP Address:</strong> ${ip}</p>
          </div>
          <p>This is a standard security notification to inform you that your workspace was accessed by system administration.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #94a3b8;">Secured by Harikson · Enterprise AI Platform</p>
        </div>
      `,
    });
    if (error) {
      logger.error('[EMAIL SEND ERROR - IMPERSONATION]:', error.message || error);
      return {
        success: false,
        error: error.message || 'Failed to send impersonation alert',
      };
    }
    return { success: true, data };
  } catch (err) {
    logger.error('[EMAIL SEND ERROR - IMPERSONATION]:', err.message);
    return { success: false, error: 'Failed to send impersonation alert' };
  }
};

