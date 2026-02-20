/**
 * Unit tests for middleware
 *
 * Tests:
 * - Protected route authentication (session cookie checks)
 * - Admin route role enforcement
 * - Development bypass (auth skipped, rate-limit/CORS still applied)
 * - Public routes (no auth, rate-limit skipped)
 * - Rate limiting (429 on block, headers on allow)
 * - Inngest route signature verification
 * - Security headers on all passing responses
 * - CSP differences between development and production
 */

// Mock using @/ alias path with inline jest.fn() calls
jest.mock('@/lib/rate-limiter', () => ({
  rateLimiter: {
    check: jest.fn(),
    shouldSkip: jest.fn(),
  },
}));

jest.mock('@/lib/cors', () => ({
  handleCors: jest.fn(),
}));

jest.mock('@/lib/auth-helpers', () => ({
  isInngestRequest: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: jest.fn(),
    },
  },
}));

import { NextRequest, NextResponse } from 'next/server';
import { middleware } from '../../../../middleware';
import { rateLimiter } from '@/lib/rate-limiter';
import { handleCors } from '@/lib/cors';
import { isInngestRequest } from '@/lib/auth-helpers';
import { auth } from '@/lib/auth';

// ---------------------------------------------------------------------------
// Typed mock helpers - extracted from the mocked modules
// ---------------------------------------------------------------------------

const mockRateLimiterCheck = rateLimiter.check as jest.MockedFunction<typeof rateLimiter.check>;
const mockRateLimiterShouldSkip = rateLimiter.shouldSkip as jest.MockedFunction<typeof rateLimiter.shouldSkip>;
const mockHandleCors = handleCors as jest.MockedFunction<typeof handleCors>;
const mockIsInngestRequest = isInngestRequest as jest.MockedFunction<typeof isInngestRequest>;
const mockGetSession = auth.api.getSession as jest.MockedFunction<typeof auth.api.getSession>;

// ---------------------------------------------------------------------------
// Request factory with proper cookie support
// ---------------------------------------------------------------------------

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
}

function makeRequest(path: string, options: RequestOptions = {}): NextRequest {
  const { method = 'GET', headers = {}, cookies = {} } = options;
  
  // Build all headers
  const allHeaders: Record<string, string> = {
    'x-forwarded-for': '127.0.0.1',
    ...headers,
  };
  
  const url = `http://localhost:3000${path}`;
  const request = new NextRequest(url, { 
    method, 
    headers: allHeaders,
  });
  
  // Manually set cookies on the request object
  Object.entries(cookies).forEach(([name, value]) => {
    request.cookies.set(name, value);
  });
  
  return request;
}

// ---------------------------------------------------------------------------
// Default env backup / restore
// ---------------------------------------------------------------------------

const originalNodeEnv = process.env.NODE_ENV;
const originalDevUserName = process.env.NEXT_PUBLIC_DEV_USER_NAME;

afterEach(() => {
  Object.defineProperty(process.env, 'NODE_ENV', { value: originalNodeEnv, writable: true });
  process.env.NEXT_PUBLIC_DEV_USER_NAME = originalDevUserName;
});

// ---------------------------------------------------------------------------
// beforeEach — reset all mocks to safe defaults
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();

  // Rate limiter: skip = false, check = allowed
  mockRateLimiterShouldSkip.mockReturnValue(false);
  mockRateLimiterCheck.mockReturnValue({
    allowed: true,
    remaining: 59,
    resetTime: Date.now() + 60_000,
  });

  // CORS: non-OPTIONS by default → null
  mockHandleCors.mockReturnValue(null);

  // Inngest: not an Inngest request
  mockIsInngestRequest.mockReturnValue(false);

  // Auth: no session
  mockGetSession.mockResolvedValue(null);

  // Default to production so dev bypass is off
  Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true });
  delete process.env.NEXT_PUBLIC_DEV_USER_NAME;
});

// ---------------------------------------------------------------------------
// Protected routes — no session cookie
// ---------------------------------------------------------------------------

