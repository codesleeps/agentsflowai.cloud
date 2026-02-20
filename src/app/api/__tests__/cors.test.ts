/**
 * Unit tests for CORS utilities
 *
 * Tests:
 * - getCorsConfig() for development and production environments
 * - handleCors() response headers for allowed/disallowed origins
 * - isOriginAllowed() helper
 */

// Mocks must be declared before imports.
jest.mock('../../../../src/lib/env-validation', () => ({
  getEnv: jest.fn(),
  validateEnv: jest.fn(),
}));

// Prevent transitive imports in env-validation from calling real startup logic.
jest.mock('../../../../src/lib/startup-validation', () => ({
  validateProviderKeys: jest.fn().mockResolvedValue(undefined),
  getProviderStatus: jest.fn().mockReturnValue(null),
  getAllProviderStatuses: jest.fn().mockReturnValue([]),
}));

import { NextRequest } from 'next/server';
import { handleCors, isOriginAllowed, getCorsConfig } from '../../../../src/lib/cors';
import { getEnv } from '../../../../src/lib/env-validation';

// ---------------------------------------------------------------------------
// Typed mock helper
// ---------------------------------------------------------------------------

const mockGetEnv = getEnv as jest.MockedFunction<typeof getEnv>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeOptionsRequest(origin: string): NextRequest {
  return new NextRequest('http://localhost:3000/api/test', {
    method: 'OPTIONS',
    headers: { origin },
  });
}

function makeGetRequest(origin?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (origin) {
    headers['origin'] = origin;
  }
  return new NextRequest('http://localhost:3000/api/test', { method: 'GET', headers });
}

// ---------------------------------------------------------------------------
// beforeEach — default to production env
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();

  mockGetEnv.mockReturnValue({
    NODE_ENV: 'production',
    NEXT_PUBLIC_APP_URL: 'https://agentsflowai.cloud',
  } as any);
});

// ---------------------------------------------------------------------------
// getCorsConfig — development
// ---------------------------------------------------------------------------

describe('getCorsConfig — development', () => {
  beforeEach(() => {
    mockGetEnv.mockReturnValue({
      NODE_ENV: 'development',
      NEXT_PUBLIC_APP_URL: 'https://agentsflowai.cloud',
    } as any);
  });

  it('allowedOrigins includes http://localhost:3000', () => {
    const config = getCorsConfig();
    expect(config.allowedOrigins).toContain('http://localhost:3000');
  });

  it('allowedOrigins includes http://127.0.0.1:3000', () => {
    const config = getCorsConfig();
    expect(config.allowedOrigins).toContain('http://127.0.0.1:3000');
  });

  it('allowedOrigins does NOT include the production URL', () => {
    const config = getCorsConfig();
    expect(config.allowedOrigins).not.toContain('https://agentsflowai.cloud');
  });
});

// ---------------------------------------------------------------------------
// getCorsConfig — production
// ---------------------------------------------------------------------------

describe('getCorsConfig — production', () => {
  it('allowedOrigins is exactly [https://agentsflowai.cloud]', () => {
    const config = getCorsConfig();
    expect(config.allowedOrigins).toEqual(['https://agentsflowai.cloud']);
  });
});

// ---------------------------------------------------------------------------
// getCorsConfig — production with no APP_URL
// ---------------------------------------------------------------------------

describe('getCorsConfig — production, no APP_URL', () => {
  beforeEach(() => {
    mockGetEnv.mockReturnValue({
      NODE_ENV: 'production',
      NEXT_PUBLIC_APP_URL: undefined,
    } as any);
  });

  it('allowedOrigins is an empty array when NEXT_PUBLIC_APP_URL is undefined', () => {
    const config = getCorsConfig();
    expect(config.allowedOrigins).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getCorsConfig — allowed methods
// ---------------------------------------------------------------------------

describe('getCorsConfig — allowed methods', () => {
  it.each(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'])(
    'allowedMethods includes %s',
    (method) => {
      const config = getCorsConfig();
      expect(config.allowedMethods).toContain(method);
    },
  );
});

// ---------------------------------------------------------------------------
// handleCors — allowed origin
// ---------------------------------------------------------------------------

describe('handleCors — allowed origin', () => {
  const ALLOWED_ORIGIN = 'https://agentsflowai.cloud';

  it('returns a response with Access-Control-Allow-Origin set to the request origin', () => {
    const request = makeOptionsRequest(ALLOWED_ORIGIN);
    const response = handleCors(request);

    expect(response).not.toBeNull();
    expect(response!.headers.get('Access-Control-Allow-Origin')).toBe(ALLOWED_ORIGIN);
  });

  it('sets Access-Control-Allow-Credentials to true', () => {
    const request = makeOptionsRequest(ALLOWED_ORIGIN);
    const response = handleCors(request);

    expect(response!.headers.get('Access-Control-Allow-Credentials')).toBe('true');
  });

  it('sets Access-Control-Max-Age to 86400', () => {
    const request = makeOptionsRequest(ALLOWED_ORIGIN);
    const response = handleCors(request);

    expect(response!.headers.get('Access-Control-Max-Age')).toBe('86400');
  });
});

// ---------------------------------------------------------------------------
// handleCors — disallowed origin
// ---------------------------------------------------------------------------

describe('handleCors — disallowed origin', () => {
  it('returns null for an origin not in the allowed list', () => {
    const request = makeOptionsRequest('https://evil.com');
    const response = handleCors(request);

    expect(response).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// handleCors — no origin header
// ---------------------------------------------------------------------------

describe('handleCors — no origin header', () => {
  it('returns null when the request has no origin header', () => {
    const request = makeGetRequest(); // no origin
    const response = handleCors(request);

    expect(response).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// handleCors — exposed headers
// ---------------------------------------------------------------------------

describe('handleCors — exposed headers', () => {
  it('Access-Control-Expose-Headers contains X-RateLimit-Limit', () => {
    const request = makeOptionsRequest('https://agentsflowai.cloud');
    const response = handleCors(request);

    const exposed = response!.headers.get('Access-Control-Expose-Headers') ?? '';
    expect(exposed).toContain('X-RateLimit-Limit');
  });
});

// ---------------------------------------------------------------------------
// handleCors — allowed methods header
// ---------------------------------------------------------------------------

describe('handleCors — allowed methods header', () => {
  it('Access-Control-Allow-Methods contains PUT', () => {
    const request = makeOptionsRequest('https://agentsflowai.cloud');
    const response = handleCors(request);

    const methods = response!.headers.get('Access-Control-Allow-Methods') ?? '';
    expect(methods).toContain('PUT');
  });
});

// ---------------------------------------------------------------------------
// isOriginAllowed
// ---------------------------------------------------------------------------

describe('isOriginAllowed', () => {
  it('returns true for an allowed origin', () => {
    expect(isOriginAllowed('https://agentsflowai.cloud')).toBe(true);
  });

  it('returns false for a disallowed origin', () => {
    expect(isOriginAllowed('https://evil.com')).toBe(false);
  });

  it('returns false for null', () => {
    expect(isOriginAllowed(null)).toBe(false);
  });
});
