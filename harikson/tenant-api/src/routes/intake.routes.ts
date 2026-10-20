import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../db/pool.js';
import logger from '../utils/logger.js';
import { requireAuth } from '../middleware/auth.js';
import { Resend } from 'resend';
import { Redis } from 'ioredis';

const router = Router();
const resend = new Resend(process.env.RESEND_API_KEY || 're_dev_key');

// Distributed Rate Limiting for Public Submissions:
// Max 10 requests per 15 minutes per IP address
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_SUBMISSIONS_PER_WINDOW = 10;

interface RateLimitEntry {
  count: number;
  windowStart: number;
}
const rateLimitMap = new Map<string, RateLimitEntry>();

// Atomic Lua script: atomically increments counter and sets expiration (900 seconds) if key is newly created
// or if key exists without TTL. Ensures concurrency safety and avoids permanently unexpired keys.
// Limiter Model: Fixed-window counter per IP address (15 minute window from initial request).
const LUA_INCR_EXPIRE = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
elseif redis.call('TTL', KEYS[1]) == -1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return current
`;

// Redis client for distributed rate limiting in clustered environments
let redisClient: Redis | null = null;
if (process.env.REDIS_URL) {
  try {
    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 1500,
      retryStrategy: () => null,
      enableOfflineQueue: false,
    });
    redisClient.on('error', (err) => {
      // Safe structured log without PII or sensitive data
      logger.warn(
        { event: 'intake_rate_limiter_redis_error', error: err?.message || 'Redis connection error' },
        '[RATE LIMITER] Redis client error — falling back to single-node in-memory limiter'
      );
    });
  } catch (err: any) {
    logger.warn(
      { event: 'intake_rate_limiter_redis_init_failed', error: err?.message },
      '[RATE LIMITER] Redis initialization failed — using single-node in-memory limiter'
    );
    redisClient = null;
  }
}

async function checkIntakeRateLimit(ip: string): Promise<boolean> {
  // If Redis is reachable, coordinate across horizontal pods using atomic Lua script
  if (redisClient && redisClient.status === 'ready') {
    try {
      const key = `ratelimit:intake:${ip}`;
      const count = (await redisClient.eval(LUA_INCR_EXPIRE, 1, key, 900)) as number;
      return count <= MAX_SUBMISSIONS_PER_WINDOW;
    } catch (err: any) {
      // Safe structured warning without personal data
      logger.warn(
        { event: 'intake_rate_limiter_redis_eval_error', error: err?.message || 'Redis eval error' },
        '[RATE LIMITER] Redis command failed — falling back to single-node in-memory limiter'
      );
    }
  }

  // Single-node in-memory fixed-window fallback
  // NOTE: This fallback protects this specific Node process from resource exhaustion,
  // but does NOT coordinate across horizontal pods if Redis is down.
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return true;
  }
  entry.count++;
  return entry.count <= MAX_SUBMISSIONS_PER_WINDOW;
}

// Cleanup stale rate limit records every 5 minutes to prevent memory leak
const cleanupInterval = setInterval(() => {
  const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS;
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (entry.windowStart < cutoff) {
      rateLimitMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);
if (cleanupInterval.unref) {
  cleanupInterval.unref();
}

// Helper to escape untrusted text in HTML emails
function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Send staff email alert asynchronously (never blocks response, never fails user submission)
async function sendStaffNotification(
  type: 'contact' | 'careers',
  payload: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    company?: string;
    roleTitle?: string;
    inquiryType?: string;
    detailsText?: string;
  }
) {
  const destinationEmail =
    type === 'contact'
      ? process.env.CONTACT_NOTIFICATION_EMAIL || process.env.STAFF_LEAD_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL
      : process.env.CAREERS_NOTIFICATION_EMAIL || process.env.STAFF_LEAD_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL;

  if (!destinationEmail) {
    logger.info(
      `[INTAKE NOTIFICATION] No notification destination configured for type "${type}". Submission ID ${payload.id} stored securely.`
    );
    return;
  }

  const subject =
    type === 'contact'
      ? `[Sales Lead] New Contact Enquiry: ${payload.name} (${payload.company || 'Individual'})`
      : `[Recruiting] New Job Application: ${payload.name} for ${payload.roleTitle || 'Open Role'}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #0f172a; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px;">
        <h2 style="color: #1e293b; margin: 0; font-size: 20px;">
          ${type === 'contact' ? 'New Contact &amp; Sales Enquiry' : 'New Career Application'}
        </h2>
        <p style="color: #64748b; margin: 4px 0 0 0; font-size: 13px;">Xarwiz Public Intake Pipeline</p>
      </div>
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Submission ID:</strong> <span style="font-family: monospace;">${escapeHtml(payload.id)}</span></p>
        <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Name:</strong> ${escapeHtml(payload.name)}</p>
        <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Email:</strong> ${escapeHtml(payload.email)}</p>
        ${payload.phone ? `<p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Phone:</strong> ${escapeHtml(payload.phone)}</p>` : ''}
        ${payload.company ? `<p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Company:</strong> ${escapeHtml(payload.company)}</p>` : ''}
        ${payload.roleTitle ? `<p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Role:</strong> ${escapeHtml(payload.roleTitle)}</p>` : ''}
        ${payload.inquiryType ? `<p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Inquiry Type:</strong> ${escapeHtml(payload.inquiryType)}</p>` : ''}
      </div>
      ${payload.detailsText ? `
        <div style="margin-top: 16px;">
          <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #334155;">Submission Details:</h4>
          <pre style="background: #f1f5f9; padding: 12px; border-radius: 6px; white-space: pre-wrap; word-break: break-word; font-family: inherit; font-size: 13px; color: #1e293b;">${escapeHtml(payload.detailsText)}</pre>
        </div>
      ` : ''}
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="font-size: 12px; color: #94a3b8; margin: 0;">
        This is an automated notification from the Xarwiz Lead &amp; Careers Intake Service. No customer account or login credentials were created.
      </p>
    </div>
  `;

  try {
    await resend.emails.send({
      from: 'Xarwiz Intake <noreply@xarwiz.com>',
      to: destinationEmail,
      subject,
      html,
    });
    logger.info(`[INTAKE NOTIFICATION] Successfully delivered alert for ${type} ${payload.id} to ${destinationEmail}`);
  } catch (err: any) {
    logger.error(`[INTAKE NOTIFICATION ERROR] Failed to send email alert for ${type} ${payload.id}:`, err?.message || err);
  }
}

// Staff Authorization Guard:
// Verifies caller has valid session and staff role ('admin', 'superadmin', 'founder') or internal secret
function requireStaffRole(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: Authentication credentials required' });
  }

  const role = user.role || '';
  const isAuthorized =
    !!user.isInternal ||
    ['admin', 'superadmin', 'founder'].includes(role.toLowerCase());

  if (!isAuthorized) {
    return res.status(403).json({ error: 'Forbidden: Staff administrative privileges required' });
  }

  next();
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTACT / SALES INQUIRY HANDLER
// ─────────────────────────────────────────────────────────────────────────────
async function handleContactSubmission(req: Request, res: Response) {
  const ip = (req.ip || req.socket.remoteAddress || 'unknown').toString();

  // 1. Rate Limiting Check
  const isAllowed = await checkIntakeRateLimit(ip);
  if (!isAllowed) {
    return res.status(429).json({
      error: 'Too many submissions from this connection. Please wait a few minutes before submitting another enquiry.',
    });
  }

  const {
    name,
    email,
    phone,
    company,
    teamSize,
    inquiryType,
    message,
    privacyNoticeAcknowledged,
    privacyNoticeVersion,
    marketingConsent,
    _hp_website,
    website_url,
  } = req.body || {};

  // 2. Honeypot Spam Check (Hidden field that bots fill in)
  if (_hp_website || website_url) {
    logger.warn({ ip }, '[SPAM TRAP] Contact form submission blocked via honeypot');
    return res.status(201).json({
      success: true,
      message: 'Thank you for reaching out. An enterprise advisor will review your message shortly.',
    });
  }

  // 3. Server-side Validation
  const trimmedName = typeof name === 'string' ? name.trim() : '';
  const trimmedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 100) {
    return res.status(400).json({
      error: 'Please provide a valid full name between 2 and 100 characters.',
    });
  }

  if (!trimmedEmail || trimmedEmail.length > 255 || !emailRegex.test(trimmedEmail)) {
    return res.status(400).json({
      error: 'Please provide a valid work email address.',
    });
  }

  if (privacyNoticeAcknowledged !== true && privacyNoticeAcknowledged !== 'true') {
    return res.status(400).json({
      error: 'Please acknowledge the privacy notice to submit your inquiry.',
    });
  }

  const cleanPhone = typeof phone === 'string' ? phone.trim().slice(0, 50) : null;
  const cleanCompany = typeof company === 'string' ? company.trim().slice(0, 255) : null;
  const cleanTeamSize = typeof teamSize === 'string' ? teamSize.trim().slice(0, 50) : null;
  const cleanInquiryType = typeof inquiryType === 'string' ? inquiryType.trim().slice(0, 100) : 'enterprise_sales';
  const cleanMessage = typeof message === 'string' ? message.trim().slice(0, 5000) : '';
  const cleanPrivacyNoticeVersion =
    typeof privacyNoticeVersion === 'string' && privacyNoticeVersion.trim()
      ? privacyNoticeVersion.trim().slice(0, 50)
      : '2.0-dpdp';
  const cleanMarketing = marketingConsent === true || marketingConsent === 'true';
  const userAgent = req.headers['user-agent'] ? req.headers['user-agent'].slice(0, 500) : 'unknown';

  try {
    // 4. Safe Parameterized Persistence into dedicated contact_submissions table
    // CRITICAL: Does NOT create user, tenant, subscription, or auth token
    const result = await pool.query(
      `INSERT INTO contact_submissions (
        name, email, phone, company, team_size, inquiry_type, message,
        privacy_notice_acknowledged, privacy_notice_version, acknowledged_at,
        marketing_consent, status,
        ip_address, user_agent, metadata, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10, 'new', $11, $12, $13, NOW(), NOW())
      RETURNING id, name, email, company, inquiry_type, status, privacy_notice_version, acknowledged_at, created_at`,
      [
        trimmedName,
        trimmedEmail,
        cleanPhone,
        cleanCompany,
        cleanTeamSize,
        cleanInquiryType,
        cleanMessage,
        true,
        cleanPrivacyNoticeVersion,
        cleanMarketing,
        ip.slice(0, 45),
        userAgent,
        JSON.stringify({ source: 'contact_page', teamSize: cleanTeamSize }),
      ]
    );

    const submission = result.rows[0];

    // 5. Asynchronous Staff Notification (non-blocking)
    setImmediate(() => {
      sendStaffNotification('contact', {
        id: submission.id,
        name: trimmedName,
        email: trimmedEmail,
        phone: cleanPhone || undefined,
        company: cleanCompany || undefined,
        inquiryType: cleanInquiryType,
        detailsText: cleanMessage || `Team Size: ${cleanTeamSize || 'N/A'}\nInquiry Type: ${cleanInquiryType}`,
      }).catch((err) => logger.warn('Async lead notification failed:', err));
    });

    return res.status(201).json({
      success: true,
      id: submission.id,
      message: 'Thank you for reaching out. An enterprise advisor will review your message shortly.',
    });
  } catch (err: any) {
    logger.error('Failed to persist contact submission:', err?.message || err);
    return res.status(500).json({
      error: 'Unable to submit your inquiry at this moment. Please try again shortly.',
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CAREERS APPLICATION HANDLER
// ─────────────────────────────────────────────────────────────────────────────
async function handleCareerSubmission(req: Request, res: Response) {
  const ip = (req.ip || req.socket.remoteAddress || 'unknown').toString();

  // 1. Rate Limiting Check
  const isAllowed = await checkIntakeRateLimit(ip);
  if (!isAllowed) {
    return res.status(429).json({
      error: 'Too many applications submitted from this connection. Please wait a few minutes before trying again.',
    });
  }

  const {
    name,
    email,
    phone,
    roleId,
    roleTitle,
    portfolioLinks,
    links,
    coverNote,
    note,
    resumeUrl,
    privacyNoticeAcknowledged,
    privacyNoticeVersion,
    _hp_website,
    website_url,
  } = req.body || {};

  // 2. Honeypot Spam Check
  if (_hp_website || website_url) {
    logger.warn({ ip }, '[SPAM TRAP] Career application blocked via honeypot');
    return res.status(201).json({
      success: true,
      message: 'Thank you for applying. Our engineering recruitment team will review your application.',
    });
  }

  // 3. Server-side Validation
  const trimmedName = typeof name === 'string' ? name.trim() : '';
  const trimmedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const rawLinks = typeof portfolioLinks === 'string' ? portfolioLinks.trim() : typeof links === 'string' ? links.trim() : '';

  if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 100) {
    return res.status(400).json({
      error: 'Please provide your full name (between 2 and 100 characters).',
    });
  }

  if (!trimmedEmail || trimmedEmail.length > 255 || !emailRegex.test(trimmedEmail)) {
    return res.status(400).json({
      error: 'Please provide a valid email address.',
    });
  }

  if (!rawLinks || rawLinks.length < 5 || rawLinks.length > 1000) {
    return res.status(400).json({
      error: 'Please provide a valid GitHub, LinkedIn, or portfolio URL (at least 5 characters).',
    });
  }

  if (!rawLinks.includes('http://') && !rawLinks.includes('https://') && !rawLinks.includes('.')) {
    return res.status(400).json({
      error: 'Please provide a valid URL for your portfolio or profile.',
    });
  }

  if (privacyNoticeAcknowledged !== true && privacyNoticeAcknowledged !== 'true') {
    return res.status(400).json({
      error: 'Please acknowledge the privacy notice to submit your application.',
    });
  }

  const cleanPhone = typeof phone === 'string' ? phone.trim().slice(0, 50) : null;
  const cleanRoleId = typeof roleId === 'string' ? roleId.trim().slice(0, 100) : 'general_engineering';
  const cleanRoleTitle = typeof roleTitle === 'string' ? roleTitle.trim().slice(0, 255) : 'Engineering Role';
  const rawNote = typeof coverNote === 'string' ? coverNote.trim() : typeof note === 'string' ? note.trim() : '';
  const cleanCoverNote = rawNote.slice(0, 5000);
  const cleanResumeUrl = typeof resumeUrl === 'string' && resumeUrl.startsWith('https://') ? resumeUrl.trim().slice(0, 2000) : null;
  const cleanPrivacyNoticeVersion =
    typeof privacyNoticeVersion === 'string' && privacyNoticeVersion.trim()
      ? privacyNoticeVersion.trim().slice(0, 50)
      : '2.0-dpdp';
  const userAgent = req.headers['user-agent'] ? req.headers['user-agent'].slice(0, 500) : 'unknown';

  try {
    // 4. Safe Parameterized Persistence into dedicated career_applications table
    // CRITICAL: Does NOT create user, tenant, subscription, or auth token
    const result = await pool.query(
      `INSERT INTO career_applications (
        name, email, phone, role_id, role_title, portfolio_links,
        cover_note, resume_url, privacy_notice_acknowledged, privacy_notice_version, acknowledged_at,
        status, ip_address, user_agent, metadata, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), 'submitted', $11, $12, $13, NOW(), NOW())
      RETURNING id, name, email, role_id, role_title, status, privacy_notice_version, acknowledged_at, created_at`,
      [
        trimmedName,
        trimmedEmail,
        cleanPhone,
        cleanRoleId,
        cleanRoleTitle,
        rawLinks,
        cleanCoverNote || null,
        cleanResumeUrl,
        true,
        cleanPrivacyNoticeVersion,
        ip.slice(0, 45),
        userAgent,
        JSON.stringify({ source: 'careers_page', roleId: cleanRoleId }),
      ]
    );

    const application = result.rows[0];

    // 5. Asynchronous Staff Notification (non-blocking)
    setImmediate(() => {
      sendStaffNotification('careers', {
        id: application.id,
        name: trimmedName,
        email: trimmedEmail,
        phone: cleanPhone || undefined,
        roleTitle: cleanRoleTitle,
        detailsText: `Portfolio/Links: ${rawLinks}\n\nCover Note:\n${cleanCoverNote || 'None provided.'}`,
      }).catch((err) => logger.warn('Async career application notification failed:', err));
    });

    return res.status(201).json({
      success: true,
      id: application.id,
      message: 'Thank you for applying. Our engineering recruitment team will review your application.',
    });
  } catch (err: any) {
    logger.error('Failed to persist career application:', err?.message || err);
    return res.status(500).json({
      error: 'Unable to submit your application at this moment. Please try again shortly.',
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STAFF ADMINISTRATIVE REVIEW ENDPOINTS (ROLE-GUARDED)
// ─────────────────────────────────────────────────────────────────────────────

// Contact submissions list (Staff only)
async function getContactSubmissions(req: Request, res: Response) {
  const status = typeof req.query.status === 'string' ? req.query.status.trim() : null;
  const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 20, 1), 100);
  const offset = Math.max(parseInt(req.query.offset as string, 10) || 0, 0);

  try {
    let query = 'SELECT id, name, email, phone, company, team_size, inquiry_type, message, status, privacy_notice_version, acknowledged_at, created_at, updated_at FROM contact_submissions';
    const params: any[] = [];

    if (status) {
      params.push(status);
      query += ` WHERE status = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    const countQuery = status
      ? 'SELECT COUNT(*)::int as count FROM contact_submissions WHERE status = $1'
      : 'SELECT COUNT(*)::int as count FROM contact_submissions';
    const countRes = await pool.query(countQuery, status ? [status] : []);

    return res.json({
      submissions: result.rows,
      pagination: {
        total: countRes.rows[0]?.count || 0,
        limit,
        offset,
      },
    });
  } catch (err: any) {
    logger.error('Failed to fetch contact submissions:', err?.message || err);
    return res.status(500).json({ error: 'Failed to retrieve contact submissions' });
  }
}

