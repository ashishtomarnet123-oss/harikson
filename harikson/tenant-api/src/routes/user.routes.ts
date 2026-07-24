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
      'SELECT id, email, name, role, two_factor_enabled, created_at FROM users WHERE id = $1 AND deleted_at IS NULL',
      [req.user.userId]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: userRes.rows[0] });
  } catch (err: any) {
    logger.error('Fetch user profile error:', err);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// PUT /api/user/profile
router.put('/profile', validate(profileUpdateSchema), async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const { name } = req.body;
  try {
    const updateRes = await pool.query(
      'UPDATE users SET name = COALESCE($1, name), updated_at = NOW() WHERE id = $2 RETURNING id, email, name, role',
      [name, req.user.userId]
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

// GET /api/user/billing - tenant subscription & plan details
router.get('/billing', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    const subRes = await pool.query(
      `SELECT s.id, s.status, s.current_period_start, s.current_period_end, s.amount, s.currency, s.cancel_at_period_end,
              p.name as plan_name, p.price, p.billing_period, p.features, p.trial_days
       FROM subscriptions s
       LEFT JOIN plans p ON p.id = s.plan_id
       WHERE s.tenant_id = $1
       ORDER BY s.created_at DESC LIMIT 1`,
      [tenantId]
    );

    const subscription = subRes.rows[0] || null;
    const invoicesRes = await pool.query(
      `SELECT id, amount, currency, status, created_at, invoice_url
       FROM invoices WHERE tenant_id = $1
       ORDER BY created_at DESC LIMIT 10`,
      [tenantId]
    ).catch(() => ({ rows: [] }));

    res.json({
      subscription,
      invoices: invoicesRes.rows,
      paymentMethod: null,
    });
  } catch (err: any) {
    logger.error('Fetch billing error:', err);
    res.status(500).json({ error: 'Failed to fetch billing data' });
  }
});

// POST /api/user/billing/portal - billing portal redirect
router.post('/billing/portal', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  res.json({ url: null, message: 'Billing portal not configured' });
});

// POST /api/user/billing/cancel - cancel subscription
router.post('/billing/cancel', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const tenantId = req.tenant?.id;
    await pool.query(
      `UPDATE subscriptions SET cancel_at_period_end = true WHERE tenant_id = $1 AND status IN ('active', 'trialing')`,
      [tenantId]
    );
    res.json({ success: true, message: 'Subscription scheduled for cancellation at period end' });
  } catch (err: any) {
    logger.error('Cancel subscription error:', err);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// GET /api/user/workspace - tenant workspace info & members
router.get('/workspace', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    const tenantRes = await pool.query(
      `SELECT id, name, slug, status, custom_domain, created_at FROM tenants WHERE id = $1`,
      [tenantId]
    );

    const membersRes = await pool.query(
      `SELECT id, name, email, role, created_at FROM users WHERE tenant_id = $1 AND deleted_at IS NULL ORDER BY created_at ASC`,
      [tenantId]
    );

    const tenant = tenantRes.rows[0] || {};
    res.json({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      customDomain: tenant.custom_domain || null,
      createdAt: tenant.created_at,
      members: membersRes.rows,
    });
  } catch (err: any) {
    logger.error('Fetch workspace error:', err);
    res.status(500).json({ error: 'Failed to fetch workspace' });
  }
});

// POST /api/user/workspace/members - add member to workspace
router.post('/workspace/members', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { email, name, role, password } = req.body;
  if (!email || !name) return res.status(400).json({ error: 'email and name are required' });
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    const bcrypt = await import('bcrypt');
    const passwordHash = password ? await bcrypt.hash(password, 12) : null;
    const normalizedRole = (role || 'member').toLowerCase();

    const insertRes = await pool.query(
      `INSERT INTO users (tenant_id, email, name, role, email_verified, password_hash, created_at)
       VALUES ($1, $2, $3, $4, true, $5, NOW())
       RETURNING id, email, name, role, created_at`,
      [tenantId, email, name, normalizedRole, passwordHash]
    );

    res.status(201).json(insertRes.rows[0]);
  } catch (err: any) {
    logger.error('Add workspace member error:', err);
    if (err.code === '23505') return res.status(409).json({ error: 'A user with this email already exists' });
    res.status(500).json({ error: 'Failed to add workspace member' });
  }
});

