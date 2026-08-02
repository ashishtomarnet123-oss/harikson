import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const dbConnectionString =
  process.env.DATABASE_URL ||
  'postgresql://neuravolt:neuravolt_dev_pwd@harikson-postgres:5432/neuravolt';

const primaryPool = new Pool({
  connectionString: dbConnectionString,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 3000,
});

async function queryUser(email: string) {
  const normalizedEmail = email.toLowerCase().trim();
  const query = `
    SELECT id, tenant_id, email, role, password_hash
    FROM users
    WHERE email = $1
    ORDER BY created_at ASC LIMIT 1
  `;

  try {
    return await primaryPool.query(query, [normalizedEmail]);
  } catch (err: any) {
    const fallbackUrls = [
      'postgresql://neuravolt:neuravolt_dev_pwd@postgres:5432/neuravolt',
      'postgresql://neuravolt:neuravolt_dev_pwd@localhost:5432/neuravolt',
    ];
    for (const url of fallbackUrls) {
      try {
        const localPool = new Pool({
          connectionString: url,
          max: 2,
          connectionTimeoutMillis: 2000,
        });
        const res = await localPool.query(query, [normalizedEmail]);
        localPool.end().catch(() => {});
        return res;
      } catch {
        // try next
      }
    }
    throw err;
  }
}

// Deliberately not evaluated at module load: Next.js's build step imports
// route modules to collect page data, which would run this before any
// runtime env vars are injected and fail the build itself. Called instead
// from inside each handler, where it only runs against a real request.
function getJwtSecret(): string {
  const raw = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!raw || raw.length < 32) {
    throw new Error('FATAL: JWT_SECRET (or NEXTAUTH_SECRET) must be set and at least 32 characters');
  }
  return raw;
}

export async function POST(req: NextRequest) {
  try {
    const JWT_SECRET = getJwtSecret();
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

    const allowedRoles = ['admin', 'superadmin', 'founder'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { error: 'Admin access required. This portal is for administrators only.' },
        { status: 403 }
      );
    }

    const matches = user.password_hash ? await bcrypt.compare(password, user.password_hash) : false;

    if (!matches) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
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

    // Only set Secure attribute if request is over HTTPS
    const isHttps = req.nextUrl.protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https';

    const cookieOpts = [
      'HttpOnly',
      isHttps ? 'Secure' : '',
      'SameSite=Lax',
      'Path=/',
      `Max-Age=${15 * 60}`,
    ]
      .filter(Boolean)
      .join('; ');

    const refreshOpts = [
      'HttpOnly',
      isHttps ? 'Secure' : '',
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
