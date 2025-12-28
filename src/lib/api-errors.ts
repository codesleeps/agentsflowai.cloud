import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export class ValidationError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = 'Access denied') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends Error {
  constructor(message: string = 'Rate limit exceeded') {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class ExternalServiceError extends Error {
  constructor(message: string, public service: string, public statusCode?: number) {
    super(message);
    this.name = 'ExternalServiceError';
  }
}

export interface ErrorResponse {
  error: string;
  code: string;
  details?: any;
}

export function handleApiError(error: Error): NextResponse {
  const env = process.env.NODE_ENV;

  let statusCode = 500;
  let errorCode = 'INTERNAL_ERROR';
  let message = 'An unexpected error occurred';
  let details: any = undefined;

  if (error instanceof ValidationError) {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = error.message;
    details = error.details;
  } else if (error instanceof ZodError) {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = error.errors;
  } else if (error instanceof AuthenticationError) {
    statusCode = 401;
    errorCode = 'AUTHENTICATION_ERROR';
    message = error.message;
  } else if (error instanceof AuthorizationError) {
    statusCode = 403;
    errorCode = 'AUTHORIZATION_ERROR';
    message = error.message;
  } else if (error instanceof NotFoundError) {
    statusCode = 404;
    errorCode = 'NOT_FOUND';
    message = error.message;
  } else if (error instanceof RateLimitError) {
    statusCode = 429;
    errorCode = 'RATE_LIMIT_EXCEEDED';
    message = error.message;
  } else if (error instanceof ExternalServiceError) {
    statusCode = error.statusCode || 502;
    errorCode = 'EXTERNAL_SERVICE_ERROR';
    message = env === 'production'
      ? `Service ${error.service} is temporarily unavailable`
      : error.message;
    details = { service: error.service };
  } else {
    // Log full error details server-side
    console.error('API Error:', error);
  }

  // Never expose internal error details in production
  if (env === 'production' && details && typeof details === 'object') {
    details = { message: 'Please contact support if this persists' };
  }

  const response: ErrorResponse = {
    error: message,
    code: errorCode,
    details
  };

  return NextResponse.json(response, { status: statusCode });
}

export function createSuccessResponse<T>(data: T, message?: string): NextResponse {
  const response = {
    success: true,
    message,
    data
  };

  return NextResponse.json(response, { status: 200 });
}