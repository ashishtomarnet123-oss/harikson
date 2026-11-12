import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

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
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    const verification = await verifyAdminToken(token, 'access');
    if (!verification.valid || !verification.user) {
      return NextResponse.json(
        { error: verification.error || 'Invalid or expired session', code: verification.code || 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const user = verification.user;

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
