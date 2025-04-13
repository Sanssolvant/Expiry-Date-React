import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

const publicRoutes = ['/register', '/forgot-password', '/reset-password'];

export function middleware(request: NextRequest) {
  const pathName = request.nextUrl.pathname;

  const session = getSessionCookie(request);
  const isLoginPage = pathName === '/';
  const isPublic = publicRoutes.includes(pathName);

  if (!session) {
    if (isLoginPage || isPublic) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL('/', request.url));
  }

  // ✅ Eingeloggt → kein Zugang zu "/", register etc.
  if (isLoginPage || isPublic) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|css|js)$).*)'],
};
