/**
 * IMPORTANT — Edge Runtime Limitation
 * ====================================
 * Next.js middleware runs in the **Edge Runtime**: each incoming request may
 * be handled in a fresh V8 isolate, which means this in-memory `Map` is
 * reset on every request and never persists across requests in production
 * (or across multiple workers in any environment).
 *
 * Consequences:
 *  1. The rate-limit window is effectively per-request; no real enforcement
 *     occurs when more than one isolate is active.
 *  2. The `setInterval` / `cleanupInterval` that was previously defined in
 *     the constructor never fires in Edge Runtime and leaked a timer handle
 *     in Node.js environments — it has been removed.
 *
 * For production multi-worker deployments, replace this implementation with
 * an Edge-compatible sliding-window store, for example:
 *
 *   import { Ratelimit } from '@upstash/ratelimit';
 *   import { Redis }     from '@upstash/redis';
 *
 *   const ratelimit = new Ratelimit({
 *     redis: Redis.fromEnv(),
 *     limiter: Ratelimit.slidingWindow(60, '1 m'),
 *   });
 *
 * The current implementation is safe only for single-process local
 * development where a single long-lived Node.js process handles all requests.
 */

import { NextRequest } from 'next/server';

interface RateLimitEntry {
  requests: number[];
  lastCleanup: number;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

class RateLimiter {
  private storage = new Map<string, RateLimitEntry>();

  private getConfig(request: NextRequest): RateLimitConfig {
    const path = request.nextUrl.pathname;

    // Different limits for different route groups
    if (path.includes('/api/ai/')) {
      return { windowMs: 60000, maxRequests: 20 }; // 20 requests per minute for AI routes
    } else if (['POST', 'PATCH', 'DELETE'].includes(request.method)) {
      return { windowMs: 60000, maxRequests: 60 }; // 60 requests per minute for mutations
    } else {
      return { windowMs: 60000, maxRequests: 120 }; // 120 requests per minute for reads
    }
  }

  private getKey(request: NextRequest): string {
    const userId = request.headers.get('X-User-Id');
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    return userId || ip;
  }

  check(request: NextRequest): { allowed: boolean; remaining: number; resetTime: number } {
    const config = this.getConfig(request);
    const key = this.getKey(request);
    const now = Date.now();

    let entry = this.storage.get(key);

    if (!entry) {
      entry = {
        requests: [],
        lastCleanup: now
      };
      this.storage.set(key, entry);
    }

    // Remove requests outside the current window
    const windowStart = now - config.windowMs;
    entry.requests = entry.requests.filter(timestamp => timestamp > windowStart);
    entry.lastCleanup = now;

    const currentRequests = entry.requests.length;

    if (currentRequests >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: Math.min(...entry.requests) + config.windowMs
      };
    }

    // Add current request
    entry.requests.push(now);

    return {
      allowed: true,
      remaining: config.maxRequests - currentRequests - 1,
      resetTime: now + config.windowMs
    };
  }

  // Skip rate limiting for specific paths
  shouldSkip(request: NextRequest): boolean {
    const path = request.nextUrl.pathname;
    return path === '/api/health' || path === '/api/inngest';
  }
}

export const rateLimiter = new RateLimiter();
