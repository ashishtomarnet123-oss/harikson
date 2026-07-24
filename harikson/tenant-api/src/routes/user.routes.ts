import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import QRCode from 'qrcode';
import { pool, executeTenantQuery, invalidateUserCache } from '../db/pool.js';
import logger from '../utils/logger.js';
import { validate } from '../middleware/validation.middleware.js';
import { profileUpdateSchema, settingsUpdateSchema } from '../validators/user.schema.js';
import {
  generateTotpSecret,
  generateOtpauthUrl,
  verifyTotpToken,
  generateHashedBackupCodes,
} from '../services/twoFactorService.js';

const router = Router();

// GET /api/user/profile
router.get('/profile', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const userRes = await pool.query(
      `SELECT id, email, name, username, phone, company, job_title, department, country, bio,
              role, two_factor_enabled, avatar_url, created_at, settings
       FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [req.user.userId]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const u = userRes.rows[0];
    // Return flat profile object that matches frontend expectations
    res.json({
      id: u.id,
      email: u.email,
      name: u.name || '',
      username: u.username || '',
      phone: u.phone || '',
      company: u.company || '',
      jobTitle: u.job_title || '',
      department: u.department || '',
      country: u.country || '',
      bio: u.bio || '',
      role: u.role,
      twoFactorEnabled: u.two_factor_enabled,
      avatarUrl: u.avatar_url || '',
      createdAt: u.created_at,
      settings: u.settings || {},
      // Also expose as 'user' for backward compat
      user: {
        id: u.id, email: u.email, name: u.name, role: u.role,
        two_factor_enabled: u.two_factor_enabled,
      },
    });
  } catch (err: any) {
    logger.error('Fetch user profile error:', err);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// PUT /api/user/profile
router.put('/profile', validate(profileUpdateSchema), async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const { name, username, phone, company, jobTitle, department, country, bio } = req.body;
  try {
    const updateRes = await pool.query(
      `UPDATE users SET
         name = COALESCE($1, name),
         username = COALESCE($2, username),
         phone = COALESCE($3, phone),
         company = COALESCE($4, company),
         job_title = COALESCE($5, job_title),
         department = COALESCE($6, department),
         country = COALESCE($7, country),
         bio = COALESCE($8, bio),
         updated_at = NOW()
       WHERE id = $9
       RETURNING id, email, name, username, phone, company, job_title, department, country, bio, role`,
      [name, username, phone, company, jobTitle, department, country, bio, req.user.userId]
    );

    await invalidateUserCache(req.user.userId);

    res.json({ success: true, user: updateRes.rows[0] });
  } catch (err: any) {
    logger.error('Update user profile error:', err);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

// GET /api/user/sessions
router.get('/sessions', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const sessionsRes = await pool.query(
      `SELECT id, device_name, device_hash, last_ip, country_code, last_used_at, created_at 
       FROM refresh_tokens 
       WHERE user_id = $1 AND expires_at > NOW() 
       ORDER BY last_used_at DESC`,
      [req.user.userId]
    );

    res.json({ sessions: sessionsRes.rows });
  } catch (err: any) {
    logger.error('Fetch user sessions error:', err);
    res.status(500).json({ error: 'Failed to fetch user sessions' });
  }
});

// DELETE /api/user/sessions/:id
router.delete('/sessions/:id', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.params;
  try {
    await pool.query('DELETE FROM refresh_tokens WHERE id = $1 AND user_id = $2', [id, req.user.userId]);
    res.json({ success: true, message: 'Session revoked successfully' });
  } catch (err: any) {
    logger.error('Revoke session error:', err);
    res.status(500).json({ error: 'Failed to revoke session' });
  }
});

// POST /api/user/2fa/setup
router.post('/2fa/setup', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const userRes = await pool.query('SELECT email FROM users WHERE id = $1', [req.user.userId]);
    const userEmail = userRes.rows[0]?.email || 'user@neuravolt.cloud';

    const secret = generateTotpSecret();
    const otpauthUrl = generateOtpauthUrl(userEmail, secret, 'Neuravolt');
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    await pool.query('UPDATE users SET two_factor_secret_temp = $1 WHERE id = $2', [secret, req.user.userId]);

    res.json({
      secret,
      qrCode: qrCodeDataUrl,
    });
  } catch (err: any) {
    logger.error('2FA setup error:', err);
    res.status(500).json({ error: 'Failed to generate 2FA setup details' });
  }
});

// POST /api/user/2fa/verify
router.post('/2fa/verify', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { code } = req.body;

  if (!code) return res.status(400).json({ error: 'Verification code is required' });

  try {
    const userRes = await pool.query('SELECT two_factor_secret_temp FROM users WHERE id = $1', [req.user.userId]);
    const tempSecret = userRes.rows[0]?.two_factor_secret_temp;

    if (!tempSecret) {
      return res.status(400).json({ error: 'No 2FA setup session found. Please start setup again.' });
    }

    const isValid = verifyTotpToken(code, tempSecret);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    const { plainCodes, hashedRecords } = await generateHashedBackupCodes();

    await pool.query(
      `UPDATE users 
       SET two_factor_enabled = true, 
           two_factor_secret = two_factor_secret_temp, 
           two_factor_secret_temp = NULL,
           two_factor_backup_codes = $1
       WHERE id = $2`,
      [JSON.stringify(hashedRecords), req.user.userId]
    );

    await invalidateUserCache(req.user.userId);

    res.json({
      success: true,
      message: '2FA enabled successfully',
      backupCodes: plainCodes,
    });
  } catch (err: any) {
    logger.error('2FA verify error:', err);
    res.status(500).json({ error: 'Failed to enable 2FA' });
  }
});

// POST /api/user/2fa/disable
router.post('/2fa/disable', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    await pool.query(
      `UPDATE users 
       SET two_factor_enabled = false, 
           two_factor_secret = NULL, 
           two_factor_secret_temp = NULL,
           two_factor_backup_codes = NULL
       WHERE id = $1`,
      [req.user.userId]
    );

    await invalidateUserCache(req.user.userId);

    res.json({ success: true, message: '2FA disabled successfully' });
  } catch (err: any) {
    logger.error('2FA disable error:', err);
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
});

// API Keys Endpoints
router.get('/api-keys', async (req: any, res) => {
  if (!req.tenant) return res.status(401).json({ error: 'Tenant context required' });

  try {
    const keysRes = await executeTenantQuery(req.tenant.id, (client) =>
      client.query(
        'SELECT id, name, key_prefix, scopes, created_at, last_used_at, status FROM tenant_api_keys WHERE status = \'active\' ORDER BY created_at DESC'
      )
    );

    res.json({ apiKeys: keysRes.rows });
  } catch (err: any) {
    logger.error('Fetch API keys error:', err);
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
});

router.post('/api-keys', async (req: any, res) => {
  if (!req.tenant) return res.status(401).json({ error: 'Tenant context required' });

  const { name, scopes } = req.body;
  const rawKey = 'hk_live_' + crypto.randomBytes(24).toString('hex');
  const prefix = rawKey.substring(0, 12);
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  try {
    const insertRes = await executeTenantQuery(req.tenant.id, (client) =>
      client.query(
        `INSERT INTO tenant_api_keys (tenant_id, user_id, name, key_hash, key_prefix, scopes, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'active', NOW())
         RETURNING id, name, key_prefix, scopes, created_at`,
        [req.tenant.id, req.user?.userId || null, name || 'API Key', keyHash, prefix, JSON.stringify(scopes || ['read'])]
      )
    );

    res.status(201).json({
      apiKey: insertRes.rows[0],
      secretKey: rawKey,
    });
  } catch (err: any) {
    logger.error('Create API key error:', err);
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

router.delete('/api-keys/:id', async (req: any, res) => {
  if (!req.tenant) return res.status(401).json({ error: 'Tenant context required' });

  const { id } = req.params;
  try {
    await executeTenantQuery(req.tenant.id, (client) =>
      client.query('UPDATE tenant_api_keys SET status = \'revoked\', revoked_at = NOW() WHERE id = $1 AND tenant_id = $2', [
        id,
        req.tenant.id,
      ])
    );

    res.json({ success: true, message: 'API key revoked successfully' });
  } catch (err: any) {
    logger.error('Revoke API key error:', err);
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
});

// ── Developer Keys (alias /api-keys as /developer/keys) ──────────────────────
router.get('/developer/keys', async (req: any, res) => {
  if (!req.tenant) return res.status(401).json({ error: 'Tenant context required' });
  try {
    const keysRes = await executeTenantQuery(req.tenant.id, (client) =>
      client.query(
        `SELECT id, name, key_prefix, scopes, created_at, last_used_at, status
         FROM tenant_api_keys WHERE tenant_id = $1 AND status = 'active' ORDER BY created_at DESC`,
        [req.tenant.id]
      )
    );
    res.json({ keys: keysRes.rows });
  } catch (err: any) {
    logger.error('Fetch developer keys error:', err);
    res.status(500).json({ error: 'Failed to fetch developer keys' });
  }
});

router.post('/developer/keys', async (req: any, res) => {
  if (!req.tenant) return res.status(401).json({ error: 'Tenant context required' });
  const { name, scopes } = req.body;
  const rawKey = 'hk_live_' + crypto.randomBytes(24).toString('hex');
  const prefix = rawKey.substring(0, 12);
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  try {
    const insertRes = await executeTenantQuery(req.tenant.id, (client) =>
      client.query(
        `INSERT INTO tenant_api_keys (tenant_id, user_id, name, key_hash, key_prefix, scopes, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'active', NOW())
         RETURNING id, name, key_prefix, scopes, created_at`,
        [req.tenant.id, req.user?.userId || null, name || 'API Key', keyHash, prefix, JSON.stringify(scopes || ['read'])]
      )
    );
    res.status(201).json({ key: insertRes.rows[0], secretKey: rawKey });
  } catch (err: any) {
    logger.error('Create developer key error:', err);
    res.status(500).json({ error: 'Failed to create developer key' });
  }
});

router.delete('/developer/keys/:id', async (req: any, res) => {
  if (!req.tenant) return res.status(401).json({ error: 'Tenant context required' });
  const { id } = req.params;
  try {
    await executeTenantQuery(req.tenant.id, (client) =>
      client.query(
        `UPDATE tenant_api_keys SET status = 'revoked', revoked_at = NOW() WHERE id = $1 AND tenant_id = $2`,
        [id, req.tenant.id]
      )
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to revoke developer key' });
  }
});

// ── Workspace ────────────────────────────────────────────────────────────────
router.get('/workspace', async (req: any, res) => {
  if (!req.user || !req.tenant) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const membersRes = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.created_at, u.last_login_at
       FROM users u WHERE u.tenant_id = $1 AND u.deleted_at IS NULL ORDER BY u.created_at ASC`,
      [req.tenant.id]
    );
    const tenantRes = await pool.query(
      `SELECT name, slug, status, settings, trial_ends_at, created_at FROM tenants WHERE id = $1`,
      [req.tenant.id]
    );
    const tenant = tenantRes.rows[0] || {};
    res.json({
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      trialEndsAt: tenant.trial_ends_at,
      createdAt: tenant.created_at,
      members: membersRes.rows,
    });
  } catch (err: any) {
    logger.error('Fetch workspace error:', err);
    res.status(500).json({ error: 'Failed to load workspace' });
  }
});

