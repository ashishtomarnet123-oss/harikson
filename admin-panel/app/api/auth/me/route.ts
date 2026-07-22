import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://neuravolt:neuravolt_dev_pwd@postgres:5432/neuravolt',
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

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

    const userResult = await pool.query(
      'SELECT id, email, role, is_active FROM users WHERE id = $1 LIMIT 1',
      [payload.userId]
    );

    const user = userResult.rows[0];
    if (!user || user.is_active === false) {
      return NextResponse.json({ error: 'User not found or suspended' }, { status: 401 });
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
        isFounder: user.role === 'founder' || user.role === 'superadmin',
      },
    });
  } catch (err: any) {
    console.error('[/api/auth/me] Error:', err);
    return NextResponse.json({ error: 'Auth check failed' }, { status: 500 });
  }
}
