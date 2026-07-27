import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
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

async function queryUserById(userId: string) {
  const query = 'SELECT id, tenant_id, email, role FROM users WHERE id = $1 LIMIT 1';
  try {
    return await primaryPool.query(query, [userId]);
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
        const res = await localPool.query(query, [userId]);
        localPool.end().catch(() => {});
        return res;
      } catch {
        // try next
      }
    }
    throw err;
  }
}

const JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  'neuravolt_dev_jwt_secret_key_extremely_long_and_secure_value_12345!';

export async function GET(req: NextRequest) {
  try {
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

    const userResult = await queryUserById(payload.userId);
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
