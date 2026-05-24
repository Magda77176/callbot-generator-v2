import { NextResponse } from 'next/server';
import { COOKIE_NAME, checkPassword, makeSignedCookieValue } from '@/lib/admin-auth';

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  const submitted = formData?.get('password');

  if (typeof submitted !== 'string' || !checkPassword(submitted)) {
    return NextResponse.redirect(new URL('/admin/login?error=1', request.url));
  }

  const response = NextResponse.redirect(new URL('/admin', request.url));
  response.cookies.set({
    name: COOKIE_NAME,
    value: makeSignedCookieValue(),
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return response;
}