describe('Protected routes — no session cookie', () => {
  it('returns 401 with AUTHENTICATION_ERROR when no cookie is present', async () => {
    const request = makeRequest('/api/leads'); // no cookies
    const response = await middleware(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.code).toBe('AUTHENTICATION_ERROR');
  });
});

// ---------------------------------------------------------------------------
// Protected routes — with session cookie
// ---------------------------------------------------------------------------

describe('Protected routes — with session cookie', () => {
  it('proceeds when session cookie is present and getSession returns a user', async () => {
    mockGetSession.mockResolvedValue({
      user: { id: '1', name: 'Alice', email: 'alice@example.com', role: 'user' } as any,
      session: {} as any,
    });

    const request = makeRequest('/api/leads', {
      cookies: { 'better-auth.session_token': 'tok' },
    });
    const response = await middleware(request);

    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(403);
  });
});

// ---------------------------------------------------------------------------
// Admin routes — non-admin user
// ---------------------------------------------------------------------------

describe('Admin routes — non-admin user', () => {
  it('returns 403 with INSUFFICIENT_PERMISSIONS for a user without admin role', async () => {
    mockGetSession.mockResolvedValue({
      user: { id: '2', name: 'Bob', email: 'bob@example.com', role: 'user' } as any,
      session: {} as any,
    });

    const request = makeRequest('/api/users', {
      cookies: { 'better-auth.session_token': 'tok' },
    });
    const response = await middleware(request);

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.code).toBe('INSUFFICIENT_PERMISSIONS');
  });
});

// ---------------------------------------------------------------------------
// Admin routes — admin user
// ---------------------------------------------------------------------------

