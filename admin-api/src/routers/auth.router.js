import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool from '../db.js';
import redis from '../redis.js';
import logger from '../utils/logger.js';
import { adminAuth } from '../middleware/adminAuth.js';
import { validate } from '../middleware/validation.middleware.js';
import { loginSchema } from '../validators/admin.schema.js';

const router = express.Router();
const getJwtSecret = () => process.env.JWT_SECRET;

// POST /admin/login
router.post('/admin/login', validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // Rate limit admin login attempts per-IP: 5 attempts / 10 minutes
  try {
    const rawIp = (req.headers['x-real-ip'] || req.socket.remoteAddress || '').toString();
    const ip = rawIp.split(',')[0].trim().replace(/^::ffff:/, '') || 'unknown';
    const rateLimitKey = `ratelimit:admin-login:${ip}`;
    const attempts = await redis.incr(rateLimitKey);
    if (attempts === 1) {
      await redis.expire(rateLimitKey, 600); // 10 minutes
    }
    if (attempts > 5) {
      const ttl = await redis.ttl(rateLimitKey);
      res.setHeader('Retry-After', Math.max(ttl, 1));
      return res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
    }
  } catch (rlErr) {
    logger.error('Admin login rate limiter unavailable, rejecting request:', rlErr.message);
    return res.status(503).json({ error: 'Rate limiting service unavailable. Please try again shortly.' });
  }

  try {
    const rawIp = (req.headers['x-real-ip'] || req.socket.remoteAddress || '').toString();
    const ip = rawIp.split(',')[0].trim().replace(/^::ffff:/, '') || 'unknown';

    let userResult = await pool.query(
      "SELECT * FROM users WHERE email = $1 AND role IN ('admin', 'superadmin', 'founder') ORDER BY created_at ASC LIMIT 1",
      [email]
    );
    let user = userResult.rows[0];

    if (!user) {
      userResult = await pool.query(
        'SELECT * FROM users WHERE email = $1 ORDER BY created_at ASC LIMIT 1',
        [email]
      );
      user = userResult.rows[0];
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.role !== 'admin' && user.role !== 'superadmin' && user.role !== 'founder') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (user.status === 'suspended' || user.status === 'inactive') {
      return res.status(403).json({ error: 'Administrator account suspended or inactive' });
    }

    // Account lockout protection
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const remainingMs = new Date(user.locked_until).getTime() - Date.now();
      const remainingMins = Math.max(1, Math.ceil(remainingMs / 60000));
      return res.status(423).json({
        error: `Account is temporarily locked due to multiple failed login attempts. Please try again in ${remainingMins} minute(s).`,
        code: 'ACCOUNT_LOCKED',
        retryAfterMinutes: remainingMins,
      });
    }

    if (user.force_password_change) {
      return res.status(403).json({
        error: 'Password change required before access.',
        requirePasswordChange: true,
        code: 'FORCE_PASSWORD_CHANGE_REQUIRED',
      });
    }

    const matches = await bcrypt.compare(password, user.password_hash);
    if (!matches) {
      const attempts = (user.failed_login_attempts || 0) + 1;
      const isLocked = attempts >= 5;
      const lockedUntil = isLocked ? new Date(Date.now() + 30 * 60 * 1000) : null;

      await pool.query(
        `UPDATE users 
         SET failed_login_attempts = $1, 
             locked_until = $2, 
             updated_at = NOW() 
         WHERE id = $3`,
        [attempts, lockedUntil, user.id]
      );

      await pool.query(
        `INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details, created_at)
         VALUES ($1, $2, 'user', $3, $4, NOW())`,
        [user.id, isLocked ? 'ADMIN_ACCOUNT_LOCKED' : 'ADMIN_LOGIN_FAILED', user.id, JSON.stringify({ ip, attempts })]
      ).catch(() => {});

      if (isLocked) {
        return res.status(423).json({
          error: 'Account locked for 30 minutes due to 5 consecutive failed login attempts.',
          code: 'ACCOUNT_LOCKED',
          retryAfterMinutes: 30,
        });
      }

      const remaining = 5 - attempts;
      return res.status(401).json({
        error: `Invalid credentials. ${remaining} attempt(s) remaining before account lockout.`,
        remainingAttempts: remaining,
      });
    }

    // Reset failed login attempts on success
    if (user.failed_login_attempts > 0 || user.locked_until) {
      await pool.query(
        `UPDATE users 
         SET failed_login_attempts = 0, 
             locked_until = NULL, 
             updated_at = NOW() 
         WHERE id = $1`,
        [user.id]
      );
    }

    const jwtSecret = getJwtSecret();
    const accessJti = crypto.randomUUID();
    const refreshJti = crypto.randomUUID();

    const accessToken = jwt.sign(
      { userId: user.id, role: user.role, type: 'access', jti: accessJti },
      jwtSecret,
      {
        algorithm: 'HS256',
        issuer: 'xarwiz-admin',
        audience: 'xarwiz-admin-panel',
        expiresIn: '8h',
      }
    );
    const refreshToken = jwt.sign(
      { userId: user.id, role: user.role, type: 'refresh', jti: refreshJti },
      jwtSecret,
      {
        algorithm: 'HS256',
        issuer: 'xarwiz-admin',
        audience: 'xarwiz-admin-panel',
        expiresIn: '30d',
      }
    );

    // Store refresh token hash for session management
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at, revoked, tenant_id, created_at)
       VALUES ($1, $2, NOW() + INTERVAL '30 days', FALSE, $3, NOW())`,
      [user.id, tokenHash, user.tenant_id]
    ).catch(() => {});

    await pool.query(
      `INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details, created_at)
       VALUES ($1, 'ADMIN_LOGIN_SUCCESS', 'user', $2, $3, NOW())`,
      [user.id, user.id, JSON.stringify({ ip, role: user.role })]
    ).catch(() => {});

    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
    const cookieDomain = process.env.COOKIE_DOMAIN || undefined;

    res.cookie('admin_access_token', accessToken, {
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      domain: cookieDomain,
      maxAge: 8 * 60 * 60 * 1000, // 8h
    });

    res.cookie('admin_refresh_token', refreshToken, {
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      domain: cookieDomain,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30d
    });

    // Compatibility cookie
    res.cookie('admin_token', accessToken, {
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      domain: cookieDomain,
      maxAge: 8 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    logger.error('Login endpoint error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message || 'Login processing error' });
  }
});

// POST /admin/auth/login alias
router.post('/admin/auth/login', (req, res, next) => {
  req.url = '/admin/login';
  router.handle(req, res, next);
});

// POST /admin/auth/refresh - Rotate Admin Session Tokens
router.post(['/admin/auth/refresh', '/admin/refresh'], async (req, res) => {
  try {
    const parseCookie = (cookieHeader, key) => {
      if (!cookieHeader) return null;
      const match = cookieHeader.match(new RegExp('(?:^|;\\s*)' + key + '=([^;]+)'));
      return match ? match[1] : null;
    };

    const refreshToken = req.headers.cookie ? parseCookie(req.headers.cookie, 'admin_refresh_token') : null;
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token missing' });
    }

    const jwtSecret = getJwtSecret();
    const decoded = jwt.verify(refreshToken, jwtSecret, { algorithms: ['HS256'] });
    if (!decoded || !decoded.userId || decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Verify refresh token in database for session tracking and revocation
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const tokenRes = await pool.query(
      'SELECT id, revoked, expires_at FROM refresh_tokens WHERE user_id = $1 AND token = $2 LIMIT 1',
      [decoded.userId, tokenHash]
    );

    if (tokenRes.rows.length > 0 && tokenRes.rows[0].revoked) {
      return res.status(401).json({ error: 'Refresh token has been revoked' });
    }

    // Revoke old refresh token on rotation
    if (tokenRes.rows.length > 0) {
      await pool.query('UPDATE refresh_tokens SET revoked = TRUE WHERE id = $1', [tokenRes.rows[0].id]).catch(() => {});
    }

    const userCheck = await pool.query(
      "SELECT id, role, status, tenant_id FROM users WHERE id = $1 AND deleted_at IS NULL",
      [decoded.userId]
    );
    if (userCheck.rows.length === 0) {
      return res.status(401).json({ error: 'User no longer exists' });
    }
    const currentUser = userCheck.rows[0];
    if (currentUser.status === 'suspended' || currentUser.status === 'inactive') {
      return res.status(403).json({ error: 'Account suspended or inactive' });
    }
    if (!['superadmin', 'admin', 'founder'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'Insufficient privileges' });
    }

    const accessJti = crypto.randomUUID();
    const refreshJti = crypto.randomUUID();

    const newAccessToken = jwt.sign(
      { userId: decoded.userId, role: currentUser.role, type: 'access', jti: accessJti },
      jwtSecret,
      {
        algorithm: 'HS256',
        issuer: 'xarwiz-admin',
        audience: 'xarwiz-admin-panel',
        expiresIn: '8h',
      }
    );
    const newRefreshToken = jwt.sign(
      { userId: decoded.userId, role: currentUser.role, type: 'refresh', jti: refreshJti },
      jwtSecret,
      {
        algorithm: 'HS256',
        issuer: 'xarwiz-admin',
        audience: 'xarwiz-admin-panel',
        expiresIn: '30d',
      }
    );

    // Record new refresh token in database
    const newTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at, revoked, tenant_id, created_at)
       VALUES ($1, $2, NOW() + INTERVAL '30 days', FALSE, $3, NOW())`,
      [decoded.userId, newTokenHash, currentUser.tenant_id]
    ).catch(() => {});

    const isProd = process.env.NODE_ENV === 'production';
    const cookieDomain = isProd ? '.xarwiz.com' : undefined;

    res.cookie('admin_access_token', newAccessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      domain: cookieDomain,
      maxAge: 8 * 60 * 60 * 1000,
    });

    res.cookie('admin_refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      domain: cookieDomain,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.cookie('admin_token', newAccessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      domain: cookieDomain,
      maxAge: 8 * 60 * 60 * 1000,
    });

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(401).json({ error: 'Session expired or invalid refresh token' });
  }
});

