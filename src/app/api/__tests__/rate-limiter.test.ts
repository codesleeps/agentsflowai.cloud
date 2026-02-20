/**
 * Unit tests for RateLimiter
 *
 * Tests the in-memory sliding-window rate limiter for:
 * - Per-route limits (AI, mutations, reads)
 * - Sliding-window eviction with fake timers
 * - shouldSkip path logic
 * - Key resolution (X-User-Id vs x-forwarded-for)
 * - Remaining counter accuracy
 */

import { NextRequest } from 'next/server';
import { rateLimiter } from '../../../../src/lib/rate-limiter';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function makeRequest(path: string, method = 'GET', ip = '1.2.3.4', userId?: string): NextRequest {
  const headers: Record<string, string> = { 'x-forwarded-for': ip };
  if (userId) {
    headers['X-User-Id'] = userId;
  }
  return new NextRequest(`http://localhost:3000${path}`, { method, headers });
}

// ---------------------------------------------------------------------------
// Timer setup — fake timers let us control Date.now() precisely
// ---------------------------------------------------------------------------

beforeAll(() => {
  jest.useFakeTimers();
});

afterAll(() => {
  jest.useRealTimers();
});

// ---------------------------------------------------------------------------
// Per-route limits — AI routes (20 req / 60 s)
// ---------------------------------------------------------------------------