router.post('/workspace/members', async (req: any, res) => {
  if (!req.user || !req.tenant) return res.status(401).json({ error: 'Unauthorized' });
  const { email, name, role, password } = req.body;
  if (!email || !name) return res.status(400).json({ error: 'email and name are required' });
  try {
    const existing = await pool.query(
      `SELECT id FROM users WHERE email = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [email, req.tenant.id]
    );
    if (existing.rows.length > 0) return res.status(409).json({ error: 'User with this email already exists' });
    const passwordHash = await bcrypt.hash(password || crypto.randomBytes(12).toString('hex'), 10);
    const insertRes = await pool.query(
      `INSERT INTO users (tenant_id, email, password_hash, name, role, email_verified, created_at)
       VALUES ($1, $2, $3, $4, $5, true, NOW()) RETURNING id, name, email, role, created_at`,
      [req.tenant.id, email, passwordHash, name, role || 'Member']
    );
    res.status(201).json(insertRes.rows[0]);
  } catch (err: any) {
    logger.error('Add workspace member error:', err);
    res.status(500).json({ error: 'Failed to add member' });
  }
});

router.put('/workspace/members/:id/role', async (req: any, res) => {
  if (!req.user || !req.tenant) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.params;
  const { role } = req.body;
  if (!role) return res.status(400).json({ error: 'role is required' });
  try {
    await pool.query(
      `UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3`,
      [role, id, req.tenant.id]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update member role' });
  }
});

router.delete('/workspace/members/:id', async (req: any, res) => {
  if (!req.user || !req.tenant) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.params;
  if (id === req.user.userId) return res.status(400).json({ error: 'You cannot remove yourself' });
  try {
    await pool.query(
      `UPDATE users SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2`,
      [id, req.tenant.id]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// ── Activity Log ─────────────────────────────────────────────────────────────
router.get('/activity', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const logsRes = await pool.query(
      `SELECT id, action, ip_address, user_agent, metadata, created_at
       FROM audit_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [req.user.userId]
    );
    res.json({ logs: logsRes.rows });
  } catch (err: any) {
    // Table may not exist yet
    logger.warn('Activity log table missing or query failed:', err.message);
    res.json({ logs: [] });
  }
});

