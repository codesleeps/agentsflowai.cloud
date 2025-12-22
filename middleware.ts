import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimiter } from './src/lib/rate-limiter';
import { handleCors } from './src/lib/cors';
import { getServerSessionFromRequest, isInngestRequest } from './src/lib/auth-helpers';

// Define protected route patterns
const protectedRoutes = [
  '/api/leads',
  '/api/appointments', 
  '/api/conversations',
  '/api/services',
  '/api/dashboard',
  '/api/ai'
];

const publicRoutes = [
  '/api/health',
  '/api/inngest'
];

function isProtectedRoute(pathname: string): boolean {
  return protectedRoutes.some(route => pathname.startsWith(route));
}

function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(route => pathname.startsWith(route));
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    const corsResponse = handleCors(request);
    if (corsResponse) {
      return corsResponse;
    }
  }

  // Handle public routes (no authentication required)
  if (isPublicRoute(pathname)) {
    const corsResponse = handleCors(request);
    if (corsResponse) {
      return corsResponse;
    }
    return NextResponse.next();
  }

  // Apply rate limiting to all requests except health check
  if (pathname !== '/api/health' && !rateLimiter.shouldSkip(request)) {
    const rateLimitResult = rateLimiter.check(request);
    
    if (!rateLimitResult.allowed) {
      const response = NextResponse.json(
        { error: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' },
        { status: 429 }
      );
      
      response.headers.set('X-RateLimit-Limit', '60');
      response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
      response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());
      
      return response;
    }

    // Add rate limit headers to response
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', '60');
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());
  }

  // Check CORS for API routes
  if (pathname.startsWith('/api/')) {
    const corsResponse = handleCors(request);
    if (corsResponse) {
      return corsResponse;
    }
  }

  // Apply authentication for protected routes
  if (isProtectedRoute(pathname)) {
    // Special handling for Inngest routes
    if (pathname.startsWith('/api/inngest/')) {
      if (!isInngestRequest(request)) {
        return NextResponse.json(
          { error: 'Invalid Inngest signature', code: 'AUTHENTICATION_ERROR' },
          { status: 401 }
        );
      }
    } else {
      // Regular authentication for other protected routes
      const authResult = await getServerSessionFromRequest(request);
      
      if (!authResult.authenticated) {
        return NextResponse.json(
          { error: 'Authentication required', code: 'AUTHENTICATION_ERROR' },
          { status: 401 }
        );
      }

      // Add user ID to request headers for downstream use
      const response = NextResponse.next();
      response.headers.set('X-User-Id', authResult.user!.id);
      return response;
    }
  }

  // Add security headers to all responses
  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Add CSP header
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://vybe.build https://i.ibb.co https://cdn.brandfetch.io",
    "connect-src 'self' https://vybe.build",
    "font-src 'self' data:",
    "frame-ancestors 'none'"
  ];
  response.headers.set('Content-Security-Policy', cspDirectives.join('; '));

  // Add HSTS in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  return response;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};