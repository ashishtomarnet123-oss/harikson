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

async function queryUserById(userId: string) {
  const query = 'SELECT id, tenant_id, email, role FROM users WHERE id = $1 LIMIT 1';
  return await getPool().query(query, [userId]);
}

// Deliberately not evaluated at module load: Next.js's build step imports
// route modules to collect page data, which would run this before any
// runtime env vars are injected and fail the build itself. Called instead
// from inside the handler, where it only runs against a real request.
function getJwtSecret(): string {
  const raw = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!raw || raw.length < 32) {
    throw new Error('FATAL: JWT_SECRET (or NEXTAUTH_SECRET) must be set and at least 32 characters');
  }
  return raw;
}

export async function GET(req: NextRequest) {
  try {
    const JWT_SECRET = getJwtSecret();
    const cookieHeader = req.headers.get('cookie') || '';
    const getToken = (name: string) => {
      const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
      return match ? match[1] : null;
    };

    const token =
      getToken('admin_access_token') ||
      getToken('admin_token') ||
      req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let payload: any;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    let userResult;
    try {
      userResult = await queryUserById(payload.userId);
    } catch (dbErr: any) {
      console.error('[/api/auth/me] Database connection error:', dbErr?.message);
      return NextResponse.json({ error: 'Database service unavailable' }, { status: 500 });
    }
    const user = userResult?.rows?.[0];

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const allowedRoles = ['admin', 'superadmin', 'founder'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isAdmin: true,
      },
    });
  } catch (err: any) {
    console.error('[/api/auth/me] Error:', err);
    return NextResponse.json({ error: 'Auth check failed' }, { status: 500 });
  }
}
