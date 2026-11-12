import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool from '../db.js';
import redis from '../redis.js';
import logger from '../utils/logger.js';
import { adminAuth } from '../middleware/adminAuth.js';
import { validate } from '../middleware/validation.middleware.js';
import { userStatusSchema } from '../validators/admin.schema.js';
import { validatePasswordPolicy, generateCryptographicPassword } from '../validators/passwordPolicy.js';
import { logAdminAction } from '../utils/auditLogger.js';
import { sanitizeCsvCell } from '../utils/csv.js';
import {
  sendTwoFactorResetAlert,
  sendAccountApprovalEmail,
  sendPasswordReset,
  resetEmailRateLimit,
  sendImpersonationAlert,
} from '../services/email.js';

const router = express.Router();
const getJwtSecret = () => process.env.JWT_SECRET;

// Helper: Invalidate user sessions (refresh tokens + Redis caches)
async function invalidateUserSessions(userId) {
  try {
    await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
  } catch (tokenErr) {
    logger.warn('Failed to delete refresh tokens on user session invalidation:', tokenErr.message);
  }

  try {
    await redis.del(`user:${userId}:sessions`).catch(() => {});
    await redis.del(`user_session:${userId}`).catch(() => {});
    await redis.del(`user:${userId}`).catch(() => {});
  } catch (rErr) {
    logger.warn('Failed to clear user Redis sessions:', rErr.message);
  }
}

// Helper: Check admin credential operation rate limit (max 20 per 5 min)
async function checkAdminCredentialRateLimit(adminId) {
  try {
    const key = `rate_limit:admin_cred_manage:${adminId}`;
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, 300);
    }
    return count <= 20;
  } catch (err) {
    logger.warn('Redis rate limit check error for admin credential management:', err.message);
    return true;
  }
}

// Helper: Verify authorization & Superadmin protection hierarchy
async function verifyAdminCredentialPermission(req, res, targetUserId) {
  const caller = req.admin;
  if (!caller || !['superadmin', 'founder', 'admin'].includes(caller.role)) {
    res.status(403).json({ error: 'Access Denied: Administrative privileges required' });
    return null;
  }

  if (caller.id === targetUserId) {
    res.status(400).json({ error: 'You cannot manage credentials for your own account via Admin management. Use User Profile settings.' });
    return null;
  }

  const allowed = await checkAdminCredentialRateLimit(caller.id);
  if (!allowed) {
    res.status(429).json({ error: 'Rate limit exceeded: Too many password management operations. Please wait a few minutes before trying again.' });
    return null;
  }

  const userRes = await pool.query(
    'SELECT id, email, name, role, tenant_id, force_password_change, must_change_password FROM users WHERE id = $1 AND deleted_at IS NULL',
    [targetUserId]
  );

  if (userRes.rows.length === 0) {
    res.status(404).json({ error: 'User not found or has been deleted' });
    return null;
  }

  const targetUser = userRes.rows[0];
  const isSuperadminTarget = ['superadmin', 'founder'].includes(targetUser.role);
  const isCallerSuperadmin = ['superadmin', 'founder'].includes(caller.role);

  if (isSuperadminTarget && !isCallerSuperadmin) {
    res.status(403).json({ error: 'Access Denied: Ordinary administrators cannot manage Superadmin credentials.' });
    return null;
  }

  if (!isCallerSuperadmin && caller.tenant_id && targetUser.tenant_id && caller.tenant_id !== targetUser.tenant_id) {
    res.status(403).json({ error: 'Access Denied: Cross-tenant credential management is prohibited.' });
    return null;
  }

  return targetUser;
}