// GET /admin/first-login/verify - Verify 1-hour setup token
router.get(['/admin/first-login/verify', '/v1/admin/auth/verify-first-login'], async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ error: 'Setup token is required' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const result = await pool.query(
      `SELECT prt.*, u.email
       FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
       WHERE prt.token_hash = $1 AND prt.used_at IS NULL AND prt.expires_at > NOW()`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid, expired, or already used setup token' });
    }

    res.status(200).json({ valid: true, email: result.rows[0].email });
  } catch (err) {
    logger.error('First login token verify error:', err);
    res.status(500).json({ error: 'Token verification failed' });
  }
});

// POST /admin/first-login/reset - Process first-login password reset
router.post(['/admin/first-login/reset', '/v1/admin/auth/first-login-reset'], async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword || newPassword.length < 12) {
      return res.status(400).json({ error: 'Token and strong password (min 12 chars) are required' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const tokenRes = await pool.query(
      `SELECT prt.*, u.role, u.email
       FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
       WHERE prt.token_hash = $1 AND prt.used_at IS NULL AND prt.expires_at > NOW()`,
      [tokenHash]
    );

    if (tokenRes.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid, expired, or already used setup token' });
    }

    const tokenRecord = tokenRes.rows[0];
    const passwordHash = await bcrypt.hash(newPassword, 12);

    await pool.query(
      'UPDATE users SET password_hash = $1, force_password_change = FALSE, must_change_password = FALSE WHERE id = $2',
      [passwordHash, tokenRecord.user_id]
    );

    await pool.query(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1',
      [tokenRecord.id]
    );

    const isProd = process.env.NODE_ENV === 'production';
    const cookieDomain = isProd ? '.xarwiz.com' : undefined;
    const jwtSecret = getJwtSecret();

    const accessToken = jwt.sign({ userId: tokenRecord.user_id, role: tokenRecord.role, type: 'access' }, jwtSecret, {
      expiresIn: '7d',
    });
    const refreshToken = jwt.sign({ userId: tokenRecord.user_id, role: tokenRecord.role, type: 'refresh' }, jwtSecret, {
      expiresIn: '30d',
    });

    res.cookie('admin_access_token', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      domain: cookieDomain,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.cookie('admin_refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      domain: cookieDomain,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.cookie('admin_token', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      domain: cookieDomain,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: 'Password established successfully. Logged in.',
      user: { id: tokenRecord.user_id, email: tokenRecord.email, role: tokenRecord.role },
    });
  } catch (err) {
    logger.error('First login reset error:', err);
    res.status(500).json({ error: 'Password setup failed' });
  }
});