// PUT /api/user/workspace/members/:id/role - update member role
router.put('/workspace/members/:id/role', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.params;
  const { role } = req.body;
  if (!role) return res.status(400).json({ error: 'role is required' });
  try {
    const tenantId = req.tenant?.id;
    await pool.query(
      `UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3 AND deleted_at IS NULL`,
      [role.toLowerCase(), id, tenantId]
    );
    res.json({ success: true, id, role });
  } catch (err: any) {
    logger.error('Update member role error:', err);
    res.status(500).json({ error: 'Failed to update member role' });
  }
});

// DELETE /api/user/workspace/members/:id - remove member from workspace
router.delete('/workspace/members/:id', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.params;
  if (id === req.user.userId) return res.status(400).json({ error: 'Cannot remove yourself from the workspace' });
  try {
    const tenantId = req.tenant?.id;
    await pool.query(
      `UPDATE users SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
    res.json({ success: true, message: 'Member removed from workspace' });
  } catch (err: any) {
    logger.error('Remove workspace member error:', err);
    res.status(500).json({ error: 'Failed to remove workspace member' });
  }
});

// GET /api/user/activity - user activity / audit log
router.get('/activity', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const logsRes = await pool.query(
      `SELECT id, action, ip_address, user_agent, details as metadata, created_at
       FROM activity_logs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.userId]
    ).catch(() => ({ rows: [] }));

    // Fallback: build from refresh_tokens if activity_logs empty
    if (logsRes.rows.length === 0) {
      const sessionsRes = await pool.query(
        `SELECT 'Signed in' as action, last_ip as ip_address, device_name as user_agent, last_used_at as created_at
         FROM refresh_tokens WHERE user_id = $1 ORDER BY last_used_at DESC LIMIT 20`,
        [req.user.userId]
      ).catch(() => ({ rows: [] }));
      return res.json(sessionsRes.rows);
    }

    res.json(logsRes.rows);
  } catch (err: any) {
    logger.error('Fetch activity error:', err);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

// GET /api/user/usage - token & query usage stats
router.get('/usage', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const days = parseInt(String(req.query.days || '7'), 10) || 7;
    const tenantId = req.tenant?.id;

    // Try chat_sessions / messages table
    const usageRes = await pool.query(
      `SELECT
         COUNT(*) as total_queries,
         COALESCE(SUM(tokens_used), 0) as total_tokens,
         COALESCE(SUM(prompt_tokens), 0) as prompt_tokens,
         COALESCE(SUM(completion_tokens), 0) as completion_tokens
       FROM messages
       WHERE tenant_id = $1 AND created_at >= NOW() - ($2 || ' days')::interval`,
      [tenantId, days]
    ).catch(() => ({ rows: [{ total_queries: 0, total_tokens: 0, prompt_tokens: 0, completion_tokens: 0 }] }));

    // Daily breakdown
    const dailyRes = await pool.query(
      `SELECT
         DATE(created_at) as date,
         COUNT(*) as queries,
         COALESCE(SUM(tokens_used), 0) as tokens
       FROM messages
       WHERE tenant_id = $1 AND created_at >= NOW() - ($2 || ' days')::interval
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [tenantId, days]
    ).catch(() => ({ rows: [] }));

    const summary = usageRes.rows[0] || {};
    res.json({
      totalQueries: Number(summary.total_queries) || 0,
      totalTokens: Number(summary.total_tokens) || 0,
      promptTokens: Number(summary.prompt_tokens) || 0,
      completionTokens: Number(summary.completion_tokens) || 0,
      dailyBreakdown: dailyRes.rows,
      periodDays: days,
      previousPeriodChange: null,
    });
  } catch (err: any) {
    logger.error('Fetch usage error:', err);
    res.status(500).json({ error: 'Failed to fetch usage data' });
  }
});

// GET /api/user/devices - connected devices (from refresh_tokens)
router.get('/devices', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const devicesRes = await pool.query(
      `SELECT id, device_name, device_hash, last_ip, country_code, last_used_at, created_at
       FROM refresh_tokens
       WHERE user_id = $1 AND expires_at > NOW()
       ORDER BY last_used_at DESC`,
      [req.user.userId]
    );

    const devices = devicesRes.rows.map((d) => ({
      id: d.id,
      name: d.device_name || 'Unknown Device',
      ip: d.last_ip || 'Unknown',
      location: d.country_code || 'Unknown',
      lastActive: d.last_used_at,
      createdAt: d.created_at,
      os: d.device_name || 'Unknown',
      browser: d.device_name || 'Unknown',
    }));

    res.json(devices);
  } catch (err: any) {
    logger.error('Fetch devices error:', err);
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

// DELETE /api/user/devices/:id - remove a device session
router.delete('/devices/:id', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM refresh_tokens WHERE id = $1 AND user_id = $2', [id, req.user.userId]);

    const devicesRes = await pool.query(
      `SELECT id, device_name, device_hash, last_ip, country_code, last_used_at, created_at
       FROM refresh_tokens WHERE user_id = $1 AND expires_at > NOW() ORDER BY last_used_at DESC`,
      [req.user.userId]
    );

    res.json({
      success: true,
      devices: devicesRes.rows.map((d) => ({
        id: d.id,
        name: d.device_name || 'Unknown Device',
        ip: d.last_ip || 'Unknown',
        location: d.country_code || 'Unknown',
        lastActive: d.last_used_at,
        os: d.device_name || 'Unknown',
      })),
    });
  } catch (err: any) {
    logger.error('Remove device error:', err);
    res.status(500).json({ error: 'Failed to remove device' });
  }
});

// GET /api/user/presets - prompt library presets
router.get('/presets', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const tenantId = req.tenant?.id;
    // prompt_presets table may not exist yet, return empty array gracefully
    const presetsRes = await pool.query(
      `SELECT id, name, description, system_prompt, created_at FROM prompt_presets WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    ).catch(() => ({ rows: [] }));
    res.json(presetsRes.rows);
  } catch (err: any) {
    logger.error('Fetch presets error:', err);
    res.json([]);
  }
});

