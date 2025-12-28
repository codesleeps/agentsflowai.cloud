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
  private cleanupInterval: NodeJS.Timeout;
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.cleanupInterval = setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL);
  }

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

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.storage.entries()) {
      // Remove old entries that haven't been accessed recently
      if (now - entry.lastCleanup > 30 * 60 * 1000) { // 30 minutes
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.storage.delete(key));
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