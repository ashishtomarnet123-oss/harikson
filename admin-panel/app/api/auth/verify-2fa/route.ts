import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

let primaryPool: InstanceType<typeof Pool> | null = null;
function getPool() {
  if (!primaryPool) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
    primaryPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 3000,
    });
  }
  return primaryPool;
}

function getJwtSecret(): string {
  const raw = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!raw || raw.length < 32) {
    throw new Error('FATAL: JWT_SECRET must be set and at least 32 characters');
  }
  return raw;
}

export async function POST(req: NextRequest) {
  try {
    const JWT_SECRET = getJwtSecret();
    const body = await req.json().catch(() => ({}));
    const { tempToken, code } = body as { tempToken?: string; code?: string };

    if (!tempToken || !code) {
      return NextResponse.json(
        { error: 'Temporary token and 2FA code are required' },
        { status: 400 }
      );
    }

    let decoded: any;
    try {
      decoded = jwt.verify(tempToken, JWT_SECRET);
    } catch {
      return NextResponse.json(
        { error: '2FA session expired. Please login again.' },
        { status: 401 }
      );
    }

    if (decoded.type !== '2fa_pending') {
      return NextResponse.json({ error: 'Invalid token type' }, { status: 401 });
    }

    const userResult = await getPool().query(
      `SELECT id, email, role, two_factor_secret, two_factor_backup_codes FROM users WHERE id = $1`,
      [decoded.userId]
    );
    const user = userResult.rows[0];
    if (!user || !user.two_factor_secret) {
      return NextResponse.json({ error: 'User not found or 2FA not configured' }, { status: 401 });
    }

    let isValid = false;
    try {
      const moduleName = 'otplib';
      const otplib = await import(/* webpackIgnore: true */ moduleName);
      const authenticator = (otplib as any).authenticator || (otplib as any).default?.authenticator;
      if (authenticator) {
        isValid = authenticator.verify({ token: code, secret: user.two_factor_secret });
      }
    } catch {
      // otplib not available — fall through to backup code check below
    }

    if (!isValid) {
      const backupCodes: Array<{ hash: string; used_at: string | null }> = user.two_factor_backup_codes || [];
      const bcrypt = await import('bcryptjs');
      for (const bc of backupCodes) {
        if (bc.used_at) continue;
        if (await bcrypt.compare(code, bc.hash)) {
          bc.used_at = new Date().toISOString();
          await getPool().query(
            `UPDATE users SET two_factor_backup_codes = $1 WHERE id = $2`,
            [JSON.stringify(backupCodes), user.id]
          );
          isValid = true;
          break;
        }
      }
    }

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid 2FA code' }, { status: 401 });
    }

    const accessToken = jwt.sign(
      { userId: user.id, role: user.role, type: 'access' },
      JWT_SECRET,
      { expiresIn: '15m' }
    );
    const refreshToken = jwt.sign(
      { userId: user.id, role: user.role, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    const isHttps = req.nextUrl.protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https';
    const cookieOpts = ['HttpOnly', isHttps ? 'Secure' : '', 'SameSite=Lax', 'Path=/', `Max-Age=${15 * 60}`]
      .filter(Boolean).join('; ');
    const refreshOpts = ['HttpOnly', isHttps ? 'Secure' : '', 'SameSite=Lax', 'Path=/', `Max-Age=${30 * 24 * 60 * 60}`]
      .filter(Boolean).join('; ');

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isAdmin: true,
      },
    });

    response.headers.append('Set-Cookie', `admin_access_token=${accessToken}; ${cookieOpts}`);
    response.headers.append('Set-Cookie', `admin_token=${accessToken}; ${cookieOpts}`);
    response.headers.append('Set-Cookie', `admin_refresh_token=${refreshToken}; ${refreshOpts}`);

    return response;
  } catch (err: any) {
    console.error('[/api/auth/verify-2fa] Error:', err?.message);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
