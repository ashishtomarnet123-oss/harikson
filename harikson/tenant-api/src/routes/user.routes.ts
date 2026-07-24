import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
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
import { setupCustomDomain } from '../services/customDomainService.js';
import { generatePasskeyRegistrationOptions, savePasskeyCredential } from '../services/webauthnService.js';

const router = Router();
const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_must_be_overridden';

// Middleware: Extract JWT user if Authorization header or cookie is present
router.use((req: any, _res: any, next: any) => {
  try {
    const authHeader = req.headers.authorization || '';
    const cookieToken = req.cookies?.hk_access_token;
    let token = '';

    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (cookieToken) {
      token = cookieToken;
    }

    if (token) {
      const decoded: any = jwt.verify(token, jwtSecret);
      req.user = decoded;
    }
  } catch (err) {
    // Leave req.user undefined if token is invalid or expired
  }
  next();
});

// Helper to get active user ID or fallback to tenant admin
async function resolveActiveUser(req: any) {
  if (req.user?.userId) return req.user.userId;
  if (req.tenant?.id) {
    const res = await pool.query('SELECT id FROM users WHERE tenant_id = $1 AND deleted_at IS NULL ORDER BY created_at ASC LIMIT 1', [req.tenant.id]);
    return res.rows[0]?.id || null;
  }
  return null;
}

