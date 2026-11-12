import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDbPool } from '../../../../lib/db';
import {
  signAdminAccessToken,
  signAdminRefreshToken,
  signAdmin2faPendingToken,
  storeAdminRefreshToken,
  recordAdminAuditLog,
  ALLOWED_ADMIN_ROLES,
} from '../../../../lib/auth';

const ipAttempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  // Periodic cleanup of expired entries
  if (ipAttempts.size > 1000) {
    ipAttempts.forEach((val, key) => {
      if (now > val.resetAt) ipAttempts.delete(key);
    });
  }

  const entry = ipAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    ipAttempts.set(ip, { count: 1, resetAt: now + 10 * 60 * 1000 }); // 10 minute window
    return { allowed: true };
  }
  if (entry.count >= 5) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }
  entry.count += 1;
  return { allowed: true };
}

async function queryUser(email: string) {
  const normalizedEmail = email.toLowerCase().trim();
  const query = `
    SELECT id, tenant_id, email, role, status, password_hash, two_factor_enabled, two_factor_secret,
           locked_until, failed_login_attempts, force_password_change
    FROM users
    WHERE email = $1
    ORDER BY created_at ASC LIMIT 1
  `;
  return await getDbPool().query(query, [normalizedEmail]);
}

export async function POST(req: NextRequest) {
  const rawIp = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for') || 'unknown';
  const ip = rawIp.split(',')[0].trim().replace(/^::ffff:/, '');

  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    const retrySec = rateCheck.retryAfter || 60;
    return NextResponse.json(
      {
        error: `Too many login attempts. Please try again in ${Math.ceil(retrySec / 60)} minute(s).`,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: retrySec,
      },
      {
        status: 429,
        headers: { 'Retry-After': String(retrySec) },
      }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { email, password } = body as { email?: string; password?: string };

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    let userResult;
    try {
      userResult = await queryUser(email);
    } catch (dbErr: any) {
      console.error('[/api/auth/login] Database connection error:', dbErr?.message);
      return NextResponse.json(
        { error: 'Database service unavailable. Please check database connection.' },
        { status: 500 }
      );
    }

    const user = userResult?.rows?.[0];

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (!ALLOWED_ADMIN_ROLES.includes(user.role as any)) {
      await recordAdminAuditLog(user.id, 'ADMIN_LOGIN_REJECTED_NON_ADMIN', 'user', user.id, { ip, role: user.role });
      return NextResponse.json(
        { error: 'Admin access required. This portal is for administrators only.' },
        { status: 403 }
      );
    }

    if (user.status === 'suspended' || user.status === 'inactive') {
      return NextResponse.json(
        { error: 'Administrator account suspended or deactivated. Contact superadmin.' },
        { status: 403 }
      );
    }

    // Check account lockout status
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const remainingMs = new Date(user.locked_until).getTime() - Date.now();
      const remainingMins = Math.max(1, Math.ceil(remainingMs / 60000));
      return NextResponse.json(
        {
          error: `Account is temporarily locked due to multiple failed login attempts. Please try again in ${remainingMins} minute(s).`,
          code: 'ACCOUNT_LOCKED',
          retryAfterMinutes: remainingMins,
        },
        { status: 423 }
      );
    }

    const matches = user.password_hash ? await bcrypt.compare(password, user.password_hash) : false;

    if (!matches) {
      const attempts = (user.failed_login_attempts || 0) + 1;
      const isLocked = attempts >= 5;
      const lockedUntil = isLocked ? new Date(Date.now() + 30 * 60 * 1000) : null;

      await getDbPool().query(
        `UPDATE users
         SET failed_login_attempts = $1,
             locked_until = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [attempts, lockedUntil, user.id]
      );

      await recordAdminAuditLog(
        user.id,
        isLocked ? 'ADMIN_ACCOUNT_LOCKED' : 'ADMIN_LOGIN_FAILED',
        'user',
        user.id,
        { ip, failedAttempts: attempts }
      );

      if (isLocked) {
        return NextResponse.json(
          {
            error: 'Account locked for 30 minutes due to 5 consecutive failed login attempts.',
            code: 'ACCOUNT_LOCKED',
            retryAfterMinutes: 30,
          },
          { status: 423 }
        );
      }

      const remaining = 5 - attempts;
      return NextResponse.json(
        {
          error: `Invalid credentials. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining before account lockout.`,
          remainingAttempts: remaining,
        },
        { status: 401 }
      );
    }

    // Reset failed login attempts on successful password verification
    if (user.failed_login_attempts > 0 || user.locked_until) {
      await getDbPool().query(
        `UPDATE users
         SET failed_login_attempts = 0,
             locked_until = NULL,
             updated_at = NOW()
         WHERE id = $1`,
        [user.id]
      );
    }

    // Check mandatory password change policy
    if (user.force_password_change) {
      await recordAdminAuditLog(user.id, 'ADMIN_FORCE_PASSWORD_CHANGE_REQUIRED', 'user', user.id, { ip });
      return NextResponse.json(
        {
          error: 'Password change required before access. Please complete administrator password setup.',
          requirePasswordChange: true,
          code: 'FORCE_PASSWORD_CHANGE_REQUIRED',
        },
        { status: 403 }
      );
    }

    // Two-factor authentication challenge
    if (user.two_factor_enabled) {
      const tempToken = signAdmin2faPendingToken({ userId: user.id, role: user.role });
      await recordAdminAuditLog(user.id, 'ADMIN_2FA_CHALLENGE_ISSUED', 'user', user.id, { ip });
      return NextResponse.json({
        success: false,
        requires2FA: true,
        tempToken,
        userId: user.id,
      });
    }

    // Issue cryptographically signed admin tokens with full claims
    const { token: accessToken } = signAdminAccessToken({
      userId: user.id,
      role: user.role,
      email: user.email,
    });
    const { token: refreshToken } = signAdminRefreshToken({
      userId: user.id,
      role: user.role,
    });

    // Record refresh token in database for session tracking & revocation
    await storeAdminRefreshToken(user.id, refreshToken, user.tenant_id);

    // Record audit event
    await recordAdminAuditLog(user.id, 'ADMIN_LOGIN_SUCCESS', 'user', user.id, {
      ip,
      role: user.role,
      email: user.email,
    });

    const isHttps = req.nextUrl.protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https';

    const accessCookieOpts = [
      'HttpOnly',
      isHttps ? 'Secure' : '',
      'SameSite=Lax',
      'Path=/',
      `Max-Age=${8 * 60 * 60}`, // 8 hours
    ]
      .filter(Boolean)
      .join('; ');

    const refreshCookieOpts = [
      'HttpOnly',
      isHttps ? 'Secure' : '',
      'SameSite=Lax',
      'Path=/',
      `Max-Age=${30 * 24 * 60 * 60}`, // 30 days
    ]
      .filter(Boolean)
      .join('; ');

    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          isAdmin: true,
          isFounder: user.role === 'founder' || user.role === 'superadmin',
        },
      },
      { status: 200 }
    );

    response.headers.append('Set-Cookie', `admin_access_token=${accessToken}; ${accessCookieOpts}`);
    response.headers.append('Set-Cookie', `admin_token=${accessToken}; ${accessCookieOpts}`);
    response.headers.append('Set-Cookie', `admin_refresh_token=${refreshToken}; ${refreshCookieOpts}`);

    return response;
  } catch (err: any) {
    console.error('[/api/auth/login] Error:', err);
    return NextResponse.json(
      {
        error: 'Login error',
        message: err.message || 'An internal error occurred. Please try again.',
      },
      { status: 500 }
    );
  }
}
