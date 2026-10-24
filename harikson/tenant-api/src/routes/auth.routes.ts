import { Router } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Redis } from 'ioredis';
import { pool, executeTenantQuery } from '../db/pool.js';
import logger from '../utils/logger.js';
import { validate } from '../middleware/validation.middleware.js';
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/auth.schema.js';
import {
  sendPasswordReset,
  sendWelcomeEmail,
  sendVerificationEmail,
  sendAccountLockoutAlert,
  sendDeviceMismatchAlert,
} from '../services/email.js';
import { verifyTotpToken, verifyBackupCode } from '../services/twoFactorService.js';
import { computeDeviceFingerprint } from '../services/deviceService.js';

const router = Router();
const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379', {
  retryStrategy: (times) => Math.min(times * 50, 2000),
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
});

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is not set');
  return secret;
};

export function getAuthCookieHeaders(
  req: any,
  accessToken: string,
  refreshToken: string,
  maxAgeAccess = 7 * 24 * 60 * 60,
  maxAgeRefresh = 30 * 24 * 60 * 60
): string[] {
  const forwardedHost = (req.headers['x-forwarded-host'] as string) || '';
  const host = (req.headers.host as string) || '';
  const origin = (req.headers.origin as string) || '';
  const isXarwiz = host.includes('xarwiz.com') || forwardedHost.includes('xarwiz.com') || origin.includes('xarwiz.com');
  const domainSuffix = isXarwiz ? '; Domain=.xarwiz.com' : '';
  const isHttps = req.headers['x-forwarded-proto'] === 'https' || (req.socket as any)?.encrypted;
  const secureFlag = isHttps ? 'Secure; ' : '';

  return [
    `hk_access_token=${accessToken}; HttpOnly; ${secureFlag}SameSite=Lax; Path=/; Max-Age=${maxAgeAccess}${domainSuffix}`,
    `hk_refresh_token=${refreshToken}; HttpOnly; ${secureFlag}SameSite=Lax; Path=/; Max-Age=${maxAgeRefresh}${domainSuffix}`,
  ];
}

export function getClearCookieHeaders(req: any): string[] {
  const forwardedHost = (req.headers['x-forwarded-host'] as string) || '';
  const host = (req.headers.host as string) || '';
  const origin = (req.headers.origin as string) || '';
  const isXarwiz = host.includes('xarwiz.com') || forwardedHost.includes('xarwiz.com') || origin.includes('xarwiz.com');
  const domainSuffix = isXarwiz ? '; Domain=.xarwiz.com' : '';
  const isHttps = req.headers['x-forwarded-proto'] === 'https' || (req.socket as any)?.encrypted;
  const secureFlag = isHttps ? 'Secure; ' : '';

  return [
    `hk_access_token=; HttpOnly; ${secureFlag}SameSite=Lax; Path=/; Max-Age=0${domainSuffix}`,
    `hk_refresh_token=; HttpOnly; ${secureFlag}SameSite=Lax; Path=/; Max-Age=0${domainSuffix}`,
  ];
}

