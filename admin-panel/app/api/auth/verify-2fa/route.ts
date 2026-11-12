import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '../../../../lib/db';
import {
  verifyAdminToken,
  signAdminAccessToken,
  signAdminRefreshToken,
  storeAdminRefreshToken,
  recordAdminAuditLog,
} from '../../../../lib/auth';

export async function POST(req: NextRequest) {
  const rawIp = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for') || 'unknown';
  const ip = rawIp.split(',')[0].trim().replace(/^::ffff:/, '');

  try {
    const body = await req.json().catch(() => ({}));
    const { tempToken, code } = body as { tempToken?: string; code?: string };

    if (!tempToken || !code) {
      return NextResponse.json(
        { error: 'Temporary token and 2FA code are required' },
        { status: 400 }
      );
    }

    const tokenVerification = await verifyAdminToken(tempToken, '2fa_pending');
    if (!tokenVerification.valid || !tokenVerification.user) {
      return NextResponse.json(
        { error: tokenVerification.error || '2FA session expired. Please login again.' },
        { status: 401 }
      );
    }

    const decoded = tokenVerification.user;

    const userResult = await getDbPool().query(
      `SELECT id, tenant_id, email, role, two_factor_secret, two_factor_backup_codes, status
       FROM users
       WHERE id = $1 AND deleted_at IS NULL`,
      [decoded.userId]
    );
    const user = userResult.rows[0];
    if (!user || !user.two_factor_secret) {
      return NextResponse.json({ error: 'User not found or 2FA not configured' }, { status: 401 });
    }

    if (user.status === 'suspended' || user.status === 'inactive') {
      return NextResponse.json({ error: 'Administrator account suspended or inactive' }, { status: 403 });
    }

    let isValid = false;
    let authMethod = 'totp';
    try {
      const moduleName = 'otplib';
      const otplib = await import(/* webpackIgnore: true */ moduleName);
      const authenticator = (otplib as any).authenticator || (otplib as any).default?.authenticator;
      if (authenticator) {
        isValid = authenticator.verify({ token: code.trim(), secret: user.two_factor_secret });
      }
    } catch {
      // otplib unavailable - fall through to backup code check below
    }

    if (!isValid) {
      const backupCodes: Array<{ hash: string; used_at: string | null }> = user.two_factor_backup_codes || [];
      const bcrypt = await import('bcryptjs');
      for (const bc of backupCodes) {
        if (bc.used_at) continue;
        if (await bcrypt.compare(code.trim(), bc.hash)) {
          bc.used_at = new Date().toISOString();
          await getDbPool().query(
            `UPDATE users SET two_factor_backup_codes = $1 WHERE id = $2`,
            [JSON.stringify(backupCodes), user.id]
          );
          isValid = true;
          authMethod = 'backup_code';
          break;
        }
      }
    }

    if (!isValid) {
      await recordAdminAuditLog(user.id, 'ADMIN_2FA_VERIFICATION_FAILED', 'user', user.id, { ip });
      return NextResponse.json({ error: 'Invalid 2FA code' }, { status: 401 });
    }

    // Issue cryptographically signed admin tokens
    const { token: accessToken } = signAdminAccessToken({
      userId: user.id,
      role: user.role,
      email: user.email,
    });
    const { token: refreshToken } = signAdminRefreshToken({
      userId: user.id,
      role: user.role,
    });

    await storeAdminRefreshToken(user.id, refreshToken, user.tenant_id);

    await recordAdminAuditLog(user.id, 'ADMIN_2FA_VERIFICATION_SUCCESS', 'user', user.id, {
      ip,
      method: authMethod,
      role: user.role,
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

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isAdmin: true,
        isFounder: user.role === 'founder' || user.role === 'superadmin',
      },
    });

    response.headers.append('Set-Cookie', `admin_access_token=${accessToken}; ${accessCookieOpts}`);
    response.headers.append('Set-Cookie', `admin_token=${accessToken}; ${accessCookieOpts}`);
    response.headers.append('Set-Cookie', `admin_refresh_token=${refreshToken}; ${refreshCookieOpts}`);

    return response;
  } catch (err: any) {
    console.error('[/api/auth/verify-2fa] Error:', err?.message);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