// Update contact submission status (Staff only)
async function updateContactStatus(req: Request, res: Response) {
  const { id } = req.params;
  const { status } = req.body || {};

  const allowedStatuses = ['new', 'in_review', 'contacted', 'qualified', 'archived'];
  if (!status || !allowedStatuses.includes(status)) {
    return res.status(400).json({
      error: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}`,
    });
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (!isUuid) {
    return res.status(400).json({ error: 'Invalid submission ID format' });
  }

  try {
    const result = await pool.query(
      `UPDATE contact_submissions
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, status, updated_at`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact submission not found' });
    }

    return res.json({
      success: true,
      submission: result.rows[0],
    });
  } catch (err: any) {
    logger.error('Failed to update contact submission status:', err?.message || err);
    return res.status(500).json({ error: 'Failed to update submission status' });
  }
}

// Careers applications list (Staff only)
async function getCareerApplications(req: Request, res: Response) {
  const status = typeof req.query.status === 'string' ? req.query.status.trim() : null;
  const roleId = typeof req.query.roleId === 'string' ? req.query.roleId.trim() : null;
  const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 20, 1), 100);
  const offset = Math.max(parseInt(req.query.offset as string, 10) || 0, 0);

  try {
    let query = 'SELECT id, name, email, phone, role_id, role_title, portfolio_links, cover_note, resume_url, status, privacy_notice_version, acknowledged_at, created_at, updated_at FROM career_applications';
    const params: any[] = [];
    const whereClauses: string[] = [];

    if (status) {
      params.push(status);
      whereClauses.push(`status = $${params.length}`);
    }
    if (roleId) {
      params.push(roleId);
      whereClauses.push(`role_id = $${params.length}`);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    let countQuery = 'SELECT COUNT(*)::int as count FROM career_applications';
    if (whereClauses.length > 0) {
      countQuery += ` WHERE ${whereClauses.join(' AND ')}`;
    }
    const countRes = await pool.query(countQuery, params.slice(0, whereClauses.length));

    return res.json({
      applications: result.rows,
      pagination: {
        total: countRes.rows[0]?.count || 0,
        limit,
        offset,
      },
    });
  } catch (err: any) {
    logger.error('Failed to fetch career applications:', err?.message || err);
    return res.status(500).json({ error: 'Failed to retrieve career applications' });
  }
}

// Update career application status (Staff only)
async function updateCareerStatus(req: Request, res: Response) {
  const { id } = req.params;
  const { status } = req.body || {};

  const allowedStatuses = ['submitted', 'reviewing', 'interviewing', 'offered', 'rejected', 'withdrawn'];
  if (!status || !allowedStatuses.includes(status)) {
    return res.status(400).json({
      error: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}`,
    });
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (!isUuid) {
    return res.status(400).json({ error: 'Invalid application ID format' });
  }

  try {
    const result = await pool.query(
      `UPDATE career_applications
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, status, updated_at`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Career application not found' });
    }

    return res.json({
      success: true,
      application: result.rows[0],
    });
  } catch (err: any) {
    logger.error('Failed to update career application status:', err?.message || err);
    return res.status(500).json({ error: 'Failed to update application status' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE MOUNTINGS
// ─────────────────────────────────────────────────────────────────────────────

// Public submission endpoints (no authentication required)
router.post('/contact', handleContactSubmission);
router.post('/careers', handleCareerSubmission);
router.post('/apply', handleCareerSubmission);
router.post('/', (req, res, next) => {
  // If mounted on /api/contact or /api/v1/contact -> handleContactSubmission
  // If mounted on /api/careers or /api/v1/careers -> handleCareerSubmission
  const url = req.baseUrl || req.originalUrl || '';
  if (url.includes('contact')) {
    return handleContactSubmission(req, res);
  }
  if (url.includes('career')) {
    return handleCareerSubmission(req, res);
  }
  next();
});

// Get single contact submission by ID (Staff only)
async function getContactSubmissionById(req: Request, res: Response) {
  const { id } = req.params;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (!isUuid) {
    return res.status(400).json({ error: 'Invalid submission ID format' });
  }

  try {
    const result = await pool.query(
      'SELECT id, name, email, phone, company, team_size, inquiry_type, message, status, privacy_notice_version, acknowledged_at, created_at, updated_at FROM contact_submissions WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact submission not found' });
    }

    return res.json({ submission: result.rows[0] });
  } catch (err: any) {
    logger.error('Failed to retrieve contact submission:', err?.message || err);
    return res.status(500).json({ error: 'Failed to retrieve submission' });
  }
}

// Get single career application by ID (Staff only)
async function getCareerApplicationById(req: Request, res: Response) {
  const { id } = req.params;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (!isUuid) {
    return res.status(400).json({ error: 'Invalid application ID format' });
  }

  try {
    const result = await pool.query(
      'SELECT id, name, email, phone, role_id, role_title, portfolio_links, cover_note, resume_url, status, privacy_notice_version, acknowledged_at, created_at, updated_at FROM career_applications WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Career application not found' });
    }

    return res.json({ application: result.rows[0] });
  } catch (err: any) {
    logger.error('Failed to retrieve career application:', err?.message || err);
    return res.status(500).json({ error: 'Failed to retrieve application' });
  }
}

