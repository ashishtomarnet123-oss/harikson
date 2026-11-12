import express from 'express';
import crypto from 'crypto';
import pool from '../db.js';
import redis from '../redis.js';
import logger from '../utils/logger.js';
import { adminAuth } from '../middleware/adminAuth.js';
import { validate } from '../middleware/validation.middleware.js';
import {
  sendEmailSchema,
  smtpConfigSchema,
  createEmailTemplateSchema,
  updateEmailTemplateSchema,
} from '../validators/admin.schema.js';
import {
  sendAccountApprovalEmail,
  sendWelcomeEmail,
  sendPasswordReset,
  getActiveSmtpConfig,
  verifySmtpConnection,
  resetEmailRateLimit,
  resolveSmtpHost,
} from '../services/email.js';
import {
  encryptSecret,
  decryptSecret,
  redactSmtpConfig,
  verifyResendWebhookSignature,
} from '../services/emailCrypto.js';
import {
  enqueueEmailJob,
  getEmailJobStatus,
} from '../services/emailQueue.js';

const router = express.Router();

// GET /admin/emails/logs & /v1/admin/emails/logs
const handleGetEmailLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, status, search } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

    let whereConditions = [];
    let params = [];
    let paramIdx = 1;

    if (type) {
      whereConditions.push(`email_type = $${paramIdx++}`);
      params.push(type);
    }

    if (status) {
      whereConditions.push(`status = $${paramIdx++}`);
      params.push(status);
    }

    if (search) {
      whereConditions.push(`(recipient ILIKE $${paramIdx} OR subject ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countRes = await pool.query(`SELECT COUNT(*) FROM email_logs ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].count);

    const logsRes = await pool.query(
      `SELECT id, recipient, email_type, subject, status, error_message, resend_id, created_at
       FROM email_logs ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      success: true,
      logs: logsRes.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    logger.error('Failed to get email logs:', err);
    res.status(500).json({ error: 'Failed to retrieve email telemetry logs' });
  }
};

router.get(['/admin/emails/logs', '/v1/admin/emails/logs'], adminAuth, handleGetEmailLogs);

// GET /admin/emails/stats & /v1/admin/emails/stats
const handleGetEmailStats = async (req, res) => {
  try {
    const statsRes = await pool.query(`
      SELECT
        COUNT(*) as total_sent,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as successful_count,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
        COUNT(CASE WHEN email_type = 'invoice_receipt' THEN 1 END) as invoices_count,
        COUNT(CASE WHEN email_type = 'access_approval' THEN 1 END) as approvals_count,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 hour' THEN 1 END) as last_hour_count
      FROM email_logs
    `);

    const row = statsRes.rows[0] || {};
    const total = parseInt(row.total_sent || 0);
    const successful = parseInt(row.successful_count || 0);

    res.json({
      success: true,
      stats: {
        totalSent: total,
        successfulCount: successful,
        failedCount: parseInt(row.failed_count || 0),
        invoicesCount: parseInt(row.invoices_count || 0),
        approvalsCount: parseInt(row.approvals_count || 0),
        lastHourCount: parseInt(row.last_hour_count || 0),
        successRate: total > 0 ? ((successful / total) * 100).toFixed(1) : '100.0',
      },
    });
  } catch (err) {
    logger.error('Failed to get email stats:', err);
    res.status(500).json({ error: 'Failed to retrieve email telemetry stats' });
  }
};

router.get(['/admin/emails/stats', '/v1/admin/emails/stats'], adminAuth, handleGetEmailStats);

// POST /admin/users/:userId/send-email & /v1/admin/users/:userId/send-email
const handleSendUserEmail = async (req, res) => {
  const { userId } = req.params;
  const { emailType } = req.body;

  try {
    const userRes = await pool.query('SELECT id, email, name, status, tenant_id FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userRes.rows[0];

    await resetEmailRateLimit(user.email);

    let result = { success: false };
    if (emailType === 'approval') {
      result = await sendAccountApprovalEmail(user.email, user.name);
    } else if (emailType === 'welcome') {
      result = await sendWelcomeEmail(user.email, user.name);
    } else if (emailType === 'password_reset') {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await pool.query(
        `INSERT INTO password_reset_tokens (tenant_id, user_id, token_hash, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [user.tenant_id, user.id, resetTokenHash, expiresAt]
      );
      const userPortalBase = process.env.USER_PORTAL_URL || process.env.NEXTAUTH_URL || 'https://xarwiz.com';
      const resetUrl = `${userPortalBase.replace(/\/+$/, '')}/reset-password?token=${resetToken}`;
      result = await sendPasswordReset(user.email, resetUrl, { bypassRateLimit: true });
    } else {
      return res.status(400).json({ error: 'Invalid emailType specified' });
    }

    if (!result.success) {
      return res.status(500).json({ error: result.error || 'Failed to dispatch email' });
    }

    res.json({
      success: true,
      message: `Transactional email (${emailType}) sent successfully to ${user.email}`,
      result,
    });
  } catch (err) {
    logger.error('Failed to manually send email to user:', err);
    res.status(500).json({ error: 'Failed to dispatch email to user' });
  }
};

