import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ALLOWED_ADMIN_ROLES = ['admin', 'superadmin', 'founder'];


async function verifyAdminJwtInEdge(
  token: string,
  secretStr: string
): Promise<{ valid: boolean; payload?: any }> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return { valid: false };

    const [headerB64, payloadB64, signatureB64] = parts;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secretStr),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const b64UrlToUint8 = (str: string) => {
      const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
      const pad = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      const bin = atob(pad);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return bytes;
    };

    const signature = b64UrlToUint8(signatureB64);
    const data = enc.encode(`${headerB64}.${payloadB64}`);

    const isValid = await crypto.subtle.verify('HMAC', key, signature, data);
    if (!isValid) return { valid: false };

    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));

    // Verify token expiration
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return { valid: false };
    }

    // Verify privileged role
    if (!payload.role || !ALLOWED_ADMIN_ROLES.includes(payload.role)) {
      return { valid: false };
    }

    // Verify token is not a pending 2FA token
    if (payload.type === '2fa_pending') {
      return { valid: false };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false };
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const authHeader = request.headers.get('authorization');
  let bearerToken: string | null = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    bearerToken = authHeader.split(' ')[1];
  }

  const adminToken =
    bearerToken ||
    request.cookies.get('admin_access_token')?.value ||
    request.cookies.get('admin_token')?.value;

  const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || '';

  // 1. Independent protection for /api/admin/:path*
  if (pathname.startsWith('/api/admin/')) {
    if (!adminToken || !jwtSecret || jwtSecret.length < 32) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin authentication required' },
        { status: 401 }
      );
    }

    const { valid } = await verifyAdminJwtInEdge(adminToken, jwtSecret);
    if (!valid) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid, expired, or non-admin token' },
        { status: 401 }
      );
    }

    return NextResponse.next();
  }

  // 2. Protection for /admin/:path* frontend routes
  if (
    pathname.startsWith('/admin') &&
    pathname !== '/admin/login' &&
    pathname !== '/admin/first-login'
  ) {
    if (!adminToken) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (jwtSecret && jwtSecret.length >= 32) {
      const { valid } = await verifyAdminJwtInEdge(adminToken, jwtSecret);
      if (!valid) {
        const loginUrl = new URL('/admin/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        const res = NextResponse.redirect(loginUrl);
        // Clear invalid cookies
        res.cookies.delete('admin_token');
        res.cookies.delete('admin_access_token');
        res.cookies.delete('admin_refresh_token');
        return res;
      }

    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