// Staff administration endpoints (require authentication + staff role)
// Supported when mounted at /api/admin, /api/v1/admin, /api/intake, /api/v1/intake, /api/contact, /api/careers
router.get('/contact-submissions', requireAuth, requireStaffRole, getContactSubmissions);
router.get('/contact-submissions/:id', requireAuth, requireStaffRole, getContactSubmissionById);
router.patch('/contact-submissions/:id/status', requireAuth, requireStaffRole, updateContactStatus);
router.get('/career-applications', requireAuth, requireStaffRole, getCareerApplications);
router.get('/career-applications/:id', requireAuth, requireStaffRole, getCareerApplicationById);
router.patch('/career-applications/:id/status', requireAuth, requireStaffRole, updateCareerStatus);

router.get('/admin/contact-submissions', requireAuth, requireStaffRole, getContactSubmissions);
router.get('/admin/contact-submissions/:id', requireAuth, requireStaffRole, getContactSubmissionById);
router.patch('/admin/contact-submissions/:id/status', requireAuth, requireStaffRole, updateContactStatus);
router.get('/admin/career-applications', requireAuth, requireStaffRole, getCareerApplications);
router.get('/admin/career-applications/:id', requireAuth, requireStaffRole, getCareerApplicationById);
router.patch('/admin/career-applications/:id/status', requireAuth, requireStaffRole, updateCareerStatus);