describe('Per-route limits — AI routes', () => {
  const IP = '10.0.0.1';
  const PATH = '/api/ai/chat';

  it('allows exactly 20 requests', () => {
    for (let i = 0; i < 20; i++) {
      const result = rateLimiter.check(makeRequest(PATH, 'GET', IP));
      expect(result.allowed).toBe(true);
    }
  });

  it('blocks the 21st request', () => {
    const result = rateLimiter.check(makeRequest(PATH, 'GET', IP));
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('resetTime is approximately 60 s in the future', () => {
    const result = rateLimiter.check(makeRequest(PATH, 'GET', IP));
    expect(result.resetTime).toBeGreaterThan(Date.now());
    // Should be within the 60 s window
    expect(result.resetTime).toBeLessThanOrEqual(Date.now() + 60_000 + 1);
  });
});

// ---------------------------------------------------------------------------
// Per-route limits — mutation routes (POST/PATCH/DELETE, 60 req / 60 s)
// ---------------------------------------------------------------------------

describe('Per-route limits — mutations', () => {
  const IP = '10.0.1.1';
  const PATH = '/api/leads';

  it('allows exactly 60 POST requests', () => {
    for (let i = 0; i < 60; i++) {
      const result = rateLimiter.check(makeRequest(PATH, 'POST', IP));
      expect(result.allowed).toBe(true);
    }
  });

  it('blocks the 61st POST request', () => {
    const result = rateLimiter.check(makeRequest(PATH, 'POST', IP));
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('PATCH is also subject to mutation limits', () => {
    const patchIp = '10.0.1.2';
    for (let i = 0; i < 60; i++) {
      rateLimiter.check(makeRequest(PATH, 'PATCH', patchIp));
    }
    const result = rateLimiter.check(makeRequest(PATH, 'PATCH', patchIp));
    expect(result.allowed).toBe(false);
  });

  it('DELETE is also subject to mutation limits', () => {
    const deleteIp = '10.0.1.3';
    for (let i = 0; i < 60; i++) {
      rateLimiter.check(makeRequest(PATH, 'DELETE', deleteIp));
    }
    const result = rateLimiter.check(makeRequest(PATH, 'DELETE', deleteIp));
    expect(result.allowed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Per-route limits — read routes (GET, 120 req / 60 s)
// ---------------------------------------------------------------------------

describe('Per-route limits — reads', () => {
  const IP = '10.0.2.1';
  const PATH = '/api/leads';

  it('allows exactly 120 GET requests', () => {
    for (let i = 0; i < 120; i++) {
      const result = rateLimiter.check(makeRequest(PATH, 'GET', IP));
      expect(result.allowed).toBe(true);
    }
  });

  it('blocks the 121st GET request', () => {
    const result = rateLimiter.check(makeRequest(PATH, 'GET', IP));
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Sliding window — old timestamps are evicted after the window expires
// ---------------------------------------------------------------------------

describe('Sliding window', () => {
  const IP = '10.0.3.1';
  const PATH = '/api/ai/test';

  it('allows new requests after the window slides past old ones', () => {
    // Fill to the AI limit (20)
    for (let i = 0; i < 20; i++) {
      rateLimiter.check(makeRequest(PATH, 'GET', IP));
    }

    // Confirm limit is hit
    expect(rateLimiter.check(makeRequest(PATH, 'GET', IP)).allowed).toBe(false);

    // Advance fake clock by 61 s — all prior timestamps fall outside the window
    jest.advanceTimersByTime(61_000);

    // The next request should now be allowed
    const result = rateLimiter.check(makeRequest(PATH, 'GET', IP));
    expect(result.allowed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// shouldSkip — path exemptions
// ---------------------------------------------------------------------------

describe('shouldSkip', () => {
  it('returns true for /api/health', () => {
    expect(rateLimiter.shouldSkip(makeRequest('/api/health'))).toBe(true);
  });

  it('returns true for /api/inngest', () => {
    expect(rateLimiter.shouldSkip(makeRequest('/api/inngest'))).toBe(true);
  });

  it('returns false for /api/leads', () => {
    expect(rateLimiter.shouldSkip(makeRequest('/api/leads'))).toBe(false);
  });

  it('returns false for /api/ai/chat', () => {
    expect(rateLimiter.shouldSkip(makeRequest('/api/ai/chat'))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Key resolution — X-User-Id takes precedence over IP
// ---------------------------------------------------------------------------

describe('Key resolution', () => {
  const USER_ID = 'user-shared-abc';
  const PATH = '/api/leads';

  it('two different IPs sharing the same X-User-Id share a bucket', () => {
    const ipA = '10.1.0.1';
    const ipB = '10.1.0.2';

    // Burn 59 requests from IP A with the shared user ID
    for (let i = 0; i < 59; i++) {
      rateLimiter.check(makeRequest(PATH, 'POST', ipA, USER_ID));
    }

    // The 60th from IP B with the same user ID should still be allowed (bucket not exhausted)
    const sixtiethResult = rateLimiter.check(makeRequest(PATH, 'POST', ipB, USER_ID));
    expect(sixtiethResult.allowed).toBe(true);

    // The 61st (from either IP) should be blocked
    const sixtyfirstResult = rateLimiter.check(makeRequest(PATH, 'POST', ipB, USER_ID));
    expect(sixtyfirstResult.allowed).toBe(false);
  });

  it('without X-User-Id, uses x-forwarded-for as key (independent buckets)', () => {
    const ipC = '10.1.1.1';
    const ipD = '10.1.1.2';

    // Fill bucket for IP C
    for (let i = 0; i < 120; i++) {
      rateLimiter.check(makeRequest(PATH, 'GET', ipC));
    }
    expect(rateLimiter.check(makeRequest(PATH, 'GET', ipC)).allowed).toBe(false);

    // IP D should have its own independent bucket, still allowed
    expect(rateLimiter.check(makeRequest(PATH, 'GET', ipD)).allowed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// remaining counter accuracy
// ---------------------------------------------------------------------------

describe('remaining counter', () => {
  const PATH = '/api/leads';

  it('remaining equals maxRequests - N - 1 after N GET requests', () => {
    const IP = '10.2.0.1';
    const maxRequests = 120;

    for (let n = 0; n < 10; n++) {
      const result = rateLimiter.check(makeRequest(PATH, 'GET', IP));
      // After N+1 requests (0-indexed), remaining = maxRequests - (N+1)
      expect(result.remaining).toBe(maxRequests - (n + 1));
    }
  });

  it('remaining equals maxRequests - N - 1 after N POST requests', () => {
    const IP = '10.2.0.2';
    const maxRequests = 60;

    for (let n = 0; n < 5; n++) {
      const result = rateLimiter.check(makeRequest(PATH, 'POST', IP));
      expect(result.remaining).toBe(maxRequests - (n + 1));
    }
  });
});
