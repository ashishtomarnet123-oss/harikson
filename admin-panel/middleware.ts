import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

async function verifyAdminJwt(token: string): Promise<boolean> {
  const secretStr =
    process.env.JWT_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    'neuravolt_dev_jwt_secret_key_extremely_long_and_secure_value_12345!';

  if (!token || !secretStr) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  try {
    const [headerB64, payloadB64, signatureB64] = parts;
    const base64UrlToBytes = (b64url: string): Uint8Array => {
      let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      const binary = atob(b64);
      const buffer = new ArrayBuffer(binary.length);
      const bytes = new Uint8Array(buffer);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return bytes;
    };

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secretStr),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const data = encoder.encode(`${headerB64}.${payloadB64}`);
    const signature = base64UrlToBytes(signatureB64);
    const isValid = await crypto.subtle.verify('HMAC', key, signature as any, data as any);
    if (!isValid) return false;

    const payloadJson = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson);
    if (payload.exp && payload.exp < Date.now() / 1000) return false;
    if (payload.type === '2fa_pending') return false;

    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const adminToken =
    request.cookies.get('admin_token')?.value ||
    request.cookies.get('admin_access_token')?.value;

  // Protect /admin routes (except /admin/login, /admin/first-login, and /admin/api)
  if (
    pathname.startsWith('/admin') &&
    pathname !== '/admin/login' &&
    pathname !== '/admin/first-login' &&
    !pathname.startsWith('/admin/api')
  ) {
    if (!adminToken) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const isValid = await verifyAdminJwt(adminToken);
    if (!isValid) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('admin_token');
      response.cookies.delete('admin_access_token');
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};

