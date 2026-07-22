import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const adminToken =
    request.cookies.get('admin_token')?.value ||
    request.cookies.get('admin_access_token')?.value;

  // Protect /admin routes (except /admin/login and /admin/first-login)
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
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};