router.get('/contact/admin/submissions', requireAuth, requireStaffRole, getContactSubmissions);
router.get('/contact/admin/submissions/:id', requireAuth, requireStaffRole, getContactSubmissionById);
router.patch('/contact/admin/submissions/:id/status', requireAuth, requireStaffRole, updateContactStatus);
router.get('/careers/admin/applications', requireAuth, requireStaffRole, getCareerApplications);
router.get('/careers/admin/applications/:id', requireAuth, requireStaffRole, getCareerApplicationById);
router.patch('/careers/admin/applications/:id/status', requireAuth, requireStaffRole, updateCareerStatus);

router.get('/admin/submissions', requireAuth, requireStaffRole, getContactSubmissions);
router.get('/admin/submissions/:id', requireAuth, requireStaffRole, getContactSubmissionById);
router.patch('/admin/submissions/:id/status', requireAuth, requireStaffRole, updateContactStatus);
router.get('/admin/applications', requireAuth, requireStaffRole, getCareerApplications);
router.get('/admin/applications/:id', requireAuth, requireStaffRole, getCareerApplicationById);
router.patch('/admin/applications/:id/status', requireAuth, requireStaffRole, updateCareerStatus);

export {
  checkIntakeRateLimit,
  LUA_INCR_EXPIRE,
  RATE_LIMIT_WINDOW_MS,
  MAX_SUBMISSIONS_PER_WINDOW,
  rateLimitMap,
  redisClient,
};

export function setRedisClientForTest(client: any): void {
  redisClient = client;
}

export function resetRateLimitMapForTest(): void {
  rateLimitMap.clear();
}

export default router;