router.post(['/admin/users/:userId/send-email', '/v1/admin/users/:userId/send-email'], adminAuth, handleSendUserEmail);

// Reset email rate limit for a specific user
const handleResetEmailRateLimit = async (req, res) => {
  const { userId } = req.params;
  try {
    const userRes = await pool.query('SELECT id, email FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userRes.rows[0];
    await resetEmailRateLimit(user.email);
    res.json({ success: true, message: `Email rate limit has been reset for ${user.email}` });
  } catch (err) {
    logger.error('Failed to reset email rate limit for user:', err);
    res.status(500).json({ error: 'Failed to reset email rate limit' });
  }
};

router.post(['/admin/users/:userId/reset-email-rate-limit', '/v1/admin/users/:userId/reset-email-rate-limit'], adminAuth, handleResetEmailRateLimit);

// --- EMAIL TEMPLATES CRUD ---

// GET /admin/emails/templates & /v1/admin/emails/templates
const handleGetTemplates = async (req, res) => {
  try {
    const templatesRes = await pool.query('SELECT * FROM email_templates ORDER BY created_at ASC');
    res.json({ success: true, templates: templatesRes.rows });
  } catch (err) {
    logger.error('Failed to fetch email templates:', err);
    res.status(500).json({ error: 'Failed to fetch email templates' });
  }
};
router.get(['/admin/emails/templates', '/v1/admin/emails/templates'], adminAuth, handleGetTemplates);

// POST /admin/emails/templates & /v1/admin/emails/templates - Create template
const handleCreateTemplate = async (req, res) => {
  const { template_key, name, subject, body_html, body_text, available_variables } = req.body;

  try {
    const insertRes = await pool.query(
      `INSERT INTO email_templates (template_key, name, subject, body_html, body_text, available_variables)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [template_key, name, subject, body_html, body_text || '', JSON.stringify(available_variables || [])]
    );
    res.status(201).json({ success: true, template: insertRes.rows[0] });
  } catch (err) {
    logger.error('Failed to create email template:', err);
    res.status(500).json({ error: err.message || 'Failed to create email template' });
  }
};
router.post(['/admin/emails/templates', '/v1/admin/emails/templates'], adminAuth, validate(createEmailTemplateSchema), handleCreateTemplate);

// PUT /admin/emails/templates/:id & /v1/admin/emails/templates/:id - Update template
const handleUpdateTemplate = async (req, res) => {
  const { id } = req.params;
  const { name, subject, body_html, body_text, available_variables, is_active } = req.body;

  try {
    const updateRes = await pool.query(
      `UPDATE email_templates
       SET name = COALESCE($1, name),
           subject = COALESCE($2, subject),
           body_html = COALESCE($3, body_html),
           body_text = COALESCE($4, body_text),
           available_variables = COALESCE($5, available_variables),
           is_active = COALESCE($6, is_active),
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [name, subject, body_html, body_text, available_variables ? JSON.stringify(available_variables) : null, is_active, id]
    );
    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json({ success: true, template: updateRes.rows[0] });
  } catch (err) {
    logger.error('Failed to update email template:', err);
    res.status(500).json({ error: 'Failed to update email template' });
  }
};
router.put(['/admin/emails/templates/:id', '/v1/admin/emails/templates/:id'], adminAuth, validate(updateEmailTemplateSchema), handleUpdateTemplate);

// DELETE /admin/emails/templates/:id & /v1/admin/emails/templates/:id - Delete template
const handleDeleteTemplate = async (req, res) => {
  const { id } = req.params;
  try {
    const delRes = await pool.query('DELETE FROM email_templates WHERE id = $1 RETURNING *', [id]);
    if (delRes.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json({ success: true, message: 'Template deleted successfully' });
  } catch (err) {
    logger.error('Failed to delete email template:', err);
    res.status(500).json({ error: 'Failed to delete email template' });
  }
};
router.delete(['/admin/emails/templates/:id', '/v1/admin/emails/templates/:id'], adminAuth, handleDeleteTemplate);

// --- SMTP CONFIGURATION & TESTING ---

// GET /admin/emails/smtp & /v1/admin/emails/smtp
const handleGetSmtpConfig = async (req, res) => {
  try {
    const config = await getActiveSmtpConfig();
    res.json({ success: true, config: redactSmtpConfig(config) });
  } catch (err) {
    logger.error('Failed to get SMTP config:', err);
    res.status(500).json({ error: 'Failed to retrieve SMTP configuration' });
  }
};
router.get(['/admin/emails/smtp', '/v1/admin/emails/smtp'], adminAuth, handleGetSmtpConfig);

// PUT /admin/emails/smtp & /v1/admin/emails/smtp - Update SMTP config
const handleUpdateSmtpConfig = async (req, res) => {
  let { provider, resend_api_key, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure, from_email, from_name } = req.body;

  try {
    const rawRes = await pool.query(
      'SELECT smtp_pass, resend_api_key FROM smtp_configs WHERE is_active = true ORDER BY updated_at DESC LIMIT 1'
    );
    const rawCurrent = rawRes.rows[0];

    const isMaskedPassword = !smtp_pass || smtp_pass.trim() === '' || smtp_pass.includes('••••');
    if (isMaskedPassword) {
      smtp_pass = rawCurrent?.smtp_pass || null;
    } else {
      smtp_pass = encryptSecret(smtp_pass.trim());
    }

    const isMaskedApiKey = !resend_api_key || resend_api_key.trim() === '' || resend_api_key.includes('••••');
    if (isMaskedApiKey) {
      resend_api_key = rawCurrent?.resend_api_key || null;
    } else {
      resend_api_key = encryptSecret(resend_api_key.trim());
    }

    const portNum = smtp_port ? parseInt(smtp_port, 10) : 587;
    const isSecure = smtp_secure !== undefined ? Boolean(smtp_secure) : portNum === 465;

    if (provider === 'smtp' && smtp_host) {
      try {
        const candidates = await resolveSmtpHost(smtp_host);
        if (candidates.length > 0 && candidates[0] !== smtp_host) {
          const testRes = await verifySmtpConnection({
            smtp_host: candidates[0],
            smtp_port: portNum,
            smtp_user,
            smtp_pass: decryptSecret(smtp_pass),
            smtp_secure: isSecure,
          });
          if (testRes.success) {
            smtp_host = candidates[0];
          }
        }
      } catch {
        // Fallback to provided host
      }
    }

    await pool.query('UPDATE smtp_configs SET is_active = false WHERE is_active = true');

    const insertRes = await pool.query(
      `INSERT INTO smtp_configs (provider, resend_api_key, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure, from_email, from_name, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
       RETURNING *`,
      [provider || 'smtp', resend_api_key, smtp_host, portNum, smtp_user, smtp_pass, isSecure, from_email || 'noreply@xarwiz.com', from_name || 'Xarwiz']
    );

    res.json({
      success: true,
      message: 'SMTP settings updated and activated successfully',
      config: redactSmtpConfig(insertRes.rows[0]),
      resolvedHost: smtp_host,
    });
  } catch (err) {
    logger.error('Failed to update SMTP config:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to update SMTP configuration' });
  }
};
router.put(['/admin/emails/smtp', '/v1/admin/emails/smtp'], adminAuth, validate(smtpConfigSchema), handleUpdateSmtpConfig);

// POST /admin/emails/smtp/test & /v1/admin/emails/smtp/test - Test connection
const handleTestSmtpConfig = async (req, res) => {
  const config = { ...req.body };
  try {
    if (!config.smtp_pass || config.smtp_pass.trim() === '' || config.smtp_pass === '••••••••') {
      const active = await getActiveSmtpConfig();
      if (active?.smtp_pass) {
        config.smtp_pass = active.smtp_pass;
      }
    }
    const testResult = await verifySmtpConnection(config);
    if (!testResult.success) {
      return res.status(400).json({ success: false, error: testResult.error });
    }
    res.json({
      success: true,
      message: testResult.message || 'SMTP Server Connection Verified Successfully!',
      resolvedHost: testResult.resolvedHost,
    });
  } catch (err) {
    logger.error('SMTP Test Failed:', err);
    res.status(400).json({ success: false, error: err.message || 'Failed to verify SMTP server connection' });
  }
};
router.post(['/admin/emails/smtp/test', '/v1/admin/emails/smtp/test'], adminAuth, handleTestSmtpConfig);

// POST /admin/emails/send-custom & /v1/admin/emails/send-custom - Send broadcast/custom mail
const handleSendCustomMail = async (req, res) => {
  const { recipientType, recipientEmail, templateKey, subject, body_html, variables } = req.body;

  try {
    let recipients = [];
    if (recipientType === 'all') {
      const usersRes = await pool.query(`
        SELECT u.id, u.email 
        FROM users u
        WHERE u.status = 'active'
          AND u.deleted_at IS NULL
          AND EXISTS (
            SELECT 1 FROM user_consents uc 
            WHERE uc.user_id = u.id 
              AND uc.purpose_id = 'marketing_emails' 
              AND uc.status = 'granted'
              AND (uc.valid_until IS NULL OR uc.valid_until > NOW())
          )
          AND NOT EXISTS (
            SELECT 1 FROM email_logs el
            WHERE el.recipient = u.email
              AND el.status IN ('bounced', 'complained')
          )
      `);
      recipients = usersRes.rows.map(u => u.email);
    } else {
      if (!recipientEmail) {
        return res.status(400).json({ error: 'recipientEmail is required for individual mail' });
      }

      const checkRes = await pool.query(`
        SELECT 
          EXISTS (
            SELECT 1 FROM user_consents uc
            JOIN users u ON u.id = uc.user_id
            WHERE u.email = $1
              AND uc.purpose_id = 'marketing_emails' 
              AND uc.status = 'granted'
              AND (uc.valid_until IS NULL OR uc.valid_until > NOW())
          ) AS has_affirmative_consent,
          EXISTS (
            SELECT 1 FROM user_consents uc
            JOIN users u ON u.id = uc.user_id
            WHERE u.email = $1
              AND uc.purpose_id = 'marketing_emails' 
              AND uc.status IN ('declined', 'withdrawn')
          ) AS has_explicitly_declined,
          EXISTS (
            SELECT 1 FROM email_logs el
            WHERE el.recipient = $1
              AND el.status IN ('bounced', 'complained')
          ) AS is_suppressed
      `, [recipientEmail]);

      const { has_affirmative_consent, has_explicitly_declined, is_suppressed } = checkRes.rows[0] || {};

      if (is_suppressed) {
        return res.status(400).json({
          error: 'Recipient address is on the delivery suppression list due to a previous bounce or complaint',
        });
      }

      if (has_explicitly_declined || !has_affirmative_consent) {
        return res.status(400).json({
          error: 'Recipient does not have active affirmative consent for marketing communications (DPDP Act 2023)',
        });
      }

      recipients = [recipientEmail];
    }

    if (recipients.length === 0) {
      return res.status(400).json({ error: 'No eligible recipients found to dispatch mail' });
    }

    const job = await enqueueEmailJob({
      recipients,
      templateKey,
      subject,
      body_html,
      variables,
      emailType: recipientType === 'all' ? 'marketing_broadcast' : 'custom_broadcast',
      metadata: { recipientType, requestedBy: req.user?.id || 'admin' },
    });

    res.status(202).json({
      success: true,
      message: `Email dispatch job enqueued for ${recipients.length} recipient(s)`,
      jobId: job.jobId,
      recipientCount: recipients.length,
      status: 'queued',
    });
  } catch (err) {
    logger.error('Failed to enqueue custom mail:', err);
    res.status(500).json({ error: 'Failed to enqueue custom email' });
  }
};
router.post(['/admin/emails/send-custom', '/v1/admin/emails/send-custom'], adminAuth, validate(sendEmailSchema), handleSendCustomMail);

// GET /admin/emails/jobs/:jobId & /v1/admin/emails/jobs/:jobId - Track email job status
const handleGetEmailJobStatus = async (req, res) => {
  try {
    const status = await getEmailJobStatus(req.params.jobId);
    if (!status) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json({ success: true, job: status });
  } catch (err) {
    logger.error('Failed to get email job status:', err);
    res.status(500).json({ error: 'Failed to retrieve email job status' });
  }
};
router.get(['/admin/emails/jobs/:jobId', '/v1/admin/emails/jobs/:jobId'], adminAuth, handleGetEmailJobStatus);

// POST /webhooks/email & /v1/webhooks/email - Webhook for email delivery status
const handleEmailWebhook = async (req, res) => {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  const isProd = process.env.NODE_ENV === 'production';

  if (!webhookSecret) {
    if (isProd) {
      logger.error('[EMAIL WEBHOOK] RESEND_WEBHOOK_SECRET is not configured in production mode');
      return res.status(401).json({ error: 'Webhook secret is not configured' });
    } else {
      logger.warn('[EMAIL WEBHOOK] Warning: RESEND_WEBHOOK_SECRET is not set; running in development mode');
    }
  } else {
    const rawBodyBuffer = req.rawBody || (req.body ? Buffer.from(JSON.stringify(req.body), 'utf8') : Buffer.from(''));
    const verifyResult = verifyResendWebhookSignature({
      rawBody: rawBodyBuffer,
      headers: req.headers,
      secret: webhookSecret,
      toleranceSeconds: 300,
    });

    if (!verifyResult.valid) {
      logger.warn('[EMAIL WEBHOOK] Rejected invalid webhook signature:', verifyResult.error);
      return res.status(401).json({ error: 'Invalid webhook signature', details: verifyResult.error });
    }
  }

  const event = req.body;
  try {
    const eventType = event?.type;
    const emailId = event?.data?.email_id || event?.data?.id;

    if (!eventType || !emailId) {
      return res.status(400).json({ error: 'Invalid webhook payload structure' });
    }

    const svixId = req.headers['svix-id'] || event.data?.id || emailId;
    if (svixId) {
      const dedupKey = `xarwiz:email_webhook_seen:${svixId}`;
      try {
        const isNew = await redis.set(dedupKey, '1', 'EX', 86400, 'NX');
        if (!isNew) {
          logger.info(`📬 [EMAIL WEBHOOK] Duplicate webhook event ${svixId} ignored`);
          return res.status(200).json({ success: true, duplicate: true, message: 'Event already processed' });
        }
      } catch (redisErr) {
        logger.warn('[EMAIL WEBHOOK] Dedup cache check failed, proceeding:', redisErr.message);
      }
    }

    let status = null;
    if (eventType === 'email.delivered') status = 'delivered';
    else if (eventType === 'email.bounced') status = 'bounced';
    else if (eventType === 'email.complained') status = 'complained';

    if (status) {
      await pool.query(
        `UPDATE email_logs
         SET status = $1,
             error_message = COALESCE($2, error_message),
             metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{webhook_event}', $3::jsonb)
         WHERE resend_id = $4`,
        [
          status,
          eventType === 'email.bounced' ? (event.data?.bounce_type || 'bounced') : null,
          JSON.stringify(event),
          emailId,
        ]
      );
      logger.info(`📬 [EMAIL WEBHOOK] Updated email log ${emailId} to ${status}`);
    }

    res.json({ success: true, received: true });
  } catch (err) {
    logger.error('Failed to process email webhook:', err);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
};

router.post(['/webhooks/email', '/v1/webhooks/email', '/api/admin/email/webhook', '/api/v1/admin/email/webhook'], handleEmailWebhook);

export default router;

