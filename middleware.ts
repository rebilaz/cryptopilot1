import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const PROTECTED_PREFIXES = ['/dashboard'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Allow api, static, auth, next internals
  if (pathname.startsWith('/api/') || pathname.startsWith('/auth/') || pathname.startsWith('/_next/') || pathname === '/') return NextResponse.next();
  const isProtected = PROTECTED_PREFIXES.some(p => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    const url = new URL('/auth/signin', req.url);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard', '/dashboard/:path*']
};