// POST /api/user/presets - create prompt preset
router.post('/presets', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { name, description, systemPrompt } = req.body;
  if (!name || !systemPrompt) return res.status(400).json({ error: 'name and systemPrompt are required' });
  try {
    const tenantId = req.tenant?.id;
    // Ensure table exists
    await pool.query(`CREATE TABLE IF NOT EXISTS prompt_presets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      system_prompt TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    const insertRes = await pool.query(
      `INSERT INTO prompt_presets (tenant_id, user_id, name, description, system_prompt, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id, name, description, system_prompt, created_at`,
      [tenantId, req.user.userId, name, description || null, systemPrompt]
    );
    res.status(201).json(insertRes.rows[0]);
  } catch (err: any) {
    logger.error('Create preset error:', err);
    res.status(500).json({ error: 'Failed to create preset' });
  }
});

// DELETE /api/user/presets/:id
router.delete('/presets/:id', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.params;
  try {
    const tenantId = req.tenant?.id;
    await pool.query(`DELETE FROM prompt_presets WHERE id = $1 AND tenant_id = $2`, [id, tenantId]).catch(() => {});
    res.json({ success: true });
  } catch (err: any) {
    logger.error('Delete preset error:', err);
    res.status(500).json({ error: 'Failed to delete preset' });
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
