import { NextRequest, NextResponse } from "next/server";

// Mock NextRequest creation
export const mockNextRequest = (
  url = "http://localhost:3000/api/test",
  options: Partial<NextRequest> = {},
): NextRequest => {
  const request = new NextRequest(url, {
    method: "GET",
    headers: new Headers(),
    ...options,
  });
  return request as NextRequest;
};

// Mock NextResponse creation
export const mockNextResponse = (
  body?: any,
  options: ResponseInit = {},
): NextResponse => {
  const response = NextResponse.json(body || {}, options);
  return response;
};

// Mock headers function
export const mockHeaders = (headers: Record<string, string> = {}) => {
  const mockHeaders = new Map(Object.entries(headers));
  jest.doMock("next/headers", () => ({
    headers: jest.fn().mockReturnValue(mockHeaders),
  }));
  return mockHeaders;
};

// Mock cookies function
export const mockCookies = (cookies: Record<string, string> = {}) => {
  const mockCookies = {
    get: jest.fn((name: string) => ({ name, value: cookies[name] || "" })),
    getAll: jest.fn(() =>
      Object.entries(cookies).map(([name, value]) => ({ name, value })),
    ),
    set: jest.fn(),
    delete: jest.fn(),
  };
  jest.doMock("next/headers", () => ({
    cookies: jest.fn().mockReturnValue(mockCookies),
  }));
  return mockCookies;
};

// Mock search params
export const mockSearchParams = (params: Record<string, string> = {}) => {
  const searchParams = new URLSearchParams(params);
  return searchParams;
};

// Helper to create authenticated request
export const createRequestWithAuth = (
  url = "http://localhost:3000/api/test",
  userId = "user-123",
  options: Partial<NextRequest> = {},
): NextRequest => {
  const headers = new Headers(options.headers);
  headers.set("x-user-id", userId);

  return mockNextRequest(url, {
    ...options,
    headers,
  });
};

// Helper to create request with JSON body
export const createRequestWithJsonBody = (
  url: string,
  body: any,
  method = "POST",
): NextRequest => {
  return mockNextRequest(url, {
    method,
    headers: new Headers({ "content-type": "application/json" }),
    body: JSON.stringify(body),
  });
};

// Helper to create request with query parameters
export const createRequestWithQuery = (
  baseUrl: string,
  params: Record<string, string>,
): NextRequest => {
  const url = new URL(baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return mockNextRequest(url.toString());
};
