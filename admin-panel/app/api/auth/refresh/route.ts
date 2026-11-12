import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDbPool } from '../../../../lib/db';
import {
  verifyAdminToken,
  signAdminAccessToken,
  signAdminRefreshToken,
  storeAdminRefreshToken,
  ALLOWED_ADMIN_ROLES,
} from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get('cookie') || '';
    const getToken = (name: string) => {
      const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
      return match ? match[1] : null;
    };

    let refreshToken = getToken('admin_refresh_token');
    if (!refreshToken) {
      const body = await req.json().catch(() => ({}));
      refreshToken = body?.refreshToken;
    }

    if (!refreshToken) {
      return NextResponse.json({ error: 'Refresh token missing' }, { status: 401 });
    }

    const verification = await verifyAdminToken(refreshToken, 'refresh');
    if (!verification.valid || !verification.user) {
      return NextResponse.json(
        { error: verification.error || 'Invalid or expired refresh token' },
        { status: 401 }
      );
    }

    const userId = verification.user.id;
    const pool = getDbPool();

    // Verify refresh token in database
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const tokenRes = await pool.query(
      `SELECT id, user_id, revoked, expires_at 
       FROM refresh_tokens 
       WHERE user_id = $1 AND token = $2 
       ORDER BY created_at DESC LIMIT 1`,
      [userId, tokenHash]
    );

    if (tokenRes.rows.length === 0 || tokenRes.rows[0].revoked) {
      // Possible reuse attack or revoked token: fail closed
      return NextResponse.json(
        { error: 'Refresh token has been revoked or is invalid. Please log in again.' },
        { status: 401 }
      );
    }

    const storedToken = tokenRes.rows[0];
    if (new Date(storedToken.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Refresh token expired' }, { status: 401 });
    }

    // Verify user role & status
    const userRes = await pool.query(
      `SELECT id, tenant_id, email, role, status 
       FROM users 
       WHERE id = $1 AND deleted_at IS NULL`,
      [userId]
    );

    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const user = userRes.rows[0];
    if (user.status === 'suspended' || user.status === 'inactive') {
      return NextResponse.json({ error: 'Account suspended or inactive' }, { status: 403 });
    }

    if (!ALLOWED_ADMIN_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Admin privilege required' }, { status: 403 });
    }

    // Rotate refresh token: revoke current token and issue new pair
    await pool.query('UPDATE refresh_tokens SET revoked = TRUE WHERE id = $1', [storedToken.id]);

    const { token: newAccessToken } = signAdminAccessToken({
      userId: user.id,
      role: user.role,
      email: user.email,
    });
    const { token: newRefreshToken } = signAdminRefreshToken({
      userId: user.id,
      role: user.role,
    });

    await storeAdminRefreshToken(user.id, newRefreshToken, user.tenant_id);

    const isHttps = req.nextUrl.protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https';
    const accessCookieOpts = [
      'HttpOnly',
      isHttps ? 'Secure' : '',
      'SameSite=Lax',
      'Path=/',
      `Max-Age=${8 * 60 * 60}`,
    ]
      .filter(Boolean)
      .join('; ');

    const refreshCookieOpts = [
      'HttpOnly',
      isHttps ? 'Secure' : '',
      'SameSite=Lax',
      'Path=/',
      `Max-Age=${30 * 24 * 60 * 60}`,
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
      },
    });

    response.headers.append('Set-Cookie', `admin_access_token=${newAccessToken}; ${accessCookieOpts}`);
    response.headers.append('Set-Cookie', `admin_token=${newAccessToken}; ${accessCookieOpts}`);
    response.headers.append('Set-Cookie', `admin_refresh_token=${newRefreshToken}; ${refreshCookieOpts}`);

    return response;
  } catch (err: any) {
    console.error('[/api/auth/refresh] Error:', err);
    return NextResponse.json({ error: 'Session refresh failed' }, { status: 500 });
  }
}

