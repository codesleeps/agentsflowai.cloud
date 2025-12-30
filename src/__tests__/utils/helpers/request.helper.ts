import { NextRequest } from "next/server";
import {
  createRequestWithAuth,
  createRequestWithJsonBody,
  createRequestWithQuery as createMockRequestWithQuery,
} from "../mocks/next";

export const createTestRequest = (
  url: string = "http://localhost:3000/api/test",
  options: Partial<NextRequest> = {},
): NextRequest => {
  return new NextRequest(url, options);
};

export const createAuthenticatedRequest = (
  url: string = "http://localhost:3000/api/test",
  userId: string = "user-123",
  options: Partial<NextRequest> = {},
): NextRequest => {
  // Ensure absolute URL
  const absoluteUrl = url.startsWith("http")
    ? url
    : `http://localhost:3000${url}`;
  return createRequestWithAuth(absoluteUrl, userId, options);
};

export const createRequestWithBody = (
  url: string,
  body: any,
  method: string = "POST",
): NextRequest => {
  return createRequestWithJsonBody(url, body, method);
};

export const createRequestWithQueryParams = (
  baseUrl: string,
  params: Record<string, string>,
): NextRequest => {
  return createMockRequestWithQuery(baseUrl, params);
};

export const addHeaders = (
  request: NextRequest,
  headers: Record<string, string>,
): NextRequest => {
  const newHeaders = new Headers(request.headers);
  Object.entries(headers).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });

  return new NextRequest(request.url, {
    method: request.method,
    headers: newHeaders,
    body: request.body,
  });
};