// Helper: Handle Login Logic
async function handleLogin(req: any, res: any) {
  const { email, password } = req.body;
  try {
    const xForwardedFor = (req.headers['x-forwarded-for'] as any) || '';
    const realIp = (req.headers['x-real-ip'] as any) || '';
    let clientIp = '';
    if (xForwardedFor) {
      const parts = xForwardedFor.split(',').map((p: string) => p.trim()).filter(Boolean);
      clientIp = parts[0] || '';
    }
    if (!clientIp && realIp) {
      clientIp = realIp.trim();
    }
    if (!clientIp) {
      clientIp = req.socket?.remoteAddress || '127.0.0.1';
    }

    const cleanEmail = (email || '').toLowerCase().trim();
    const key = `ratelimit:login:${clientIp}:${cleanEmail || 'unknown'}`;
    const legacyKey = `ratelimit:login:${clientIp}`;
    const attempts = await redis.incr(key);
    if (attempts === 1) {
      await redis.expire(key, 60);
    } else {
      const ttl = await redis.ttl(key);
      if (ttl < 0) {
        await redis.expire(key, 60);
      }
    }
    if (attempts > 15) {
      return res.status(429).json({
        error: 'Too many login attempts. Rate limit exceeded. Try again in a minute.',
      });
    }

    let userResult = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND tenant_id = $2 AND deleted_at IS NULL',
      [email, req.tenant?.id]
    );
    // Bare-domain login: tenant slug may be 'default' but user belongs to
    // a different tenant. Fall back to email-only lookup (limited to 1 row
    // so ambiguous multi-tenant emails still fail safely).
    if (userResult.rows.length === 0) {
      userResult = await pool.query(
        'SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL LIMIT 1',
        [email]
      );
    }
    const user = userResult.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const retryAfter = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({
        error: 'Account is temporarily locked due to multiple failed login attempts.',
        locked: true,
        retryAfter,
        email: user.email,
      });
    }

    let valid = false;
    if (user.password_hash) {
      valid = await bcrypt.compare(password, user.password_hash);
    }

    if (!valid) {
      const failCount = (user.failed_login_attempts || 0) + 1;
      let updateQuery = 'UPDATE users SET failed_login_attempts = $1 WHERE id = $2';
      let queryParams: any[] = [failCount, user.id];

      if (failCount >= 10) {
        const lockoutCount = user.lockout_count || 0;
        let lockoutHours = 1;
        let durationText = '1 hour';
        if (lockoutCount === 1) {
          lockoutHours = 4;
          durationText = '4 hours';
        } else if (lockoutCount >= 2) {
          lockoutHours = 24;
          durationText = '24 hours';
        }

        const unlockToken = crypto.randomBytes(32).toString('hex');
        const unlockTokenHash = crypto.createHash('sha256').update(unlockToken).digest('hex');

        updateQuery = `
          UPDATE users 
          SET failed_login_attempts = $1,
              locked_until = NOW() + INTERVAL '${lockoutHours} hours',
              lockout_count = lockout_count + 1,
              unlock_token = $3
          WHERE id = $2`;
        queryParams = [failCount, user.id, unlockTokenHash];

        const appOrigin = process.env.USER_PORTAL_URL || process.env.APP_URL || 'https://xarwiz.com';
        const unlockUrl = `${appOrigin.replace(/\/$/, '')}/unlock-account?token=${unlockToken}`;
        sendAccountLockoutAlert(user.email, unlockUrl, durationText).catch((err) =>
          logger.error('[ACCOUNT LOCKOUT ALERT ERROR]:', err.message)
        );
      }

      await pool.query(updateQuery, queryParams);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    await pool.query(
      'UPDATE users SET failed_login_attempts = 0, locked_until = NULL, lockout_count = 0, unlock_token = NULL WHERE id = $1',
      [user.id]
    );
    await redis.del(key).catch(() => {});
    await redis.del(legacyKey).catch(() => {});

    // Invite-only / Admin approval status check gate
    const userStatus = user.status || 'active';
    if (userStatus === 'pending' || userStatus === 'pending_approval') {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_PENDING_APPROVAL',
        error: 'Your account is awaiting administrator approval.',
        message: 'Your account is awaiting administrator approval.',
        pendingApproval: true,
        status: 'pending',
        email: user.email,
      });
    }

    if (userStatus === 'suspended') {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_SUSPENDED',
        error: 'Your account has been suspended. Please contact platform support.',
        message: 'Your account has been suspended. Please contact platform support.',
        suspended: true,
        status: 'suspended',
        email: user.email,
      });
    }

    if (user.email_verified === false) {
      return res.status(403).json({
        error: 'Email verification required. Please check your inbox.',
        requireVerification: true,
        email: user.email,
      });
    }

    if (user.force_password_change || user.must_change_password) {
      return res.status(403).json({
        success: false,
        error: 'Password change required before access. Please reset your password or contact your administrator.',
        requirePasswordChange: true,
        mustChangePassword: true,
        code: 'FORCE_PASSWORD_CHANGE_REQUIRED',
        message: 'Password change required before access.',
        userId: user.id,
        email: user.email,
      });
    }

    if (user.two_factor_enabled) {
      return res.json({
        success: false,
        requires2FA: true,
        userId: user.id,
      });
    }

    let resolvedTenantId = req.tenant?.id || user.tenant_id;
    let resolvedTenantSlug = req.tenant?.slug || 'default';
    if (user.tenant_id !== req.tenant?.id) {
      const tenantRes = await pool.query('SELECT slug FROM tenants WHERE id = $1', [user.tenant_id]);
      if (tenantRes.rows.length > 0) {
        resolvedTenantId = user.tenant_id;
        resolvedTenantSlug = tenantRes.rows[0].slug;
      }
    }

    const accessToken = jwt.sign({ userId: user.id, role: user.role }, getJwtSecret(), { expiresIn: '7d' });
    const refreshToken = crypto.randomBytes(64).toString('hex');
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const familyId = crypto.randomUUID();
    const fingerprint = computeDeviceFingerprint(req);

    await pool.query(
      `INSERT INTO refresh_tokens (
        token, user_id, tenant_id, expires_at, refresh_token_family,
        device_hash, device_name, last_ip, country_code, last_used_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      [
        refreshTokenHash,
        user.id,
        resolvedTenantId,
        expiresAt,
        familyId,
        fingerprint.deviceHash,
        fingerprint.deviceName,
        fingerprint.ip,
        fingerprint.countryCode,
      ]
    );

    res.setHeader('Set-Cookie', getAuthCookieHeaders(req, accessToken, refreshToken));

    res.json({
      success: true,
      accessToken,
      token: accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: resolvedTenantId,
        tenantSlug: resolvedTenantSlug,
      },
    });
  } catch (err: any) {
    logger.error('Login error:', err);
    res.status(500).json({ error: 'Login failed due to a server error' });
  }
}

// POST /register and POST /v1/register
async function handleRegister(req: any, res: any) {
  const {
    email,
    password,
    name,
    phone,
    companyName,
    company,
    tenantSlug,
    privacyNoticeAcknowledged,
    marketingConsent,
    source,
  } = req.body;
  try {
    const ip =
      ((req.headers['x-forwarded-for'] as any) || req.socket?.remoteAddress || '')
        .split(',')[0]
        .trim() || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || '';

    // DPDP Section 5/6: Prior notice must be presented and acknowledged before processing begins
    if (privacyNoticeAcknowledged === false) {
      return res.status(400).json({
        error: 'You must review and acknowledge the Xarwiz Privacy Policy to register an account.',
      });
    }

    const regKey = `ratelimit:register:${ip}`;
    const regAttempts = await redis.incr(regKey);
    if (regAttempts === 1) await redis.expire(regKey, 300);
    if (regAttempts > 5) {
      return res.status(429).json({ error: 'Too many registration attempts. Try again in 5 minutes.' });
    }
    const existing = await pool.query('SELECT id, status FROM users WHERE email = $1 AND deleted_at IS NULL', [email]);
    if (existing.rows.length > 0) {
      const existingUser = existing.rows[0];
      if (existingUser.status === 'pending' || existingUser.status === 'pending_approval') {
        return res.status(200).json({
          success: true,
          status: 'pending_approval',
          alreadyRequested: true,
          requiresApproval: true,
          message: 'Your access request has already been received and is awaiting approval.',
        });
      }
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Every self-serve registration gets its own brand-new, isolated tenant
    const effectiveCompany = companyName || company || null;
    const effectiveSlug = (tenantSlug && tenantSlug !== 'default') ? tenantSlug : (effectiveCompany || name || 'workspace');
    const slugBase = effectiveSlug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .slice(0, 50) || 'workspace';
    const slugTaken = await pool.query('SELECT 1 FROM tenants WHERE slug = $1', [slugBase]);
    const slugToUse = slugTaken.rows.length > 0 ? `${slugBase}-${crypto.randomBytes(3).toString('hex')}` : slugBase;

    const newTenantRes = await pool.query(
      `INSERT INTO tenants (name, slug, plan, status, created_at)
       VALUES ($1, $2, 'free', 'active', NOW())
       RETURNING id`,
      [effectiveCompany || (name ? `${name}'s Workspace` : 'My Workspace'), slugToUse]
    );
    const tenantId = newTenantRes.rows[0].id;

    const passwordHash = await bcrypt.hash(password, 12);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');

    const cleanSource = (typeof source === 'string' && source.trim()) ? source.trim() : 'request_access';
    const userSettings = { source: cleanSource };

    const newUserRes = await pool.query(
      `INSERT INTO users (
        tenant_id, email, password_hash, name, phone, company, role, email_verified, email_verification_token, verification_token, status, settings, created_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, 'owner', true, $7, $7, 'pending', $8, NOW())
       RETURNING id, email, name, role, status, created_at`,
      [
        tenantId,
        email,
        passwordHash,
        name,
        phone || null,
        effectiveCompany,
        verificationTokenHash,
        JSON.stringify(userSettings),
      ]
    );

    const user = newUserRes.rows[0];

    // Persist DPDP Consent Records & Audit Trail:
    // 1. service_processing (contractual necessity - granted upon account creation)
    const consentCollectionSource = cleanSource === 'book_demo' || cleanSource === 'book_live_demo' ? cleanSource : 'signup';
    await pool.query(
      `INSERT INTO user_consents (tenant_id, user_id, purpose_id, status, notice_version, collection_source, last_changed_at)
       VALUES ($1, $2, 'service_processing', 'granted', '2.0-dpdp', $3, NOW())
       ON CONFLICT (tenant_id, user_id, purpose_id) DO NOTHING`,
      [tenantId, user.id, consentCollectionSource]
    ).catch((err) => logger.error('Failed to log service_processing consent:', err));

    await pool.query(
      `INSERT INTO consent_audit_events (
         tenant_id, user_id, purpose_id, event_type, previous_status, new_status,
         notice_version, collection_source, ip_address, user_agent, metadata
       )
       VALUES ($1, $2, 'service_processing', 'granted', 'not_configured', 'granted',
               '2.0-dpdp', $5, $3, $4, '{"lawful_basis": "contractual_necessity"}')`,
      [tenantId, user.id, ip, userAgent, consentCollectionSource]
    ).catch((err) => logger.error('Failed to log service_processing audit event:', err));

    // 2. marketing_emails (unbundled optional consent - granted if checked, declined if unchecked)
    const marketingStatus = marketingConsent === true ? 'granted' : 'declined';
    await pool.query(
      `INSERT INTO user_consents (tenant_id, user_id, purpose_id, status, notice_version, collection_source, last_changed_at)
       VALUES ($1, $2, 'marketing_emails', $3, '2.0-dpdp', $4, NOW())
       ON CONFLICT (tenant_id, user_id, purpose_id) DO NOTHING`,
      [tenantId, user.id, marketingStatus, consentCollectionSource]
    ).catch((err) => logger.error('Failed to log marketing consent:', err));

    await pool.query(
      `INSERT INTO consent_audit_events (
         tenant_id, user_id, purpose_id, event_type, previous_status, new_status,
         notice_version, collection_source, ip_address, user_agent, metadata
       )
       VALUES ($1, $2, 'marketing_emails', $3, 'not_configured', $3,
               '2.0-dpdp', $6, $4, $5, '{"lawful_basis": "consent"}')`,
      [tenantId, user.id, marketingStatus, ip, userAgent, consentCollectionSource]
    ).catch((err) => logger.error('Failed to log marketing audit event:', err));

    // Assign Free Plan
    await pool.query(
      `INSERT INTO subscriptions (
        tenant_id, plan_id, provider, provider_subscription_id, status,
        current_period_start, current_period_end, amount, currency, created_at
       )
       VALUES ($1, 'free', 'system', $2, 'active', NOW(), NULL, 0, 'INR', NOW())`,
      [tenantId, 'sub_free_' + crypto.randomBytes(8).toString('hex')]
    ).catch((err) => logger.error('Failed to create free subscription:', err?.message || err));

    const appOrigin = process.env.USER_PORTAL_URL || process.env.APP_URL || 'https://xarwiz.com';
    const verifyUrl = `${appOrigin.replace(/\/$/, '')}/verify-email?token=${verificationToken}`;
    sendVerificationEmail(user.email, verifyUrl).catch((err) =>
      logger.error('Failed to send verification email:', err?.message || err)
    );

    const successMsg =
      cleanSource === 'book_demo'
        ? 'Your demo request has been received.'
        : cleanSource === 'book_live_demo'
        ? 'Your live demo request has been received.'
        : 'Your access request has been received.';

    res.status(201).json({
      success: true,
      status: 'pending_approval',
      requiresApproval: true,
      source: cleanSource,
      message: successMsg,
    });
  } catch (err: any) {
    logger.error('Registration error:', err?.message || err);
    res.status(500).json({ error: err?.message || 'Registration failed due to a server error' });
  }
}

