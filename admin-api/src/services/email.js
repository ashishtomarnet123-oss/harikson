import logger from '../utils/logger.js';
import { Resend } from 'resend';
import Redis from 'ioredis';
import nodemailer from 'nodemailer';
import pool from '../db.js';
import dns from 'dns/promises';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dev_key');
const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');

function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Helper to resolve potential host candidates (e.g., bare domain -> MX host or mail.domain)
export async function resolveSmtpHost(inputHost) {
  const host = (inputHost || '').trim();
  if (!host) return [host];

  // If host already starts with mail. or smtp. or is an IP address
  if (host.startsWith('mail.') || host.startsWith('smtp.') || /^(\d{1,3}\.){3}\d{1,3}$/.test(host)) {
    return [host];
  }

  const mxCandidates = [];
  try {
    const mxRecords = await dns.resolveMx(host);
    if (mxRecords && mxRecords.length > 0) {
      const sorted = mxRecords.sort((a, b) => a.priority - b.priority);
      for (const r of sorted) {
        if (r.exchange && !mxCandidates.includes(r.exchange)) {
          mxCandidates.push(r.exchange);
        }
      }
    }
  } catch {
    // ignore DNS MX lookup errors
  }

  const mailPrefix = `mail.${host}`;
  const smtpPrefix = `smtp.${host}`;

  // Prioritize MX records and common mail prefixes before the bare domain
  const candidates = [...mxCandidates];
  if (!candidates.includes(mailPrefix)) candidates.push(mailPrefix);
  if (!candidates.includes(smtpPrefix)) candidates.push(smtpPrefix);
  if (!candidates.includes(host)) candidates.push(host);

  return candidates;
}

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
    from_email: 'noreply@xarwiz.com',
    from_name: 'Xarwiz'
  };
}

// Helper to test SMTP connection
export async function verifySmtpConnection(config) {
  if (!config) {
    return { success: false, error: 'Configuration is required' };
  }

  if (config.provider === 'resend') {
    if (!config.resend_api_key || config.resend_api_key === 're_dev_key') {
      return { success: false, error: 'Invalid or default dev Resend API key provided' };
    }
    return { success: true, message: 'Resend API key configured' };
  }

  if (!config.smtp_host) {
    return { success: false, error: 'SMTP host is required' };
  }

  const port = parseInt(config.smtp_port) || 587;
  const is465 = port === 465;
  const hostCandidates = await resolveSmtpHost(config.smtp_host);
  let lastError = null;

  for (const candidateHost of hostCandidates) {
    try {
      const transporter = nodemailer.createTransport({
        host: candidateHost,
        port,
        secure: config.smtp_secure !== false && is465,
        auth: (config.smtp_user && config.smtp_pass) ? {
          user: config.smtp_user,
          pass: config.smtp_pass
        } : undefined,
        tls: {
          rejectUnauthorized: false
        },
        connectionTimeout: 5000,
        greetingTimeout: 4000,
        socketTimeout: 5000
      });

      await transporter.verify();
      const message = candidateHost !== config.smtp_host
        ? `SMTP server connection verified successfully via ${candidateHost}!`
        : 'SMTP server connection verified successfully!';
      return { success: true, message, resolvedHost: candidateHost };
    } catch (err) {
      lastError = err;
      logger.warn(`[SMTP VERIFICATION ATTEMPT FAILED on ${candidateHost}]: ${err.message}`);
      // If authentication error, do not keep trying other candidates
      const lower = (err.message || '').toLowerCase();
      if (err.code === 'EAUTH' || err.responseCode === 535 || lower.includes('auth')) {
        break;
      }
    }
  }

  logger.error('[SMTP VERIFICATION ERROR]:', lastError?.message);
  let errorMsg = lastError?.message || 'Failed to connect to SMTP server';
  const lowerMsg = (lastError?.message || '').toLowerCase();
  if (lastError?.code === 'ETIMEDOUT' || lowerMsg.includes('etimedout') || lowerMsg.includes('timedout') || lowerMsg.includes('timeout') || lowerMsg.includes('greeting never received')) {
    errorMsg = `Connection timeout: Could not connect to SMTP server at ${config.smtp_host}:${port}. Please verify the host, port, and network firewall.`;
  } else if (lastError?.code === 'ECONNREFUSED' || lowerMsg.includes('econnrefused')) {
    errorMsg = `Connection refused: SMTP server at ${config.smtp_host}:${port} rejected the connection.`;
  } else if (lastError?.code === 'ENOTFOUND' || lowerMsg.includes('enotfound')) {
    errorMsg = `Host not found: Could not resolve hostname "${config.smtp_host}".`;
  } else if (lastError?.code === 'EAUTH' || lastError?.responseCode === 535 || lowerMsg.includes('auth')) {
    errorMsg = 'Authentication failed: Invalid SMTP username or password.';
  }
  return { success: false, error: errorMsg };
}

