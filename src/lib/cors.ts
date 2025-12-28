import { NextRequest, NextResponse } from 'next/server';
import { getEnv } from './env-validation';

export interface CorsConfig {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  credentials: boolean;
  maxAge: number;
}

export function getCorsConfig(): CorsConfig {
  const env = getEnv();
  
  // Determine allowed origins based on environment
  let allowedOrigins: string[];
  
  if (env.NODE_ENV === 'development') {
    // Allow localhost with any port in development
    allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
  } else {
    // In production, only allow configured domain
    allowedOrigins = env.NEXT_PUBLIC_APP_URL ? [env.NEXT_PUBLIC_APP_URL] : [];
  }

  return {
    allowedOrigins,
    allowedMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id', 'X-Inngest-Signature'],
    exposedHeaders: ['X-Request-Id', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    credentials: true,
    maxAge: 86400, // 24 hours
  };
}

export function handleCors(request: NextRequest): NextResponse | null {
  const config = getCorsConfig();
  const origin = request.headers.get('origin');
  
  // Check if origin is allowed
  if (origin && config.allowedOrigins.includes(origin)) {
    const response = new NextResponse();
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', config.allowedMethods.join(', '));
    response.headers.set('Access-Control-Allow-Headers', config.allowedHeaders.join(', '));
    response.headers.set('Access-Control-Expose-Headers', config.exposedHeaders.join(', '));
    response.headers.set('Access-Control-Allow-Credentials', config.credentials.toString());
    response.headers.set('Access-Control-Max-Age', config.maxAge.toString());
    
    return response;
  }
  
  return null;
}

export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  
  const config = getCorsConfig();
  return config.allowedOrigins.includes(origin);
}