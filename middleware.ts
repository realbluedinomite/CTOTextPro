import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { SESSION_COOKIE_NAME } from '@/lib/auth/constants';
import { verifySessionCookieOnEdge } from '@/lib/auth/edge-session';

const csp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'self'",
].join('; ');

const securityHeaders: Record<string, string> = {
  'Content-Security-Policy': csp,
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

const PROTECTED_APP_PATHS = ['/app', '/practice', '/progress', '/settings'];
const PUBLIC_FILE = /\.(.*)$/;

function applySecurityHeaders(response: NextResponse) {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

function isPublicAsset(pathname: string) {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname === '/favicon.ico' ||
    PUBLIC_FILE.test(pathname)
  );
}

function isProtectedAppPath(pathname: string) {
  return PROTECTED_APP_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (request.method === 'OPTIONS') {
    return applySecurityHeaders(NextResponse.next());
  }

  if (isPublicAsset(pathname)) {
    return applySecurityHeaders(NextResponse.next());
  }

  const isAuthRoute = pathname.startsWith('/api/auth');
  const isProtectedApi = pathname.startsWith('/api') && !isAuthRoute;
  const protectedAppRoute = isProtectedAppPath(pathname);
  const shouldEnforceAuth = isProtectedApi || protectedAppRoute;

  if (!shouldEnforceAuth) {
    return applySecurityHeaders(NextResponse.next());
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value ?? null;

  if (!sessionCookie) {
    if (isProtectedApi) {
      return applySecurityHeaders(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
    }

    const signInUrl = new URL('/sign-in', request.url);

    if (request.method === 'GET') {
      signInUrl.searchParams.set('redirectTo', pathname);
    }

    return applySecurityHeaders(NextResponse.redirect(signInUrl));
  }

  try {
    const { shouldRefresh } = await verifySessionCookieOnEdge(sessionCookie);
    const response = NextResponse.next();

    if (shouldRefresh) {
      response.headers.set('x-session-refresh', '1');
    }

    return applySecurityHeaders(response);
  } catch (error) {
    console.error('Session verification failed in middleware', error);

    if (isProtectedApi) {
      return applySecurityHeaders(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
    }

    const signInUrl = new URL('/sign-in', request.url);

    if (request.method === 'GET') {
      signInUrl.searchParams.set('redirectTo', pathname);
    }

    return applySecurityHeaders(NextResponse.redirect(signInUrl));
  }
}

export const config = {
  matcher: '/:path*',
};