describe('Admin routes — admin user', () => {
  it('proceeds when the session user has the admin role', async () => {
    mockGetSession.mockResolvedValue({
      user: { id: '3', name: 'Carol', email: 'carol@example.com', role: 'admin' } as any,
      session: {} as any,
    });

    const request = makeRequest('/api/users', {
      cookies: { 'better-auth.session_token': 'tok' },
    });
    const response = await middleware(request);

    expect(response.status).not.toBe(403);
    expect(response.status).not.toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Dev bypass — session check is skipped
// ---------------------------------------------------------------------------

describe('Dev bypass — session check skipped', () => {
  beforeEach(() => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });
    process.env.NEXT_PUBLIC_DEV_USER_NAME = 'Dev';
  });

  it('proceeds on a protected route without a session cookie', async () => {
    const request = makeRequest('/api/leads'); // no cookie
    const response = await middleware(request);

    expect(response.status).not.toBe(401);
    // getSession should NOT be called — auth is bypassed
    expect(mockGetSession).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Dev bypass — rate limiting is NOT skipped
// ---------------------------------------------------------------------------

describe('Dev bypass — rate limiting NOT skipped', () => {
  beforeEach(() => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });
    process.env.NEXT_PUBLIC_DEV_USER_NAME = 'Dev';
  });

  it('returns 429 when rate limit is exceeded even in dev mode', async () => {
    mockRateLimiterCheck.mockReturnValue({ allowed: false, remaining: 0, resetTime: Date.now() + 60_000 });

    const request = makeRequest('/api/leads');
    const response = await middleware(request);

    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.code).toBe('RATE_LIMIT_EXCEEDED');
  });
});

// ---------------------------------------------------------------------------
// Dev bypass — CORS is NOT skipped
// ---------------------------------------------------------------------------

describe('Dev bypass — CORS NOT skipped', () => {
  beforeEach(() => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });
    process.env.NEXT_PUBLIC_DEV_USER_NAME = 'Dev';
  });

  it('handleCors is still called for OPTIONS requests in dev mode', async () => {
    mockHandleCors.mockReturnValue(new NextResponse(null, { status: 204 }));

    const request = makeRequest('/api/leads', { method: 'OPTIONS' });
    await middleware(request);

    expect(mockHandleCors).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Public routes
// ---------------------------------------------------------------------------

describe('Public routes', () => {
  it('GET /api/health proceeds without auth check', async () => {
    const request = makeRequest('/api/health');
    const response = await middleware(request);

    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(403);
    // rateLimiter.check must NOT be called for the health route
    expect(mockRateLimiterCheck).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

describe('Rate limiting', () => {
  it('returns 429 with X-RateLimit-* headers when check returns allowed: false', async () => {
    const resetTime = Date.now() + 60_000;
    mockRateLimiterCheck.mockReturnValue({ allowed: false, remaining: 0, resetTime });

    const request = makeRequest('/api/leads', { 
      cookies: { 'better-auth.session_token': 'tok' } 
    });
    const response = await middleware(request);

    expect(response.status).toBe(429);
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(response.headers.get('X-RateLimit-Reset')).toBe(String(resetTime));
    const body = await response.json();
    expect(body.code).toBe('RATE_LIMIT_EXCEEDED');
  });
});

// ---------------------------------------------------------------------------
// Rate limit headers on allowed requests
// ---------------------------------------------------------------------------

describe('Rate limit headers on allowed requests', () => {
  it('response includes X-RateLimit-Remaining when request is allowed', async () => {
    mockRateLimiterCheck.mockReturnValue({ allowed: true, remaining: 45, resetTime: Date.now() + 60_000 });
    mockGetSession.mockResolvedValue({
      user: { id: '1', name: 'Alice', email: 'alice@example.com', role: 'user' } as any,
      session: {} as any,
    });

    const request = makeRequest('/api/leads', { 
      cookies: { 'better-auth.session_token': 'tok' } 
    });
    const response = await middleware(request);

    expect(response.headers.get('X-RateLimit-Remaining')).toBe('45');
  });
});

// ---------------------------------------------------------------------------
// Inngest route
// ---------------------------------------------------------------------------

describe('Inngest route', () => {
  it('returns 401 when isInngestRequest returns false', async () => {
    mockIsInngestRequest.mockReturnValue(false);

    // /api/inngest/foo is NOT in publicRoutes (only /api/inngest is)
    // So it will reach the protected routes section and trigger Inngest check
    const request = makeRequest('/api/inngest/foo', { method: 'POST' });
    const response = await middleware(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.code).toBe('AUTHENTICATION_ERROR');
  });

  it('proceeds when isInngestRequest returns true', async () => {
    mockIsInngestRequest.mockReturnValue(true);

    const request = makeRequest('/api/inngest/foo', { method: 'POST' });
    const response = await middleware(request);

    expect(response.status).not.toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Security headers
// ---------------------------------------------------------------------------

describe('Security headers', () => {
  it('response includes X-Content-Type-Options, X-Frame-Options, X-XSS-Protection', async () => {
    mockGetSession.mockResolvedValue({
      user: { id: '99', name: 'Sec', email: 'sec@example.com', role: 'user' } as any,
      session: {} as any,
    });

    const request = makeRequest('/api/leads', { 
      cookies: { 'better-auth.session_token': 'tok' } 
    });
    const response = await middleware(request);

    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
  });
});

// ---------------------------------------------------------------------------
// CSP — production (no unsafe-eval)
// ---------------------------------------------------------------------------

describe('CSP — production', () => {
  beforeEach(() => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true });
  });

  it("script-src does NOT contain 'unsafe-eval' in production", async () => {
    mockGetSession.mockResolvedValue({
      user: { id: '1', name: 'Alice', email: 'alice@example.com', role: 'user' } as any,
      session: {} as any,
    });

    const request = makeRequest('/api/leads', { 
      cookies: { 'better-auth.session_token': 'tok' } 
    });
    const response = await middleware(request);

    const csp = response.headers.get('Content-Security-Policy') ?? '';
    expect(csp).not.toContain("'unsafe-eval'");
  });
});

// ---------------------------------------------------------------------------
// CSP — development (includes unsafe-eval)
// ---------------------------------------------------------------------------

describe('CSP — development', () => {
  beforeEach(() => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });
    process.env.NEXT_PUBLIC_DEV_USER_NAME = 'Dev';
  });

  it("script-src contains 'unsafe-eval' in development", async () => {
    const request = makeRequest('/api/leads'); // dev bypass → no cookie needed
    const response = await middleware(request);

    const csp = response.headers.get('Content-Security-Policy') ?? '';
    expect(csp).toContain("'unsafe-eval'");
  });
});