// GET /admin/users & /v1/admin/users
router.get(['/admin/users', '/v1/admin/users'], adminAuth, async (req, res) => {
  try {
    const hasPagination = req.query.page !== undefined || req.query.limit !== undefined || req.query.offset !== undefined;
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const offset = req.query.offset !== undefined ? Math.max(0, parseInt(req.query.offset)) : (page - 1) * limit;

    let query = `
      SELECT
        u.id,
        u.email,
        u.role,
        COALESCE(u.status, 'active') as status,
        u.created_at,
        u.name,
        u.username,
        u.phone,
        u.company,
        u.job_title,
        u.department,
        u.country,
        u.bio,
        u.billing_info,
        u.settings,
        COALESCE(u.settings->>'source', 'request_access') as source,
        t.name as tenant_name,
        (SELECT COUNT(*) FROM conversations c WHERE c.user_id = u.id) as conversations_count,
        (SELECT COUNT(*) FROM messages m JOIN conversations c ON m.conversation_id = c.id WHERE c.user_id = u.id) as messages_count,
        (SELECT COALESCE(SUM(m.tokens_used), 0) FROM messages m JOIN conversations c ON m.conversation_id = c.id WHERE c.user_id = u.id) as total_tokens
      FROM users u
      LEFT JOIN tenants t ON u.tenant_id = t.id
      ORDER BY u.created_at DESC
    `;

    const countRes = await pool.query('SELECT COUNT(*)::int as total FROM users');
    const total = countRes.rows[0]?.total || 0;

    let result;
    if (hasPagination) {
      query += ` LIMIT $1 OFFSET $2`;
      result = await pool.query(query, [limit, offset]);
    } else {
      result = await pool.query(query);
    }

    const totalPages = Math.ceil(total / limit) || 1;
    const hasMore = (page * limit) < total;

    res.status(200).json({
      users: result.rows,
      total,
      page: hasPagination ? page : 1,
      limit: hasPagination ? limit : result.rows.length,
      totalPages: hasPagination ? totalPages : 1,
      hasMore: hasPagination ? hasMore : false,
    });
  } catch (err) {
    logger.error('Failed to get users:', err);
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
});

// PUT /admin/users/:userId/status
router.put(['/admin/users/:userId/status', '/v1/admin/users/:userId/status'], adminAuth, validate(userStatusSchema), async (req, res) => {
  const { userId } = req.params;
  const { status } = req.body;

  if (!['active', 'pending', 'suspended'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status value. Must be active, pending, or suspended.' });
  }

  try {
    const prevRes = await pool.query('SELECT id, email, name, COALESCE(status, \'active\') as status, tenant_id FROM users WHERE id = $1', [userId]);
    if (prevRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const previousStatus = prevRes.rows[0].status;

    const updateRes = await pool.query(
      `UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, status, name, tenant_id`,
      [status, userId]
    );

    const updatedUser = updateRes.rows[0];
    logger.info(`Admin updated user status for ${updatedUser.email} from '${previousStatus}' to '${status}'`);

    if (status === 'active' && previousStatus === 'pending') {
      sendAccountApprovalEmail(updatedUser.email, updatedUser.name).catch((emailErr) => {
        logger.error(`[APPROVAL EMAIL FAILED]: ${emailErr?.message || emailErr}`);
      });
    }

    await pool.query(
      `INSERT INTO activity_logs (user_id, tenant_id, action, details, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [userId, updatedUser.tenant_id, status === 'active' ? 'user_access_approved' : 'user_status_updated', JSON.stringify({ previousStatus, newStatus: status })]
    ).catch(err => logger.warn('Audit log write failed:', err.message));

    res.status(200).json({
      success: true,
      message: status === 'active' ? `User access allowed and approved successfully` : `User status updated to ${status} successfully`,
      user: updatedUser
    });
  } catch (err) {
    logger.error('Failed to update user status:', err);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// POST /admin/users/:id/unlock
router.post(['/admin/users/:id/unlock', '/v1/admin/users/:id/unlock'], adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE users
       SET failed_login_attempts = 0,
           locked_until = NULL,
           lockout_count = 0,
           unlock_token = NULL
       WHERE id = $1
       RETURNING id, email`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await pool.query(
      `INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details, created_at)
       VALUES ($1, 'ADMIN_USER_UNLOCKED', 'user', $2, $3, NOW())`,
      [req.admin?.id, id, JSON.stringify({ targetEmail: result.rows[0].email, unlockedBy: req.admin?.email })]
    ).catch(() => {});

    res.status(200).json({
      success: true,
      message: `Account lockout cleared for ${result.rows[0].email}.`,
    });
  } catch (err) {
    logger.error('Admin user unlock error:', err);
    res.status(500).json({ error: 'Failed to unlock user account' });
  }
});

// POST /admin/users/:id/reset-2fa
router.post('/admin/users/:id/reset-2fa', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userRes = await pool.query('SELECT id, email FROM users WHERE id = $1', [id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userRes.rows[0];

    await pool.query(
      `UPDATE users
       SET two_factor_enabled = false,
           two_factor_secret = NULL,
           two_factor_backup_codes = '[]'::jsonb,
           failed_2fa_attempts = 0,
           locked_until = NULL
       WHERE id = $1`,
      [id]
    );

    await sendTwoFactorResetAlert(user.email, {
      adminName: req.admin?.email || 'Administrator',
      timestamp: new Date().toUTCString(),
      ip: req.ip || req.headers['x-forwarded-for'] || 'Admin Console',
    }).catch(err => logger.warn('Failed to send 2FA reset alert email:', err.message));

    res.status(200).json({
      success: true,
      message: '2FA settings reset successfully for user',
      userId: id,
      email: user.email,
    });
  } catch (err) {
    logger.error('Reset 2FA error:', err);
    res.status(500).json({ error: 'Failed to reset user 2FA', message: err.message });
  }
});

// POST /admin/users/:id/force-password-reset
router.post(['/admin/users/:id/force-password-reset', '/v1/admin/users/:id/force-password-reset'], adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userRes = await pool.query(
      `SELECT u.id, u.email, u.name, t.slug as tenant_slug, t.name as tenant_name
       FROM users u
       JOIN tenants t ON u.tenant_id = t.id
       WHERE u.id = $1`,
      [id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userRes.rows[0];
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO password_reset_tokens (tenant_id, user_id, token_hash, expires_at)
       VALUES ((SELECT tenant_id FROM users WHERE id = $1), $1, $2, $3)`,
      [id, tokenHash, expiresAt]
    );

    const resetLink = `https://xarwiz.com/reset-password?token=${rawToken}&email=${encodeURIComponent(user.email)}`;
    logger.info(`🚨 [ADMIN FORCE RESET] Admin ${req.admin?.email} initiated password reset for user ${user.email}`);

    let emailSent = false;
    let emailError = null;

    try {
      await resetEmailRateLimit(user.email);
      const emailResult = await sendPasswordReset(user.email, resetLink, { bypassRateLimit: true });
      if (emailResult && emailResult.success) {
        emailSent = true;
      } else {
        emailError = emailResult?.error || 'Email dispatch failed';
      }
    } catch (emailErr) {
      emailError = emailErr.message || 'Email delivery failed';
    }

    res.status(200).json({
      success: true,
      message: emailSent
        ? 'Password reset link generated and dispatched to user email.'
        : `Password reset link generated successfully. (Email notification skipped: ${emailError})`,
      userId: id,
      email: user.email,
      resetLink,
      emailSent,
      emailError,
    });
  } catch (err) {
    logger.error('Force password reset error:', err);
    res.status(500).json({ error: 'Failed to initiate password reset' });
  }
});

// POST /admin/users/:userId/impersonate
router.post('/admin/users/:userId/impersonate', adminAuth, async (req, res) => {
  if (req.admin.role !== 'superadmin') {
    return res.status(403).json({ error: 'Access Denied: Only superadmins can impersonate users' });
  }

  const { userId } = req.params;

  try {
    const rateLimitKey = `ratelimit:impersonate:${req.admin.id}`;
    let count = 0;
    try {
      count = await redis.incr(rateLimitKey);
      if (count === 1) {
        await redis.expire(rateLimitKey, 3600);
      }
    } catch (rlErr) {
      logger.warn('Redis rate limit for impersonation failed, bypassing:', rlErr.message);
    }
    if (count > 3) {
      return res.status(429).json({ error: 'Rate limit exceeded: Max 3 impersonations per hour.' });
    }

    const userRes = await pool.query(
      'SELECT id, email, role, tenant_id FROM users WHERE id = $1 AND deleted_at IS NULL',
      [userId]
    );
    const user = userRes.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const tenantRes = await pool.query('SELECT slug FROM tenants WHERE id = $1', [user.tenant_id]);
    const tenantSlug = tenantRes.rows[0]?.slug || 'system';

    const impersonationToken = crypto.randomBytes(32).toString('hex');
    const timestamp = new Date().toISOString();
    const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim() || '127.0.0.1';
    const adminName = req.admin.name || req.admin.email?.split('@')[0] || 'Administrator';

    const payload = {
      userId: user.id,
      adminId: req.admin.id,
      adminEmail: req.admin.email,
      adminName,
      tenantSlug,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString()
    };

    await redis.set(`impersonate:${impersonationToken}`, JSON.stringify(payload), 'EX', 300);

    const ua = req.headers['user-agent'] || 'Unknown Browser';
    await pool.query(
      `INSERT INTO activity_logs (user_id, tenant_id, action, details, ip_address, user_agent, impersonated_by, is_impersonation)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
      [
        user.id,
        user.tenant_id,
        'Admin Impersonation Triggered',
        JSON.stringify({
          level: 'warning',
          color: '#ea580c',
          adminId: req.admin.id,
          adminEmail: req.admin.email,
          targetUserId: user.id,
          targetEmail: user.email,
          timestamp
        }),
        ip,
        ua,
        req.admin.id
      ]
    );

    logger.info(`🎭 [IMPERSONATION STARTED] Admin ${req.admin.email} (ID: ${req.admin.id}) started impersonating user ${user.email} (ID: ${user.id}) at ${timestamp}`);

    try {
      await sendImpersonationAlert(user.email, {
        adminName,
        timestamp,
        ip
      });
    } catch (emailErr) {
      logger.warn('Failed to send impersonation email alert:', emailErr.message);
    }

    res.json({
      success: true,
      token: impersonationToken,
      redirectUrl: `/impersonate?token=${impersonationToken}`,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantSlug,
      }
    });
  } catch (err) {
    logger.error('Impersonation error:', err);
    res.status(500).json({ error: 'Failed to process impersonation request' });
  }
});

// POST /auth/impersonate/confirm
router.post(['/auth/impersonate/confirm', '/api/auth/impersonate/confirm', '/admin/impersonate/confirm'], adminAuth, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Missing impersonation token' });
    }

    const dataStr = await redis.get(`impersonate:${token}`);
    if (!dataStr) {
      return res.status(401).json({ error: 'Invalid or expired impersonation token' });
    }

    await redis.del(`impersonate:${token}`);
    const data = JSON.parse(dataStr);

    const userRes = await pool.query(
      'SELECT id, email, role, tenant_id FROM users WHERE id = $1 AND deleted_at IS NULL',
      [data.userId]
    );
    const user = userRes.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'Impersonated user not found' });
    }

    const tenantRes = await pool.query('SELECT slug FROM tenants WHERE id = $1', [user.tenant_id]);
    const tenantSlug = tenantRes.rows[0]?.slug || data.tenantSlug || 'system';

    const jwtSecret = getJwtSecret();
    const impersonationJwt = jwt.sign(
      { userId: user.id, role: user.role, adminId: data.adminId, type: 'impersonation' },
      jwtSecret,
      {
        algorithm: 'HS256',
        issuer: 'xarwiz-admin',
        expiresIn: '5m',
      }
    );

    const host = req.headers.host || '';
    const domainSuffix = host.includes('xarwiz.com') ? '; Domain=.xarwiz.com' : '';
    const isHttps = req.headers['x-forwarded-proto'] === 'https' || req.socket?.encrypted;
    const secureFlag = isHttps ? 'Secure;' : '';

    await pool.query(
      `INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details, created_at)
       VALUES ($1, 'ADMIN_IMPERSONATION_CONFIRMED', 'user', $2, $3, NOW())`,
      [data.adminId, user.id, JSON.stringify({ targetEmail: user.email, adminEmail: data.adminEmail })]
    ).catch(() => {});

    res.setHeader('Set-Cookie', [
      `hk_access_token=${impersonationJwt}; HttpOnly; ${secureFlag} SameSite=Strict; Path=/; Max-Age=${5 * 60}${domainSuffix}`,
    ]);

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantSlug,
      },
      impersonatingAdminEmail: data.adminEmail,
    });
  } catch (err) {
    logger.error('Confirm impersonation error:', err);
    res.status(500).json({ error: 'Failed to confirm impersonation session' });
  }
});

// GET /admin/impersonation/audit-logs
router.get('/admin/impersonation/audit-logs', adminAuth, async (req, res) => {
  try {
    const { impersonatedOnly, limit = 100 } = req.query;
    const isImpersonatedFilter = impersonatedOnly === 'true';

    const result = await pool.query(
      `SELECT
         a.id,
         a.created_at,
         a.action,
         a.details,
         a.ip_address,
         a.user_agent,
         a.is_impersonation,
         u.id as user_id,
         u.email as user_email,
         u.role as user_role,
         t.name as tenant_name,
         adm.id as impersonator_id,
         adm.email as impersonator_email,
         adm.name as impersonator_name
       FROM activity_logs a
       LEFT JOIN users u ON a.user_id = u.id
       LEFT JOIN tenants t ON a.tenant_id = t.id
       LEFT JOIN users adm ON a.impersonated_by = adm.id
       WHERE ($1::boolean = false OR a.is_impersonation = true)
       ORDER BY a.created_at DESC
       LIMIT $2`,
      [isImpersonatedFilter, parseInt(limit)]
    );

    res.json({
      success: true,
      count: result.rows.length,
      logs: result.rows,
    });
  } catch (err) {
    logger.error('Failed to fetch impersonation audit logs:', err);
    res.status(500).json({ error: 'Failed to retrieve impersonation audit logs' });
  }
});

// GET /admin/impersonation/audit-logs/export
router.get('/admin/impersonation/audit-logs/export', adminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.id, a.created_at, u.email as user_email, a.action, a.is_impersonation, adm.email as impersonator_email, a.ip_address
       FROM activity_logs a
       LEFT JOIN users u ON a.user_id = u.id
       LEFT JOIN users adm ON a.impersonated_by = adm.id
       ORDER BY a.created_at DESC
       LIMIT 1000`
    );

    let csv = 'Log ID,Timestamp,Target User,Action,Is Impersonation,Impersonated By,IP Address\n';
    result.rows.forEach((r) => {
      csv += `${sanitizeCsvCell(r.id)},${sanitizeCsvCell(r.created_at)},${sanitizeCsvCell(r.user_email)},${sanitizeCsvCell(r.action)},${r.is_impersonation},${sanitizeCsvCell(r.impersonator_email)},${sanitizeCsvCell(r.ip_address)}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=impersonation-audit-log.csv');
    res.status(200).send(csv);
  } catch (err) {
    logger.error('Failed to export impersonation logs:', err);
    res.status(500).json({ error: 'Failed to export logs' });
  }
});

// User password management endpoints
router.post(['/admin/users/:userId/password/reset', '/admin/users/:userId/password/set'], adminAuth, async (req, res) => {
  const userId = req.params.userId || req.params.id;
  const targetUser = await verifyAdminCredentialPermission(req, res, userId);
  if (!targetUser) return;

  const password = req.body.password || req.body.newPassword;
  const forceChangeOnNextLogin = req.body.forceChangeOnNextLogin ?? req.body.forcePasswordChange ?? true;
  const revokeSessions = req.body.revokeSessions ?? true;

  const validation = validatePasswordPolicy(password);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const callerEmail = req.admin?.email || req.admin?.id || 'admin';

    await pool.query(
      `UPDATE users
       SET password_hash = $1,
           force_password_change = $2,
           must_change_password = $2,
           password_changed_at = NOW(),
           password_reset_at = NOW(),
           password_reset_by = $3,
           failed_login_attempts = 0,
           locked_until = NULL,
           lockout_count = 0,
           unlock_token = NULL,
           updated_at = NOW()
       WHERE id = $4`,
      [passwordHash, !!forceChangeOnNextLogin, callerEmail, userId]
    );

    await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]).catch(() => {});

    if (revokeSessions) {
      await invalidateUserSessions(userId);
    }

    await logAdminAction(
      req.admin.id,
      'USER_PASSWORD_RESET_BY_ADMIN',
      'user',
      userId,
      null,
      { email: targetUser.email, adminEmail: callerEmail, forceChange: !!forceChangeOnNextLogin },
      req
    );

    res.status(200).json({
      success: true,
      message: `Password updated successfully for ${targetUser.email}.`,
      forceChangeOnNextLogin: !!forceChangeOnNextLogin,
      sessionsRevoked: !!revokeSessions,
    });
  } catch (err) {
    logger.error('Admin set password error:', err);
    res.status(500).json({ error: 'Failed to reset password', message: err.message });
  }
});

router.post(['/admin/users/:userId/password/generate', '/v1/admin/users/:userId/password/generate'], adminAuth, async (req, res) => {
  const userId = req.params.userId || req.params.id;
  const targetUser = await verifyAdminCredentialPermission(req, res, userId);
  if (!targetUser) return;

  const forceChangeOnNextLogin = req.body.forceChangeOnNextLogin ?? req.body.forcePasswordChange ?? true;
  const revokeSessions = req.body.revokeSessions ?? true;
  const tempPassword = generateCryptographicPassword();

  try {
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    const callerEmail = req.admin?.email || req.admin?.id || 'admin';

    await pool.query(
      `UPDATE users
       SET password_hash = $1,
           force_password_change = $2,
           must_change_password = $2,
           password_changed_at = NOW(),
           password_reset_at = NOW(),
           password_reset_by = $3,
           failed_login_attempts = 0,
           locked_until = NULL,
           lockout_count = 0,
           unlock_token = NULL,
           updated_at = NOW()
       WHERE id = $4`,
      [passwordHash, !!forceChangeOnNextLogin, callerEmail, userId]
    );

    await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]).catch(() => {});

    if (revokeSessions) {
      await invalidateUserSessions(userId);
    }

    await logAdminAction(
      req.admin.id,
      'USER_TEMP_PASSWORD_GENERATED',
      'user',
      userId,
      null,
      { email: targetUser.email, adminEmail: callerEmail },
      req
    );

    res.status(200).json({
      success: true,
      message: 'Temporary password generated successfully. It will only be shown once.',
      temporaryPassword: tempPassword,
      forceChangeOnNextLogin: !!forceChangeOnNextLogin,
      sessionsRevoked: !!revokeSessions,
    });
  } catch (err) {
    logger.error('Admin generate temporary password error:', err);
    res.status(500).json({ error: 'Failed to generate temporary password', message: err.message });
  }
});

router.post(['/admin/users/:userId/password/force-change', '/v1/admin/users/:userId/password/force-change'], adminAuth, async (req, res) => {
  const userId = req.params.userId || req.params.id;
  const targetUser = await verifyAdminCredentialPermission(req, res, userId);
  if (!targetUser) return;

  const forceChange = req.body.forceChange ?? true;

  try {
    await pool.query(
      `UPDATE users
       SET force_password_change = $1,
           must_change_password = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [!!forceChange, userId]
    );

    await logAdminAction(
      req.admin.id,
      forceChange ? 'USER_PASSWORD_FORCE_CHANGE_ENABLED' : 'USER_PASSWORD_FORCE_CHANGE_DISABLED',
      'user',
      userId,
      null,
      { email: targetUser.email, forceChange: !!forceChange },
      req
    );

    res.status(200).json({
      success: true,
      message: forceChange
        ? `Password change will be required for ${targetUser.email} on next login.`
        : `Password change requirement cleared for ${targetUser.email}.`,
      forcePasswordChange: !!forceChange,
      mustChangePassword: !!forceChange,
    });
  } catch (err) {
    logger.error('Admin force password change error:', err);
    res.status(500).json({ error: 'Failed to update password change requirement' });
  }
});

router.post(['/admin/users/:userId/sessions/sign-out', '/v1/admin/users/:userId/sessions/sign-out'], adminAuth, async (req, res) => {
  const userId = req.params.userId || req.params.id;
  const targetUser = await verifyAdminCredentialPermission(req, res, userId);
  if (!targetUser) return;

  try {
    await invalidateUserSessions(userId);
    await logAdminAction(
      req.admin.id,
      'USER_SESSIONS_INVALIDATED',
      'user',
      userId,
      null,
      { email: targetUser.email },
      req
    );

    res.status(200).json({
      success: true,
      message: `All active sessions for ${targetUser.email} have been terminated.`,
    });
  } catch (err) {
    logger.error('Admin sign out user sessions error:', err);
    res.status(500).json({ error: 'Failed to invalidate user sessions' });
  }
});

router.get(['/admin/users/:userId/security-activity', '/v1/admin/users/:userId/security-activity'], adminAuth, async (req, res) => {
  const userId = req.params.userId || req.params.id;

  try {
    const activityRes = await pool.query(
      `SELECT id, admin_id, action, target_type, target_id, ip_address, user_agent, created_at, new_value
       FROM admin_audit_log
       WHERE target_type = 'user' AND target_id = $1
       ORDER BY created_at DESC
       LIMIT 25`,
      [userId]
    );

    const safeActivities = activityRes.rows.map((row) => ({
      id: row.id,
      action: row.action,
      adminId: row.admin_id,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: row.created_at,
      details: row.new_value || null,
    }));

    res.status(200).json({
      success: true,
      activities: safeActivities,
    });
  } catch (err) {
    logger.error('Get user security activity error:', err);
    res.status(500).json({ error: 'Failed to fetch security activity' });
  }
});

router.delete('/admin/users/:userId', adminAuth, async (req, res) => {
  const { userId } = req.params;

  try {
    const userCheck = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userCheck.rows[0];

    if (user.id === req.admin.id) {
      return res.status(400).json({ error: 'You cannot delete your own admin account.' });
    }

    await pool.query('DELETE FROM users WHERE id = $1', [userId]);

    await logAdminAction(
      req.admin.id,
      'user_delete',
      'user',
      userId,
      { email: user.email },
      null,
      req
    );

    res.status(200).json({
      success: true,
      message: `User ${user.email} deleted successfully.`,
    });
  } catch (err) {
    logger.error('Failed to delete user:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

router.get('/admin/users/:userId/conversations', adminAuth, async (req, res) => {
  const { userId } = req.params;
  try {
    const query = `
      SELECT
        c.id,
        c.title,
        c.model,
        c.created_at,
        (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) as messages_count
      FROM conversations c
      WHERE c.user_id = $1
      ORDER BY c.created_at DESC
      LIMIT 10
    `;
    const result = await pool.query(query, [userId]);
    res.status(200).json(result.rows);
  } catch (err) {
    logger.error('Failed to get user conversations:', err);
    res.status(500).json({ error: 'Failed to retrieve user conversations' });
  }
});

// PUT /admin/users/:userId/plan & /v1/admin/users/:userId/plan
router.put(['/admin/users/:userId/plan', '/v1/admin/users/:userId/plan'], adminAuth, async (req, res) => {
  const { userId } = req.params;
  const { planId } = req.body;

  const idempotencyKey = req.headers['idempotency-key'];
  let dedupKey = '';
  try {
    if (idempotencyKey) {
      const cached = await redis.get(`dedup:response:${idempotencyKey}`);
      if (cached) {
        return res.status(200).json(JSON.parse(cached));
      }
      dedupKey = `dedup:plan:${idempotencyKey}`;
      const exists = await redis.set(dedupKey, '1', 'EX', 300, 'NX');
      if (!exists) {
        return res.status(409).json({ error: 'Duplicate request' });
      }
    }

    const userCheck = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      if (idempotencyKey && dedupKey) {
        await redis.del(dedupKey);
      }
      return res.status(404).json({ error: 'User not found' });
    }

    let billingInfo = null;

    if (planId) {
      const planResult = await pool.query('SELECT * FROM plans WHERE id = $1', [
        planId.toLowerCase(),
      ]);
      if (planResult.rows.length === 0) {
        if (idempotencyKey && dedupKey) {
          await redis.del(dedupKey);
        }
        return res.status(404).json({ error: 'Subscription plan not found' });
      }
      const plan = planResult.rows[0];
      const currencySymbol = plan.currency === 'INR' ? '₹' : '$';

      billingInfo = {
        planId: plan.id,
        planName: plan.name + ' Plan',
        price: `${currencySymbol}${parseFloat(plan.price).toFixed(2)}`,
        currency: plan.currency,
        billingCycle: plan.billing,
        status: 'ACTIVE',
        features: plan.features || {},
      };
    }

    await pool.query('UPDATE users SET billing_info = $1 WHERE id = $2', [
      billingInfo ? JSON.stringify(billingInfo) : '{}',
      userId,
    ]);

    await logAdminAction(
      req.admin?.id || 'admin',
      'user_update_plan',
      'user',
      userId,
      null,
      { planId, billingInfo },
      req
    );

    const responsePayload = { success: true, billing_info: billingInfo };

    if (idempotencyKey && dedupKey) {
      await redis.set(`dedup:response:${idempotencyKey}`, JSON.stringify(responsePayload), 'EX', 300);
      await redis.del(dedupKey);
    }

    res.status(200).json(responsePayload);
  } catch (err) {
    if (idempotencyKey && dedupKey) {
      await redis.del(dedupKey);
    }
    logger.error('Failed to update user plan:', err);
    res.status(500).json({ error: 'Failed to update user plan' });
  }
});

// PUT /admin/users/:userId & /v1/admin/users/:userId - Update user profile & business details
router.put(['/admin/users/:userId', '/v1/admin/users/:userId'], adminAuth, async (req, res) => {
  const { userId } = req.params;
  const { name, phone, company, job_title, department, country, bio, role } = req.body;

  try {
    const userCheck = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentUser = userCheck.rows[0];

    const updatedName = name !== undefined ? name : currentUser.name;
    const updatedPhone = phone !== undefined ? phone : currentUser.phone;
    const updatedCompany = company !== undefined ? company : currentUser.company;
    const updatedJobTitle = job_title !== undefined ? job_title : currentUser.job_title;
    const updatedDepartment = department !== undefined ? department : currentUser.department;
    const updatedCountry = country !== undefined ? country : currentUser.country;
    const updatedBio = bio !== undefined ? bio : currentUser.bio;
    const updatedRole = role !== undefined ? role : currentUser.role;

    const result = await pool.query(
      `UPDATE users
       SET name = $1, phone = $2, company = $3, job_title = $4, department = $5, country = $6, bio = $7, role = $8, updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [updatedName, updatedPhone, updatedCompany, updatedJobTitle, updatedDepartment, updatedCountry, updatedBio, updatedRole, userId]
    );

    await logAdminAction(
      req.admin?.id || 'admin',
      'user_update_profile',
      'user',
      userId,
      null,
      { name: updatedName, phone: updatedPhone, company: updatedCompany, job_title: updatedJobTitle, department: updatedDepartment, country: updatedCountry, bio: updatedBio, role: updatedRole },
      req
    );

    res.json({
      success: true,
      message: 'User profile and business details updated successfully',
      user: result.rows[0]
    });
  } catch (err) {
    logger.error('Failed to update user profile:', err);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

export default router;