// ── Devices (active sessions) ─────────────────────────────────────────────────
router.get('/devices', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const devRes = await pool.query(
      `SELECT id, device_name, device_hash, last_ip, country_code, last_used_at, created_at
       FROM refresh_tokens WHERE user_id = $1 AND expires_at > NOW() ORDER BY last_used_at DESC`,
      [req.user.userId]
    );
    res.json({ devices: devRes.rows });
  } catch (err: any) {
    logger.error('Fetch devices error:', err);
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

router.delete('/devices/:id', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.params;
  try {
    await pool.query(`DELETE FROM refresh_tokens WHERE id = $1 AND user_id = $2`, [id, req.user.userId]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to revoke device session' });
  }
});

// ── User Settings (appearance, language, notifications, etc.) ─────────────────
router.get('/settings', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const r = await pool.query(`SELECT settings FROM users WHERE id = $1`, [req.user.userId]);
    const settings = r.rows[0]?.settings || {};
    res.json({ settings });
  } catch (err: any) {
    logger.error('Fetch user settings error:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.put('/settings', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { settings } = req.body;
  if (!settings) return res.status(400).json({ error: 'settings object required' });
  try {
    await pool.query(
      `UPDATE users SET settings = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(settings), req.user.userId]
    );
    await invalidateUserCache(req.user.userId);
    res.json({ success: true });
  } catch (err: any) {
    logger.error('Update user settings error:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ── Usage Stats ───────────────────────────────────────────────────────────────
router.get('/usage', async (req: any, res) => {
  if (!req.user || !req.tenant) return res.status(401).json({ error: 'Unauthorized' });
  const days = parseInt(req.query.days as string) || 30;
  try {
    // Count conversations per day (no token columns exist in conversations table yet)
    const usageRes = await pool.query(
      `SELECT
         COUNT(c.id) AS total_chats,
         DATE_TRUNC('day', c.created_at) AS date
       FROM conversations c
       WHERE c.tenant_id = $1 AND c.user_id = $2
         AND c.created_at >= NOW() - ($3::int || ' days')::INTERVAL
         AND c.deleted_at IS NULL
       GROUP BY DATE_TRUNC('day', c.created_at)
       ORDER BY date ASC`,
      [req.tenant.id, req.user.userId, days]
    );

    const totalChats = usageRes.rows.reduce((sum: number, r: any) => sum + parseInt(r.total_chats), 0);

    const subRes = await pool.query(
      `SELECT s.status, s.current_period_start, s.current_period_end, s.amount, s.currency,
              p.name AS plan_name, p.token_limit, p.features
       FROM subscriptions s
       JOIN plans p ON s.plan_id = p.id
       WHERE s.tenant_id = $1 AND s.status NOT IN ('cancelled','canceled')
       ORDER BY s.created_at DESC LIMIT 1`,
      [req.tenant.id]
    );

    const sub = subRes.rows[0] || {};
    res.json({
      totalChats,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      tokenLimit: sub.token_limit || 100000,
      plan: sub.plan_name || 'Free',
      periodStart: sub.current_period_start,
      periodEnd: sub.current_period_end,
      dailyBreakdown: usageRes.rows,
    });
  } catch (err: any) {
    logger.error('Fetch usage error:', err);
    res.status(500).json({ error: 'Failed to fetch usage statistics' });
  }
});

// ── Billing Info ──────────────────────────────────────────────────────────────
router.get('/billing', async (req: any, res) => {
  if (!req.user || !req.tenant) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const subRes = await pool.query(
      `SELECT s.id, s.status, s.current_period_start, s.current_period_end,
              s.amount, s.currency, s.cancel_at_period_end, s.trial_end,
              p.name AS plan_name, p.price, p.billing_interval, p.token_limit, p.features
       FROM subscriptions s
       JOIN plans p ON s.plan_id = p.id
       WHERE s.tenant_id = $1
       ORDER BY s.created_at DESC LIMIT 1`,
      [req.tenant.id]
    );

    if (subRes.rows.length === 0) {
      return res.json({
        status: 'Free',
        plan: 'Free',
        amount: 0,
        currency: 'USD',
        features: {},
        invoices: [],
      });
    }

    const sub = subRes.rows[0];
    res.json({
      status: sub.cancel_at_period_end ? 'Canceling' : sub.status,
      plan: sub.plan_name,
      amount: sub.amount || sub.price,
      currency: sub.currency || 'USD',
      currentPeriodStart: sub.current_period_start,
      currentPeriodEnd: sub.current_period_end,
      trialEnd: sub.trial_end,
      tokenLimit: sub.token_limit,
      features: sub.features || {},
      invoices: [],
    });
  } catch (err: any) {
    logger.error('Fetch billing error:', err);
    res.status(500).json({ error: 'Failed to fetch billing details' });
  }
});

router.post('/billing/portal', async (req: any, res) => {
  if (!req.user || !req.tenant) return res.status(401).json({ error: 'Unauthorized' });
  // If Stripe is configured, redirect to portal; otherwise return a helpful message
  try {
    const tenantRes = await pool.query(
      `SELECT stripe_customer_id FROM tenants WHERE id = $1`,
      [req.tenant.id]
    );
    const customerId = tenantRes.rows[0]?.stripe_customer_id;
    if (!customerId) {
      return res.json({ url: null, message: 'No Stripe customer linked. Please contact support.' });
    }
    // Return placeholder - Stripe integration would go here
    res.json({ url: `https://billing.stripe.com/p/session/${customerId}` });
  } catch (err: any) {
    logger.error('Billing portal error:', err);
    res.status(500).json({ error: 'Failed to access billing portal' });
  }
});

router.post('/billing/cancel', async (req: any, res) => {
  if (!req.user || !req.tenant) return res.status(401).json({ error: 'Unauthorized' });
  try {
    await pool.query(
      `UPDATE subscriptions SET cancel_at_period_end = true, updated_at = NOW()
       WHERE tenant_id = $1 AND status NOT IN ('cancelled','canceled')`,
      [req.tenant.id]
    );
    res.json({ success: true, message: 'Subscription scheduled for cancellation' });
  } catch (err: any) {
    logger.error('Cancel subscription error:', err);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// ── Avatar Upload ─────────────────────────────────────────────────────────────
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const avatarStorage = multer.diskStorage({
  destination: (req: any, file: any, cb: any) => {
    const dir = process.env.AVATAR_UPLOAD_DIR || '/tmp/avatars';
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req: any, file: any, cb: any) => {
    cb(null, `avatar_${(req as any).user?.userId}_${Date.now()}${path.extname(file.originalname)}`);
  },
});
const uploadAvatar = multer({ storage: avatarStorage, limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/avatar', uploadAvatar.single('avatar'), async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const avatarUrl = req.file
      ? `/avatars/${req.file.filename}`
      : null;

    if (avatarUrl) {
      await pool.query(
        `UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2`,
        [avatarUrl, req.user.userId]
      );
      await invalidateUserCache(req.user.userId);
    }

    res.json({ success: true, avatarUrl: avatarUrl || null });
  } catch (err: any) {
    logger.error('Avatar upload error:', err);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

// ── Change Password ───────────────────────────────────────────────────────────
router.post('/security/change-password', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword and newPassword are required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }
  try {
    const userRes = await pool.query(
      `SELECT password_hash FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [req.user.userId]
    );
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, userRes.rows[0].password_hash);
    if (!isMatch) return res.status(401).json({ error: 'Current password is incorrect' });

    const newHash = await bcrypt.hash(newPassword, 12);
    await pool.query(
      `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
      [newHash, req.user.userId]
    );

    // Invalidate all refresh tokens (force re-login on other devices)
    await pool.query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [req.user.userId]);
    await invalidateUserCache(req.user.userId);

    res.json({ success: true, message: 'Password changed successfully. Please log in again.' });
  } catch (err: any) {
    logger.error('Change password error:', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

import { setupCustomDomain } from '../services/customDomainService.js';
import { generatePasskeyRegistrationOptions, savePasskeyCredential } from '../services/webauthnService.js';

// LOW-020: Setup custom domain and verify DNS CNAME record
router.post('/custom-domain', async (req: any, res) => {
  if (!req.tenant) return res.status(401).json({ error: 'Tenant context required' });

  const { domain } = req.body;
  if (!domain) return res.status(400).json({ error: 'Domain is required' });

  try {
    const result = await setupCustomDomain(req.tenant.id, domain);
    res.json(result);
  } catch (err: any) {
    logger.error('Setup custom domain error:', err);
    res.status(500).json({ error: 'Failed to setup custom domain' });
  }
});

// LOW-024: WebAuthn Passkey Registration Options
router.post('/passkeys/generate-options', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const userRes = await pool.query('SELECT email FROM users WHERE id = $1', [req.user.userId]);
    const email = userRes.rows[0]?.email || 'user@neuravolt.cloud';

    const options = await generatePasskeyRegistrationOptions(req.user.userId, email);
    res.json(options);
  } catch (err: any) {
    logger.error('Generate passkey registration options error:', err);
    res.status(500).json({ error: 'Failed to generate passkey options' });
  }
});

// LOW-024: WebAuthn Passkey Registration Verification & Storage
router.post('/passkeys/verify-registration', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const { credentialId, publicKey, deviceName = 'Security Key' } = req.body;
  if (!credentialId || !publicKey) {
    return res.status(400).json({ error: 'credentialId and publicKey are required' });
  }

  try {
    const passkey = await savePasskeyCredential(req.user.userId, credentialId, publicKey, deviceName);
    res.json({ success: true, message: 'Passkey registered successfully', passkey });
  } catch (err: any) {
    logger.error('Verify passkey registration error:', err);
    res.status(500).json({ error: 'Failed to register passkey' });
  }
});

export default router;
