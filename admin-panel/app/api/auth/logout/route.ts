import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken, revokeAdminSession, recordAdminAuditLog } from '../../../../lib/auth';

export async function POST(req: NextRequest) {
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

    if (token) {
      try {
        const verification = await verifyAdminToken(token, 'access');
        if (verification.valid && verification.user?.id) {
          await revokeAdminSession(verification.user.id);
          const rawIp = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for') || 'unknown';
          const ip = rawIp.split(',')[0].trim().replace(/^::ffff:/, '');
          await recordAdminAuditLog(verification.user.id, 'ADMIN_LOGOUT', 'user', verification.user.id, { ip });
        }
      } catch (_) {
        // Continue clearing cookies even if token verification fails
      }
    }
  } catch (err: any) {
    console.error('[/api/auth/logout] Revocation error:', err?.message);
  }

  const clearCookie = (name: string) =>
    `${name}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;

  const response = NextResponse.json({ success: true, message: 'Logged out and session revoked successfully' });
  response.headers.append('Set-Cookie', clearCookie('admin_access_token'));
  response.headers.append('Set-Cookie', clearCookie('admin_token'));
  response.headers.append('Set-Cookie', clearCookie('admin_refresh_token'));
  return response;
}