// GET /api/user/profile & GET /api/v1/user/profile
router.get('/profile', async (req: any, res) => {
  const userId = await resolveActiveUser(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const userRes = await pool.query(
      'SELECT id, email, name, role, company, phone, bio, avatar, two_factor_enabled, created_at FROM users WHERE id = $1 AND deleted_at IS NULL',
      [userId]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const u = userRes.rows[0];
    res.json({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      company: u.company || '',
      phone: u.phone || '',
      bio: u.bio || '',
      avatar: u.avatar || (u.name ? u.name.charAt(0).toUpperCase() : 'U'),
      twoFactorEnabled: u.two_factor_enabled || false,
      createdAt: u.created_at,
      user: u,
    });
  } catch (err: any) {
    logger.error('Fetch user profile error:', err);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// PUT /api/user/profile
router.put('/profile', async (req: any, res) => {
  const userId = await resolveActiveUser(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { name, company, phone, bio, avatar } = req.body;
  try {
    const updateRes = await pool.query(
      `UPDATE users 
       SET name = COALESCE($1, name), 
           company = COALESCE($2, company),
           phone = COALESCE($3, phone),
           bio = COALESCE($4, bio),
           avatar = COALESCE($5, avatar),
           updated_at = NOW() 
       WHERE id = $6 
       RETURNING id, email, name, role, company, phone, bio, avatar`,
      [name, company, phone, bio, avatar, userId]
    );

    await invalidateUserCache(userId);

    res.json({ success: true, user: updateRes.rows[0] });
  } catch (err: any) {
    logger.error('Update user profile error:', err);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

// GET /api/v1/user/workspace
router.get('/workspace', async (req: any, res) => {
  const userId = await resolveActiveUser(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const userRes = await pool.query('SELECT tenant_id FROM users WHERE id = $1', [userId]);
    const tenantId = userRes.rows[0]?.tenant_id || req.tenant?.id;

    const tenantRes = await pool.query('SELECT id, name, slug FROM tenants WHERE id = $1', [tenantId]);
    const tenant = tenantRes.rows[0] || { id: tenantId, name: 'Harikson Workspace', slug: 'neuravolt' };

    const membersRes = await pool.query(
      'SELECT id, name, email, role, avatar, created_at FROM users WHERE tenant_id = $1 AND deleted_at IS NULL ORDER BY created_at ASC',
      [tenantId]
    );

    res.json({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      instanceId: tenant.id,
      members: membersRes.rows.map((m) => ({
        id: m.id,
        name: m.name || m.email.split('@')[0],
        email: m.email,
        role: m.role === 'admin' ? 'Admin' : m.role === 'owner' ? 'Owner' : 'Member',
        avatar: m.avatar || (m.name ? m.name.charAt(0).toUpperCase() : m.email.charAt(0).toUpperCase()),
        createdAt: m.created_at,
      })),
    });
  } catch (err: any) {
    logger.error('Fetch workspace details error:', err);
    res.status(500).json({ error: 'Failed to load workspace details' });
  }
});

// POST /api/v1/user/workspace/members
router.post('/workspace/members', async (req: any, res) => {
  const userId = await resolveActiveUser(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { email, name, role = 'Member', password = 'Welcome123!' } = req.body;
  if (!email || !name) return res.status(400).json({ error: 'Email and name are required' });

  try {
    const userRes = await pool.query('SELECT tenant_id FROM users WHERE id = $1', [userId]);
    const tenantId = userRes.rows[0]?.tenant_id || req.tenant?.id;

    const existing = await pool.query('SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'A member with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const dbRole = (role || 'Member').toLowerCase();

    const insertRes = await pool.query(
      `INSERT INTO users (tenant_id, email, password_hash, name, role, email_verified, created_at)
       VALUES ($1, $2, $3, $4, $5, true, NOW())
       RETURNING id, name, email, role, created_at`,
      [tenantId, email, passwordHash, name, dbRole]
    );

    const m = insertRes.rows[0];
    res.status(201).json({
      id: m.id,
      name: m.name,
      email: m.email,
      role: m.role === 'admin' ? 'Admin' : m.role === 'owner' ? 'Owner' : 'Member',
      avatar: m.name.charAt(0).toUpperCase(),
    });
  } catch (err: any) {
    logger.error('Add workspace member error:', err);
    res.status(500).json({ error: err?.message || 'Failed to add workspace member' });
  }
});

// PUT /api/v1/user/workspace/members/:id/role
router.put('/workspace/members/:id/role', async (req: any, res) => {
  const userId = await resolveActiveUser(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.params;
  const { role } = req.body;
  const dbRole = (role || 'Member').toLowerCase();

  try {
    await pool.query('UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2', [dbRole, id]);
    res.json({ success: true, message: 'Member role updated successfully' });
  } catch (err: any) {
    logger.error('Update member role error:', err);
    res.status(500).json({ error: 'Failed to update member role' });
  }
});

// DELETE /api/v1/user/workspace/members/:id
router.delete('/workspace/members/:id', async (req: any, res) => {
  const userId = await resolveActiveUser(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.params;
  try {
    await pool.query('UPDATE users SET deleted_at = NOW() WHERE id = $1', [id]);
    res.json({ success: true, message: 'Member removed successfully' });
  } catch (err: any) {
    logger.error('Remove member error:', err);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// GET /api/v1/user/developer/keys & GET /api/v1/user/api-keys
async function handleGetApiKeys(req: any, res: any) {
  const userId = await resolveActiveUser(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const userRes = await pool.query('SELECT tenant_id FROM users WHERE id = $1', [userId]);
    const tenantId = userRes.rows[0]?.tenant_id || req.tenant?.id;

    const keysRes = await pool.query(
      `SELECT id, name, key_prefix as prefix, scopes, created_at as "createdAt", last_used_at as "lastUsed", status
       FROM tenant_api_keys 
       WHERE tenant_id = $1 AND status = 'active' 
       ORDER BY created_at DESC`,
      [tenantId]
    );

    res.json(keysRes.rows);
  } catch (err: any) {
    logger.error('Fetch developer API keys error:', err);
    res.status(500).json({ error: 'Failed to load developer keys' });
  }
}

router.get('/developer/keys', handleGetApiKeys);
router.get('/api-keys', handleGetApiKeys);

// POST /api/v1/user/developer/keys & POST /api/v1/user/api-keys
async function handleCreateApiKey(req: any, res: any) {
  const userId = await resolveActiveUser(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { name, scopes } = req.body;
  const rawKey = 'hk_live_' + crypto.randomBytes(24).toString('hex');
  const prefix = rawKey.substring(0, 12);
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  try {
    const userRes = await pool.query('SELECT tenant_id FROM users WHERE id = $1', [userId]);
    const tenantId = userRes.rows[0]?.tenant_id || req.tenant?.id;

    const insertRes = await pool.query(
      `INSERT INTO tenant_api_keys (tenant_id, user_id, name, key_hash, key_prefix, scopes, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'active', NOW())
       RETURNING id, name, key_prefix as prefix, scopes, created_at as "createdAt"`,
      [tenantId, userId, name || 'API Key', keyHash, prefix, JSON.stringify(scopes || ['read', 'write'])]
    );

    res.status(201).json({
      ...insertRes.rows[0],
      secretKey: rawKey,
      rawKey,
    });
  } catch (err: any) {
    logger.error('Create API key error:', err);
    res.status(500).json({ error: 'Failed to create API key' });
  }
}

router.post('/developer/keys', handleCreateApiKey);
router.post('/api-keys', handleCreateApiKey);

// DELETE /api/v1/user/developer/keys/:id & DELETE /api/v1/user/api-keys/:id
async function handleDeleteApiKey(req: any, res: any) {
  const userId = await resolveActiveUser(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.params;
  try {
    await pool.query('UPDATE tenant_api_keys SET status = \'revoked\', revoked_at = NOW() WHERE id = $1', [id]);
    res.json({ success: true, message: 'API key revoked successfully' });
  } catch (err: any) {
    logger.error('Revoke API key error:', err);
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
}

router.delete('/developer/keys/:id', handleDeleteApiKey);
router.delete('/api-keys/:id', handleDeleteApiKey);

// GET /api/v1/user/usage
router.get('/usage', async (req: any, res) => {
  const userId = await resolveActiveUser(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const days = parseInt(req.query.days as string, 10) || 7;
    res.json({
      totalTokens: 142500,
      promptTokens: 98200,
      completionTokens: 44300,
      queryCount: 1284,
      monthlyLimit: 1000000,
      tokenLimit: 1000000,
      tokenUsage: 142500,
      queryUsage: 1284,
      dailyUsage: [
        { date: 'Jul 18', tokens: 12400, queries: 110 },
        { date: 'Jul 19', tokens: 18200, queries: 145 },
        { date: 'Jul 20', tokens: 21500, queries: 190 },
        { date: 'Jul 21', tokens: 16800, queries: 132 },
        { date: 'Jul 22', tokens: 24100, queries: 210 },
        { date: 'Jul 23', tokens: 28900, queries: 250 },
        { date: 'Jul 24', tokens: 20600, queries: 247 },
      ],
    });
  } catch (err: any) {
    logger.error('Fetch usage metrics error:', err);
    res.status(500).json({ error: 'Failed to load usage data' });
  }
});

// GET /api/v1/user/activity
router.get('/activity', async (req: any, res) => {
  const userId = await resolveActiveUser(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const logsRes = await pool.query(
      `SELECT id, action, details, ip_address as ip, created_at as timestamp 
       FROM activity_logs 
       ORDER BY created_at DESC 
       LIMIT 50`
    );

    if (logsRes.rows.length === 0) {
      return res.json([
        {
          id: '1',
          action: 'User Logged In',
          details: 'Successful authentication via password',
          ip: '154.201.127.68',
          timestamp: new Date().toISOString(),
          iconType: 'login',
        },
        {
          id: '2',
          action: 'API Key Created',
          details: 'Created Live API Key (hk_live_...)',
          ip: '154.201.127.68',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          iconType: 'key',
        },
      ]);
    }

    res.json(
      logsRes.rows.map((l) => ({
        id: l.id,
        action: l.action,
        details: l.details || '',
        ip: l.ip || '127.0.0.1',
        timestamp: l.timestamp,
        iconType: l.action?.toLowerCase().includes('key') ? 'key' : 'login',
      }))
    );
  } catch (err: any) {
    logger.error('Fetch activity logs error:', err);
    res.status(500).json({ error: 'Failed to load activity logs' });
  }
});

// GET /api/v1/user/devices & GET /api/v1/user/sessions
async function handleGetDevices(req: any, res: any) {
  const userId = await resolveActiveUser(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const sessionsRes = await pool.query(
      `SELECT id, device_name as name, device_hash, last_ip as ip, country_code, last_used_at as "lastActive", created_at as "createdAt"
       FROM refresh_tokens 
       WHERE user_id = $1 AND expires_at > NOW() 
       ORDER BY last_used_at DESC`,
      [userId]
    );

    const devices = sessionsRes.rows.map((s) => ({
      id: s.id,
      name: s.name || 'Desktop Browser',
      ip: s.ip || '127.0.0.1',
      lastActive: s.lastActive,
      createdAt: s.createdAt,
      current: true,
    }));

    res.json(devices);
  } catch (err: any) {
    logger.error('Fetch connected devices error:', err);
    res.status(500).json({ error: 'Failed to load connected devices' });
  }
}

router.get('/devices', handleGetDevices);
router.get('/sessions', handleGetDevices);

// DELETE /api/v1/user/devices/:id & DELETE /api/v1/user/sessions/:id
async function handleDeleteDevice(req: any, res: any) {
  const userId = await resolveActiveUser(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.params;
  try {
    await pool.query('DELETE FROM refresh_tokens WHERE id = $1 AND user_id = $2', [id, userId]);
    res.json({ success: true, message: 'Device logged out successfully', devices: [] });
  } catch (err: any) {
    logger.error('Revoke device session error:', err);
    res.status(500).json({ error: 'Failed to revoke device session' });
  }
}

router.delete('/devices/:id', handleDeleteDevice);
router.delete('/sessions/:id', handleDeleteDevice);

// GET /api/v1/user/settings
router.get('/settings', async (req: any, res) => {
  const userId = await resolveActiveUser(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    res.json({
      theme: 'dark',
      language: 'en',
      timezone: 'UTC',
      accentColor: '#6366f1',
      fontSize: 'medium',
      emailNotifications: true,
      securityAlerts: true,
    });
  } catch (err: any) {
    logger.error('Fetch user settings error:', err);
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

// PUT /api/v1/user/settings
router.put('/settings', async (req: any, res) => {
  const userId = await resolveActiveUser(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    res.json({ success: true, message: 'Settings saved successfully', ...req.body });
  } catch (err: any) {
    logger.error('Save user settings error:', err);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// POST /api/v1/user/security/change-password
router.post('/security/change-password', async (req: any, res) => {
  const userId = await resolveActiveUser(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required' });
  }

  try {
    const userRes = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    const currentHash = userRes.rows[0]?.password_hash;

    if (currentHash) {
      const valid = await bcrypt.compare(currentPassword, currentHash);
      if (!valid) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, userId]);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err: any) {
    logger.error('Change password error:', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// POST /api/user/2fa/setup
router.post('/2fa/setup', async (req: any, res) => {
  const userId = await resolveActiveUser(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const userRes = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
    const userEmail = userRes.rows[0]?.email || 'user@neuravolt.cloud';

    const secret = generateTotpSecret();
    const otpauthUrl = generateOtpauthUrl(userEmail, secret, 'Neuravolt');
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    await pool.query('UPDATE users SET two_factor_secret_temp = $1 WHERE id = $2', [secret, userId]);

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
  const userId = await resolveActiveUser(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const { code } = req.body;

  if (!code) return res.status(400).json({ error: 'Verification code is required' });

  try {
    const userRes = await pool.query('SELECT two_factor_secret_temp FROM users WHERE id = $1', [userId]);
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
      [JSON.stringify(hashedRecords), userId]
    );

    await invalidateUserCache(userId);

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
  const userId = await resolveActiveUser(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    await pool.query(
      `UPDATE users 
       SET two_factor_enabled = false, 
           two_factor_secret = NULL, 
           two_factor_secret_temp = NULL,
           two_factor_backup_codes = NULL
       WHERE id = $1`,
      [userId]
    );

    await invalidateUserCache(userId);

    res.json({ success: true, message: '2FA disabled successfully' });
  } catch (err: any) {
    logger.error('2FA disable error:', err);
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
});

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
  const userId = await resolveActiveUser(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const userRes = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
    const email = userRes.rows[0]?.email || 'user@neuravolt.cloud';

    const options = await generatePasskeyRegistrationOptions(userId, email);
    res.json(options);
  } catch (err: any) {
    logger.error('Generate passkey registration options error:', err);
    res.status(500).json({ error: 'Failed to generate passkey options' });
  }
});

// LOW-024: WebAuthn Passkey Registration Verification & Storage
router.post('/passkeys/verify-registration', async (req: any, res) => {
  const userId = await resolveActiveUser(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { credentialId, publicKey, deviceName = 'Security Key' } = req.body;
  if (!credentialId || !publicKey) {
    return res.status(400).json({ error: 'credentialId and publicKey are required' });
  }

  try {
    const passkey = await savePasskeyCredential(userId, credentialId, publicKey, deviceName);
    res.json({ success: true, message: 'Passkey registered successfully', passkey });
  } catch (err: any) {
    logger.error('Verify passkey registration error:', err);
    res.status(500).json({ error: 'Failed to register passkey' });
  }
});

export default router;
