import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIE = 'nexiora_session';

export function middleware(request: NextRequest) {
  const hasSession = request.cookies.get(SESSION_COOKIE)?.value === '1';
  const pathname = request.nextUrl.pathname;
  const isEntryRoute =
    pathname === '/' ||
    pathname.startsWith('/sign-in') ||
    pathname.startsWith('/sign-up') ||
    pathname.startsWith('/forgot-password');

  if (hasSession && isEntryRoute) {
    // Allow password recovery even if a stale session cookie is present.
    if (pathname.startsWith('/forgot-password')) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (hasSession || isEntryRoute) {
    return NextResponse.next();
  }

  const signIn = new URL('/sign-in', request.url);
  signIn.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(signIn);
}

export const config = {
  matcher: [
    '/',
    '/sign-in/:path*',
    '/sign-up/:path*',
    '/forgot-password',
    '/dashboard/:path*',
    '/creator/:path*',
    '/search/:path*',
    '/news/:path*',
    '/library/:path*',
    '/settings/:path*',
  ],
};
