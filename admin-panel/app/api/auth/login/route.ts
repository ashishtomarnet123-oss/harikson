import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const dbConnectionString =
  process.env.DATABASE_URL ||
  'postgresql://neuravolt:neuravolt_dev_pwd@postgres:5432/neuravolt';

const primaryPool = new Pool({
  connectionString: dbConnectionString,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 3000,
});

async function queryUser(email: string) {
  const normalizedEmail = email.toLowerCase().trim();
  const query = `
    SELECT id, email, role, password_hash, force_password_change, is_active
    FROM users
    WHERE email = $1
    ORDER BY created_at ASC LIMIT 1
  `;

  try {
    return await primaryPool.query(query, [normalizedEmail]);
  } catch (err: any) {
    // If running outside docker and 'postgres' hostname fails, try localhost fallback
    if (err?.code === 'ENOTFOUND' || err?.message?.includes('postgres')) {
      const localPool = new Pool({
        connectionString: 'postgresql://neuravolt:neuravolt_dev_pwd@localhost:5432/neuravolt',
        max: 3,
        connectionTimeoutMillis: 3000,
      });
      try {
        const res = await localPool.query(query, [normalizedEmail]);
        localPool.end().catch(() => {});
        return res;
      } catch (localErr) {
        localPool.end().catch(() => {});
        throw localErr;
      }
    }
    throw err;
  }
}

const JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  'neuravolt_dev_jwt_secret_key_extremely_long_and_secure_value_12345!';

export async function POST(req: NextRequest) {
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

    // Check role
    const allowedRoles = ['admin', 'superadmin', 'founder'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { error: 'Admin access required. This portal is for administrators only.' },
        { status: 403 }
      );
    }

    // Check if account is active
    if (user.is_active === false) {
      return NextResponse.json(
        { error: 'Account is suspended. Contact support.' },
        { status: 403 }
      );
    }

    // Check force password change
    if (user.force_password_change) {
      return NextResponse.json(
        {
          error: 'Password change required before access.',
          requirePasswordChange: true,
          code: 'FORCE_PASSWORD_CHANGE_REQUIRED',
        },
        { status: 403 }
      );
    }

    // Verify password
    const matches = await bcrypt.compare(password, user.password_hash);
    if (!matches) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Issue JWT tokens
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

    const isProd = process.env.NODE_ENV === 'production';
    const cookieOpts = [
      'HttpOnly',
      isProd ? 'Secure' : '',
      'SameSite=Lax',
      'Path=/',
      `Max-Age=${15 * 60}`,
    ]
      .filter(Boolean)
      .join('; ');

    const refreshOpts = [
      'HttpOnly',
      isProd ? 'Secure' : '',
      'SameSite=Lax',
      'Path=/',
      `Max-Age=${30 * 24 * 60 * 60}`,
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

    response.headers.append('Set-Cookie', `admin_access_token=${accessToken}; ${cookieOpts}`);
    response.headers.append('Set-Cookie', `admin_token=${accessToken}; ${cookieOpts}`);
    response.headers.append('Set-Cookie', `admin_refresh_token=${refreshToken}; ${refreshOpts}`);

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