router.post('/register', validate(registerSchema), handleRegister);
router.post('/v1/register', validate(registerSchema), handleRegister);

router.post('/login', validate(loginSchema), handleLogin);
router.post('/v1/login', validate(loginSchema), handleLogin);

// POST /login/2fa - Complete 2FA Login
router.post('/login/2fa', async (req, res) => {
  const { userId, code } = req.body;
  if (!userId || !code) {
    return res.status(400).json({ error: 'userId and 2FA code are required' });
  }

  try {
    const userRes = await pool.query('SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL', [userId]);
    const user = userRes.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userStatus = user.status || 'active';
    if (userStatus === 'pending' || userStatus === 'pending_approval') {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_PENDING_APPROVAL',
        error: 'Your account is awaiting administrator approval.',
        message: 'Your account is awaiting administrator approval.',
        pendingApproval: true,
        status: 'pending',
        email: user.email,
      });
    }

    if (!user.two_factor_enabled || !user.two_factor_secret) {
      return res.status(400).json({ error: '2FA is not enabled for this user' });
    }

    let isCodeValid = verifyTotpToken(code, user.two_factor_secret);
    if (!isCodeValid) {
      const isBackupValid = await verifyBackupCode(userId, code);
      if (isBackupValid) {
        isCodeValid = true;
      }
    }

    if (!isCodeValid) {
      return res.status(401).json({ error: 'Invalid 2FA code' });
    }

    const accessToken = jwt.sign({ userId: user.id, role: user.role }, getJwtSecret(), { expiresIn: '7d' });
    const refreshToken = crypto.randomBytes(64).toString('hex');
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const familyId = crypto.randomUUID();
    const fingerprint = computeDeviceFingerprint(req);

    await pool.query(
      `INSERT INTO refresh_tokens (
        token, user_id, tenant_id, expires_at, refresh_token_family,
        device_hash, device_name, last_ip, country_code, last_used_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      [
        refreshTokenHash,
        user.id,
        user.tenant_id,
        expiresAt,
        familyId,
        fingerprint.deviceHash,
        fingerprint.deviceName,
        fingerprint.ip,
        fingerprint.countryCode,
      ]
    );

    res.setHeader('Set-Cookie', getAuthCookieHeaders(req, accessToken, refreshToken));

    res.json({
      success: true,
      accessToken,
      token: accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenant_id,
      },
    });
  } catch (err: any) {
    logger.error('2FA Login error:', err);
    res.status(500).json({ error: '2FA authentication failed' });
  }
});

// POST /refresh - Refresh Token
// Rolling refresh: each successful refresh extends the session by another 30 days.
// Users stay logged in indefinitely until they explicitly log out.
async function handleRefresh(req: any, res: any) {
  const refreshToken = req.body?.refreshToken || req.cookies?.hk_refresh_token;
  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token missing' });
  }

  try {
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const tokenRes = await pool.query('SELECT * FROM refresh_tokens WHERE token = $1', [refreshTokenHash]);
    const rtRecord = tokenRes.rows[0];

    if (!rtRecord) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    if (new Date(rtRecord.expires_at) < new Date()) {
      await pool.query('DELETE FROM refresh_tokens WHERE id = $1', [rtRecord.id]);
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }

    // NOTE: Device fingerprint check removed intentionally.
    // It was causing sign-outs on every IP change (WiFi→cellular, VPN, ISP rotation).
    // We log the current fingerprint for audit purposes only.
    const currentFingerprint = computeDeviceFingerprint(req);

    const userRes = await pool.query('SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL', [rtRecord.user_id]);
    const user = userRes.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' });
    }

    // Issue new access token (7d) and rolling refresh token
    const newAccessToken = jwt.sign({ userId: user.id, role: user.role }, getJwtSecret(), { expiresIn: '7d' });
    const newRefreshToken = crypto.randomBytes(64).toString('hex');
    const newRefreshTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');

    // Rolling expiry: 30 days from NOW (not from original issue date)
    const rollingExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await pool.query('DELETE FROM refresh_tokens WHERE id = $1', [rtRecord.id]);
    await pool.query(
      `INSERT INTO refresh_tokens (
        token, user_id, tenant_id, expires_at, refresh_token_family,
        device_hash, device_name, last_ip, country_code, last_used_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      [
        newRefreshTokenHash,
        user.id,
        user.tenant_id,
        rollingExpiry,
        rtRecord.refresh_token_family,
        currentFingerprint.deviceHash, // stored for audit, NOT enforced on next request
        currentFingerprint.deviceName,
        currentFingerprint.ip,
        currentFingerprint.countryCode,
      ]
    );

    res.setHeader('Set-Cookie', getAuthCookieHeaders(req, newAccessToken, newRefreshToken));

    res.json({
      success: true,
      accessToken: newAccessToken,   // consistent key used by AuthContext
      token: newAccessToken,         // legacy alias
      refreshToken: newRefreshToken,
    });
  } catch (err: any) {
    logger.error('Token refresh error:', err);
    res.status(500).json({ error: 'Token refresh failed' });
  }
}