// GET /admin/auth/me - Validate Admin Session
router.get(['/admin/auth/me', '/admin/me'], adminAuth, (req, res) => {
  res.status(200).json({
    user: {
      id: req.admin.id,
      email: req.admin.email,
      role: req.admin.role,
      isAdmin: true,
    },
  });
});

// POST /admin/logout & POST /admin/auth/logout - Revoke active admin session
router.post(['/admin/logout', '/admin/auth/logout'], async (req, res) => {
  const jwtSecret = getJwtSecret();
  try {
    const parseCookie = (cookieHeader, key) => {
      if (!cookieHeader) return null;
      const match = cookieHeader.match(new RegExp('(?:^|;\\s*)' + key + '=([^;]+)'));
      return match ? match[1] : null;
    };
    const token =
      (req.headers.cookie ? parseCookie(req.headers.cookie, 'admin_access_token') : null) ||
      (req.headers.cookie ? parseCookie(req.headers.cookie, 'admin_token') : null) ||
      (req.headers.authorization && req.headers.authorization.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);

    if (token && jwtSecret) {
      try {
        const decoded = jwt.verify(token, jwtSecret);
        if (decoded?.jti) {
          await redis.set(`revoked:session:${decoded.jti}`, '1', 'EX', 86400).catch(() => {});
        }
        if (decoded?.userId) {
          await pool.query('UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1', [decoded.userId]).catch(() => {});
          await pool.query(
            `INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details, created_at)
             VALUES ($1, 'ADMIN_LOGOUT', 'user', $2, '{}'::jsonb, NOW())`,
            [decoded.userId, decoded.userId]
          ).catch(() => {});
        }
      } catch (_) {}
    }
  } catch (err) {
    logger.warn('Logout cleanup error:', err.message);
  }

  const isProd = process.env.NODE_ENV === 'production';
  const cookieDomain = isProd ? '.xarwiz.com' : undefined;

  res.clearCookie('admin_access_token', { domain: cookieDomain });
  res.clearCookie('admin_refresh_token', { domain: cookieDomain });
  res.clearCookie('admin_token', { domain: cookieDomain });
  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

export default router;

