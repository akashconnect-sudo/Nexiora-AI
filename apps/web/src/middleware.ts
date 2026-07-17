import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIE = 'nexiora_session';

export function middleware(request: NextRequest) {
  if (request.cookies.get(SESSION_COOKIE)?.value === '1') {
    return NextResponse.next();
  }

  const signIn = new URL('/sign-in', request.url);
  signIn.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(signIn);
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/creator/:path*',
    '/search/:path*',
    '/news/:path*',
    '/library/:path*',
    '/settings/:path*',
  ],
};