router.post('/refresh', handleRefresh);
router.post('/v1/refresh', handleRefresh);

// POST /logout
async function handleLogout(req: any, res: any) {
  const refreshToken = req.body?.refreshToken || req.cookies?.hk_refresh_token;
  if (refreshToken) {
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshTokenHash]).catch(() => {});
  }

  res.setHeader('Set-Cookie', getClearCookieHeaders(req));

  res.json({ success: true, message: 'Logged out successfully' });
}

router.post('/logout', handleLogout);
router.post('/v1/logout', handleLogout);

// POST /forgot-password
async function handleForgotPassword(req: any, res: any) {
  const { email } = req.body;
  try {
    const ip =
      ((req.headers['x-forwarded-for'] as any) || req.socket?.remoteAddress || '')
        .split(',')[0]
        .trim() || '127.0.0.1';
    const fpKey = `ratelimit:forgot:${ip}`;
    const fpAttempts = await redis.incr(fpKey);
    if (fpAttempts === 1) await redis.expire(fpKey, 300);
    if (fpAttempts > 5) {
      return res.json({ message: 'If that email exists, a password reset link has been sent.' });
    }
    const userRes = await pool.query('SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL', [email]);
    if (userRes.rows.length === 0) {
      return res.json({ message: 'If that email exists, a password reset link has been sent.' });
    }

    const user = userRes.rows[0];
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query(
      `INSERT INTO password_reset_tokens (tenant_id, user_id, token_hash, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [user.tenant_id, user.id, resetTokenHash, expiresAt]
    );

    const appOrigin = process.env.USER_PORTAL_URL || process.env.APP_URL || 'https://xarwiz.com';
    const resetUrl = `${appOrigin.replace(/\/$/, '')}/reset-password?token=${resetToken}`;
    sendPasswordReset(email, resetUrl).catch((err) => logger.error('Failed to send password reset email:', err));

    res.json({ message: 'If that email exists, a password reset link has been sent.' });
  } catch (err: any) {
    logger.error('Forgot password error:', err);
    res.status(500).json({ error: 'Password reset request failed' });
  }
}

router.post('/forgot-password', validate(forgotPasswordSchema), handleForgotPassword);
router.post('/v1/forgot-password', validate(forgotPasswordSchema), handleForgotPassword);

// POST /reset-password
async function handleResetPassword(req: any, res: any) {
  const { token, newPassword } = req.body;
  const client = await pool.connect();
  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const passwordHash = await bcrypt.hash(newPassword, 12);

    await client.query('BEGIN');

    // Path 1: Check if dedicated secure database function exists (SECURITY DEFINER, RLS-safe)
    let functionAttempted = false;
    try {
      const fnRes = await client.query(
        'SELECT * FROM public.consume_password_reset_token($1, $2)',
        [tokenHash, passwordHash]
      );
      if (fnRes.rows.length > 0) {
        functionAttempted = true;
        const row = fnRes.rows[0];
        const isSuccess = row.success ?? row.out_success;
        if (!isSuccess) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Invalid, expired, or already used password reset token' });
        }
        await client.query('COMMIT');
        return res.json({ message: 'Password has been reset successfully. Please log in with your new password.' });
      }
    } catch (fnErr: any) {
      if (!fnErr.message?.includes('does not exist')) {
        throw fnErr;
      }
      // Function does not exist yet; restart transaction for direct atomic fallback
      await client.query('ROLLBACK');
      await client.query('BEGIN');
    }

    // Path 2: Direct atomic transaction (fallback path before function migration)
    const tokenUpdate = await client.query(
      `UPDATE password_reset_tokens
       SET used_at = NOW()
       WHERE token_hash = $1 
         AND used_at IS NULL 
         AND expires_at > NOW()
       RETURNING id, user_id, tenant_id`,
      [tokenHash]
    );

    if (tokenUpdate.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid, expired, or already used password reset token' });
    }

    const { user_id, tenant_id } = tokenUpdate.rows[0];

    const userUpdate = await client.query(
      `UPDATE users 
       SET password_hash = $1, force_password_change = FALSE, updated_at = NOW() 
       WHERE id = $2 AND tenant_id = $3 AND deleted_at IS NULL
       RETURNING id`,
      [passwordHash, user_id, tenant_id]
    );

    if (userUpdate.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'User associated with token not found or deactivated' });
    }

    // Invalidate all active refresh token sessions for this user
    await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [user_id]);

    await client.query('COMMIT');

    res.json({ message: 'Password has been reset successfully. Please log in with your new password.' });
  } catch (err: any) {
    try {
      await client.query('ROLLBACK');
    } catch {}
    logger.error('Reset password error:', err);
    res.status(500).json({ error: 'Password reset failed' });
  } finally {
    client.release();
  }
}

router.post('/reset-password', validate(resetPasswordSchema), handleResetPassword);
router.post('/v1/reset-password', validate(resetPasswordSchema), handleResetPassword);

// GET /verify-email
router.get('/verify-email', async (req, res) => {
  const { token } = req.query;
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Verification token is required' });
  }

  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const userRes = await pool.query(
      'SELECT * FROM users WHERE verification_token = $1 AND deleted_at IS NULL',
      [tokenHash]
    );

    if (userRes.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    const user = userRes.rows[0];
    await pool.query('UPDATE users SET email_verified = true, verification_token = NULL WHERE id = $1', [
      user.id,
    ]);

    sendWelcomeEmail(user.email, user.name).catch((err) => logger.error('Failed to send welcome email:', err));

    res.json({ message: 'Email verified successfully. You can now log in.' });
  } catch (err: any) {
    logger.error('Email verification error:', err);
    res.status(500).json({ error: 'Email verification failed' });
  }
});

import { generatePasskeyAuthOptions } from '../services/webauthnService.js';

// LOW-017: OAuth Google Login Redirect
router.get('/google', (req, res) => {
  const redirectUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID || 'mock_google_id'}&redirect_uri=https://xarwiz.com/login?sso=google&response_type=code&scope=email%20profile`;
  res.redirect(redirectUrl);
});

// LOW-017: OAuth Microsoft Login Redirect
router.get('/microsoft', (req, res) => {
  const redirectUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${process.env.MICROSOFT_CLIENT_ID || 'mock_ms_id'}&redirect_uri=https://xarwiz.com/login?sso=microsoft&response_type=code&scope=openid%20email%20profile`;
  res.redirect(redirectUrl);
});

// LOW-024: WebAuthn Passkey Login Options
router.post('/passkeys/generate-options', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required for passkey login' });

  try {
    const options = await generatePasskeyAuthOptions(email);
    res.json(options);
  } catch (err: any) {
    logger.error('Passkey auth options error:', err);
    res.status(400).json({ error: err.message || 'Failed to generate passkey authentication options' });
  }
});

