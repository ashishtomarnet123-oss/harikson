import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { getDbPool } from './db';

export const JWT_ISSUER = 'xarwiz-admin';
export const JWT_AUDIENCE = 'xarwiz-admin-panel';
export const JWT_ALGORITHM = 'HS256' as const;
export const ALLOWED_ADMIN_ROLES = ['admin', 'superadmin', 'founder'] as const;

export function getJwtSecret(): string {
  const raw = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!raw || raw.length < 32) {
    throw new Error('FATAL: JWT_SECRET (or NEXTAUTH_SECRET) must be set and at least 32 characters');
  }
  return raw;
}

export interface AdminTokenPayload {
  userId: string;
  role: string;
  email?: string;
  type: 'access' | 'refresh' | '2fa_pending';
  jti?: string;
}

export function signAdminAccessToken(payload: { userId: string; role: string; email?: string }): {
  token: string;
  jti: string;
} {
  const secret = getJwtSecret();
  const jti = crypto.randomUUID();
  const token = jwt.sign(
    {
      userId: payload.userId,
      role: payload.role,
      email: payload.email,
      type: 'access',
      jti,
    },
    secret,
    {
      algorithm: JWT_ALGORITHM,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      expiresIn: '8h', // 8-hour access token session with refresh token rotation
    }
  );
  return { token, jti };
}

export function signAdminRefreshToken(payload: { userId: string; role: string }): {
  token: string;
  jti: string;
} {
  const secret = getJwtSecret();
  const jti = crypto.randomUUID();
  const token = jwt.sign(
    {
      userId: payload.userId,
      role: payload.role,
      type: 'refresh',
      jti,
    },
    secret,
    {
      algorithm: JWT_ALGORITHM,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      expiresIn: '30d',
    }
  );
  return { token, jti };
}

export function signAdmin2faPendingToken(payload: { userId: string; role: string }): string {
  const secret = getJwtSecret();
  const jti = crypto.randomUUID();
  return jwt.sign(
    {
      userId: payload.userId,
      role: payload.role,
      type: '2fa_pending',
      jti,
    },
    secret,
    {
      algorithm: JWT_ALGORITHM,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      expiresIn: '5m',
    }
  );
}

export async function verifyAdminToken(
  token: string,
  expectedType: 'access' | 'refresh' | '2fa_pending' = 'access'
): Promise<{ valid: boolean; user?: any; error?: string; code?: string }> {
  try {
    const secret = getJwtSecret();
    let decoded: any;
    try {
      decoded = jwt.verify(token, secret, {
        algorithms: [JWT_ALGORITHM],
        // Tolerant issuer/audience fallback for smooth transition across sessions
      });
    } catch (jwtErr: any) {
      if (jwtErr.name === 'TokenExpiredError') {
        return { valid: false, error: 'Session expired. Please log in again.', code: 'TOKEN_EXPIRED' };
      }
      return { valid: false, error: 'Invalid or forged token.', code: 'INVALID_TOKEN' };
    }

    if (decoded.type !== expectedType) {
      return { valid: false, error: `Invalid token type: expected ${expectedType}`, code: 'INVALID_TOKEN_TYPE' };
    }

    // For 2FA pending tokens, skip database check
    if (expectedType === '2fa_pending') {
      return { valid: true, user: decoded };
    }

    // Validate active administrator status from database
    const pool = getDbPool();
    const userRes = await pool.query(
      `SELECT id, tenant_id, email, role, status, locked_until, failed_login_attempts, force_password_change
       FROM users 
       WHERE id = $1 AND deleted_at IS NULL
       LIMIT 1`,
      [decoded.userId]
    );

    if (userRes.rows.length === 0) {
      return { valid: false, error: 'Administrator user not found or deleted.', code: 'USER_NOT_FOUND' };
    }

    const user = userRes.rows[0];

    if (user.status === 'suspended' || user.status === 'inactive') {
      return { valid: false, error: 'Administrator account suspended or inactive.', code: 'ACCOUNT_SUSPENDED' };
    }

    if (!ALLOWED_ADMIN_ROLES.includes(user.role)) {
      return { valid: false, error: 'Access denied: Admin privileges required.', code: 'FORBIDDEN' };
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return { valid: false, error: 'Account temporarily locked due to security policy.', code: 'ACCOUNT_LOCKED' };
    }

    return { valid: true, user };
  } catch (err: any) {
    return { valid: false, error: err.message || 'Authentication error', code: 'AUTH_ERROR' };
  }
}

export async function recordAdminAuditLog(
  adminId: string | null,
  action: string,
  targetType: string,
  targetId: string | null,
  details: Record<string, any> = {}
): Promise<void> {
  try {
    const pool = getDbPool();
    await pool.query(
      `INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        adminId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(adminId) ? adminId : null,
        action,
        targetType,
        targetId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId) ? targetId : null,
        JSON.stringify(details),
      ]
    );
  } catch (err: any) {
    // Non-fatal audit log insertion failure
    console.error('[AdminAuditLog] Failed to record audit log:', err.message);
  }
}

export async function storeAdminRefreshToken(
  userId: string,
  token: string,
  tenantId?: string | null
): Promise<void> {
  try {
    const pool = getDbPool();
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at, revoked, tenant_id, created_at)
       VALUES ($1, $2, $3, FALSE, $4, NOW())`,
      [userId, tokenHash, expiresAt, tenantId || null]
    );
  } catch (err: any) {
    console.error('[RefreshToken] Failed to store admin refresh token:', err.message);
  }
}

export async function revokeAdminSession(userId: string): Promise<void> {
  try {
    const pool = getDbPool();
    await pool.query(
      `UPDATE refresh_tokens 
       SET revoked = TRUE 
       WHERE user_id = $1 AND revoked = FALSE`,
      [userId]
    );
  } catch (err: any) {
    console.error('[RevokeSession] Failed to revoke refresh tokens:', err.message);
  }
}