// Universal Email Dispatcher (Supports both Resend & Custom SMTP)
export async function sendEmail({ to, subject, html, text, emailType = 'custom', metadata = {}, bypassRateLimit = true, maxLimit = 50 }) {
  if (!bypassRateLimit && !(await checkEmailRateLimit(to, maxLimit))) {
    await logEmailDispatch(to, emailType, subject, 'failed', `Rate limit exceeded. Max ${maxLimit} emails per hour.`);
    return { success: false, error: `Rate limit exceeded. Max ${maxLimit} emails per hour.` };
  }

  const config = await getActiveSmtpConfig();
  const fromAddress = `"${config.from_name || 'Xarwiz'}" <${config.from_email || 'noreply@xarwiz.com'}>`;

  if (config.provider === 'smtp') {
    const port = parseInt(config.smtp_port) || 587;
    const is465 = port === 465;
    const hostCandidates = await resolveSmtpHost(config.smtp_host);
    let lastError = null;

    for (const candidateHost of hostCandidates) {
      try {
        const transporter = nodemailer.createTransport({
          host: candidateHost,
          port,
          secure: config.smtp_secure !== false && is465,
          auth: (config.smtp_user && config.smtp_pass) ? {
            user: config.smtp_user,
            pass: config.smtp_pass
          } : undefined,
          tls: {
            rejectUnauthorized: false
          },
          connectionTimeout: 5000,
          greetingTimeout: 4000,
          socketTimeout: 5000
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
        lastError = err;
        logger.error(`[SMTP SEND ERROR - ${emailType} on ${candidateHost}]:`, err.message);
        const lower = (err.message || '').toLowerCase();
        if (err.code === 'EAUTH' || err.responseCode === 535 || lower.includes('auth')) {
          break;
        }
      }
    }

    await logEmailDispatch(to, emailType, subject, 'failed', lastError?.message, null, metadata);
    return { success: false, error: lastError?.message || 'Failed to send email via SMTP' };
  } else {
    // Fallback to Resend SDK
    const apiKey = config.resend_api_key || process.env.RESEND_API_KEY;
    if (!apiKey || apiKey === 're_dev_key' || !apiKey.startsWith('re_')) {
      logger.warn(`[EMAIL NOT CONFIGURED] Resend API key missing or default dev key for recipient ${to}`);
      await logEmailDispatch(to, emailType, subject, 'failed', 'Resend API key is not configured or invalid.', null, metadata);
      return {
        success: false,
        notConfigured: true,
        error: 'Email provider not configured. Please set RESEND_API_KEY in environment or configure custom SMTP in Admin Settings > Emails.'
      };
    }

    const resendClient = new Resend(apiKey);
    try {
      const { data, error } = await resendClient.emails.send({
        from: fromAddress,
        to,
        subject,
        html
      });

      if (error) {
        logger.error(`[RESEND ERROR - ${emailType}]:`, error.message || error);
        let errorMsg = error.message || String(error);
        if (errorMsg.toLowerCase().includes('api key is invalid')) {
          errorMsg = 'Resend API key is invalid. Please update your API key in Admin Settings > Emails or check environment variables.';
        }
        await logEmailDispatch(to, emailType, subject, 'failed', errorMsg, null, metadata);
        return { success: false, error: errorMsg };
      }

      await logEmailDispatch(to, emailType, subject, 'sent', null, data?.id, metadata);
      return { success: true, data };
    } catch (err) {
      logger.error(`[RESEND ERROR - ${emailType}]:`, err.message);
      let errorMsg = err.message || 'Failed to send email via Resend';
      if (errorMsg.toLowerCase().includes('api key is invalid')) {
        errorMsg = 'Resend API key is invalid. Please update your API key in Admin Settings > Emails or check environment variables.';
      }
      await logEmailDispatch(to, emailType, subject, 'failed', errorMsg, null, metadata);
      return { success: false, error: errorMsg };
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

    Object.keys(variables).forEach((key) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      const raw = variables[key] || '';
      const safe = escapeHtml(raw);
      subject = subject.replace(regex, raw);
      html = html.replace(regex, safe);
      text = text.replace(regex, raw);
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

// Rate limit: configurable max emails per address per hour (default 50 for admin actions)
export async function checkEmailRateLimit(email, maxLimit = 50) {
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
  } catch (err) {
    // If Redis is not available or errors out, fallback to allowing the email send
    logger.error('[EMAIL RATE LIMIT ERROR]:', err.message);
    return true;
  }
}

// Reset / clear rate limit key for a specific email
export async function resetEmailRateLimit(email) {
  if (!email) return false;
  try {
    const key = `ratelimit:emails:${email.toLowerCase().trim()}`;
    await redis.del(key);
    logger.info(`[EMAIL RATE LIMIT RESET] Cleared rate limit key for "${email}"`);
    return true;
  } catch (err) {
    logger.warn('[EMAIL RATE LIMIT RESET ERROR]:', err.message);
    return false;
  }
}

export const sendPasswordReset = async (to, resetUrl, options = {}) => {
  return await sendEmail({
    to,
    subject: 'Reset your password',
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #3b82f6; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">Password Reset Request</h2>
        <p>We received a request to reset your password for your Xarwiz AI account.</p>
        <p>Please click the button below to reset your password (link is valid for 1 hour):</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${escapeHtml(resetUrl)}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
        </div>
        <p style="font-size: 13px; color: #64748b;">If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="font-size: 13px; color: #3b82f6; word-break: break-all;">${escapeHtml(resetUrl)}</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #94a3b8;">If you did not request a password reset, you can safely ignore this email.</p>
      </div>
    `,
    emailType: 'password_reset',
    bypassRateLimit: options.bypassRateLimit ?? true,
    maxLimit: options.maxLimit ?? 50,
  });
};

export const sendWelcomeEmail = async (to, name, options = {}) => {
  return await sendEmail({
    to,
    subject: 'Welcome to Xarwiz AI!',
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #10b981; border-bottom: 2px solid #10b981; padding-bottom: 10px;">Welcome to Xarwiz AI!</h2>
        <p>Hello ${escapeHtml(name || 'there')},</p>
        <p>Thank you for signing up to Xarwiz AI Platform. Your workspace is now active and ready to build state-of-the-art AI systems.</p>
        <p>Visit your dashboard to create your first agent or knowledge base documents library.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #94a3b8;">Secured by Xarwiz · Enterprise AI Platform</p>
      </div>
    `,
    emailType: 'welcome',
    bypassRateLimit: options.bypassRateLimit ?? true,
    maxLimit: options.maxLimit ?? 50,
  });
};

export const sendAccountApprovalEmail = async (to, name) => {
  const loginUrl = process.env.USER_PORTAL_URL || 'https://app.xarwiz.com/login';
  const result = await renderAndSendTemplate('access_approval', to, { name: name || 'there', email: to, loginUrl });
  if (result.success) return result;

  // Fallback if template rendering fails
  return await sendEmail({
    to,
    subject: 'Your Xarwiz Access Has Been Approved',
    html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; padding: 24px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <h2 style="color: #6366f1; border-bottom: 2px solid #6366f1; padding-bottom: 12px; margin-top: 0;">Access Approved</h2>
        <p>Hi ${escapeHtml(name || 'there')},</p>
        <p>Your access to Xarwiz has been approved.</p>
        <p>You can now sign in using the email address and password you used when requesting access.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${escapeHtml(loginUrl)}" style="display: inline-block; padding: 14px 28px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">Sign In to Xarwiz</a>
        </div>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 12px; color: #94a3b8;">Xarwiz · Sovereign Enterprise AI Platform</p>
      </div>
    `,
    emailType: 'access_approval'
  });
};

export const sendInvoiceReceipt = async (to, invoiceDetails, options = {}) => {
  const bypassRateLimit = options.bypassRateLimit ?? true;
  const maxLimit = options.maxLimit ?? 50;
  if (!bypassRateLimit && !(await checkEmailRateLimit(to, maxLimit))) {
    return {
      success: false,
      error: `Rate limit exceeded. Max ${maxLimit} emails per hour.`,
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
            <h2 style="margin: 0; color: #4f46e5; font-size: 24px; font-weight: 800; letter-spacing: -0.02em;">Xarwiz</h2>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">Payment Receipt</p>
          </div>
          <span style="font-size: 14px; font-weight: 700; color: #059669; background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 4px 12px; border-radius: 20px;">
            ${status.toUpperCase()}
          </span>
        </div>

        <!-- Body -->
        <p style="font-size: 15px; color: #334155; line-height: 1.6;">
          Hello, thank you for your payment to <strong>Xarwiz</strong>. Your payment for invoice <strong>#${invoiceNum}</strong> has been processed successfully.
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
          <p style="margin: 0 0 4px 0;">Need help? Contact our support team at <a href="mailto:support@xarwiz.com" style="color: #6366f1; text-decoration: none;">support@xarwiz.com</a> or read our <a href="https://xarwiz.com/billing-faq" style="color: #6366f1; text-decoration: none;">Billing FAQ</a>.</p>
          <p style="margin: 0;">Xarwiz Services India Pvt Ltd · Enterprise AI Operating System</p>
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
        from: 'Xarwiz Billing <noreply@xarwiz.com>',
        to,
        bcc: 'billing@xarwiz.com',
        subject: `Your Xarwiz Invoice — #${invoiceNum}`,
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

export const sendImpersonationAlert = async (to, details = {}, options = {}) => {
  const adminName = details.adminName || 'System Administrator';
  const timestamp = details.timestamp || new Date().toISOString();
  const ip = details.ip || 'Unknown IP';

  return await sendEmail({
    to,
    subject: 'Security Alert: Account Impersonation Access',
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #e11d48; border-bottom: 2px solid #e11d48; padding-bottom: 10px;">Security Alert: Impersonation Access</h2>
        <p>An administrator has initiated an impersonation session and accessed your account.</p>
        <div style="background-color: #f8fafc; padding: 12px 16px; border-radius: 6px; border-left: 4px solid #e11d48; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>Administrator:</strong> ${escapeHtml(adminName)}</p>
          <p style="margin: 4px 0;"><strong>Timestamp:</strong> ${escapeHtml(timestamp)}</p>
          <p style="margin: 4px 0;"><strong>IP Address:</strong> ${escapeHtml(ip)}</p>
        </div>
        <p>This is a standard security notification to inform you that your workspace was accessed by system administration.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #94a3b8;">Secured by Xarwiz · Enterprise AI Platform</p>
      </div>
    `,
    emailType: 'impersonation_alert',
    bypassRateLimit: options.bypassRateLimit ?? true,
    maxLimit: options.maxLimit ?? 50,
  });
};

