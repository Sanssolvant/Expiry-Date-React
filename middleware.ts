import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

const publicRoutes = ['/register', '/forgot-password', '/reset-password'];

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // ⛔ Ignore static files and uploads
  if (
    path.startsWith('/uploads') ||
    path.startsWith('/_next') ||
    path.endsWith('.js') ||
    path.endsWith('.css') ||
    path.endsWith('.jpg') ||
    path.endsWith('.jpeg') ||
    path.endsWith('.png') ||
    path.endsWith('.svg') ||
    path.endsWith('.webp') ||
    path.endsWith('.ico')
  ) {
    return NextResponse.next();
  }

  const session = getSessionCookie(request);
  const isLoginPage = path === '/';
  const isPublic = publicRoutes.includes(path);

  if (!session) {
    if (isLoginPage || isPublic) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (isLoginPage || isPublic) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api).*)'],
};