// GET /me and GET /v1/me for AuthContext session verification
async function handleMe(req: any, res: any) {
  try {
    const authHeader = req.headers.authorization || '';
    const cookieToken = req.cookies?.hk_access_token;
    let token = '';

    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (cookieToken) {
      token = cookieToken;
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded: any = jwt.verify(token, getJwtSecret());
    const userRes = await pool.query(
      'SELECT id, email, name, role, tenant_id, email_verified, COALESCE(status, \'active\') as status, created_at FROM users WHERE id = $1 AND deleted_at IS NULL',
      [decoded.userId]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'User account not found' });
    }

    const user = userRes.rows[0];
    if (user.status === 'pending' || user.status === 'pending_approval') {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_PENDING_APPROVAL',
        error: 'Your account is awaiting administrator approval.',
        message: 'Your account is awaiting administrator approval.',
        pendingApproval: true,
        status: 'pending',
      });
    }
    const tenantRes = await pool.query('SELECT slug FROM tenants WHERE id = $1', [user.tenant_id]);
    const tenantSlug = tenantRes.rows[0]?.slug || req.tenant?.slug || 'default';

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenant_id,
      tenantSlug,
      emailVerified: user.email_verified !== false,
      createdAt: user.created_at,
    });
  } catch (err: any) {
    logger.error('Session verification (/me) error:', err);
    res.status(401).json({ error: 'Invalid or expired session token' });
  }
}

router.get('/me', handleMe);
router.get('/v1/me', handleMe);

export default router;
