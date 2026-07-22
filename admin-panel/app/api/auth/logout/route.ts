import { NextRequest, NextResponse } from 'next/server';

export async function POST(_req: NextRequest) {
  const clearCookie = (name: string) =>
    `${name}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;

  const response = NextResponse.json({ success: true });
  response.headers.append('Set-Cookie', clearCookie('admin_access_token'));
  response.headers.append('Set-Cookie', clearCookie('admin_token'));
  response.headers.append('Set-Cookie', clearCookie('admin_refresh_token'));
  return response;
}
