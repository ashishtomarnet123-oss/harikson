import logger from '../utils/logger.js';
import { Resend } from 'resend';
import Redis from 'ioredis';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dev_key');
const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');

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

