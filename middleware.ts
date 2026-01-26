import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that don't require authentication
const publicRoutes = ['/login', '/api/auth/login'];

// Routes that require authentication
const protectedRoutes = [
  '/',
  '/leads',
  '/calculator',
  '/scraper',
  '/admin',
  '/deals',
  '/api/leads',
  '/api/calculator',
  '/api/scraper',
  '/api/config',
  '/api/users',
  '/api/reminders',
  '/api/dashboard',
  '/api/business-lookup',
  '/api/deals',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check if route requires authentication
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );

  if (isProtectedRoute) {
    // Check for auth token in cookie
    const authToken = request.cookies.get('auth-token')?.value;

    if (!authToken) {
      // No token found, redirect to login
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Token exists, allow the request to proceed
    // Note: Token validation happens in API routes
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
