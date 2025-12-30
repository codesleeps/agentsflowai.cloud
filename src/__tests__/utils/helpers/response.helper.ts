import { NextResponse } from "next/server";

export const expectSuccessResponse = (
  response: NextResponse,
  expectedStatus: number = 200,
) => {
  expect(response.status).toBe(expectedStatus);
  expect(response.status).toBeGreaterThanOrEqual(200);
  expect(response.status).toBeLessThan(300);
};

export const expectErrorResponse = (
  response: NextResponse,
  expectedStatus: number = 400,
) => {
  expect(response.status).toBe(expectedStatus);
  expect(response.status).toBeGreaterThanOrEqual(400);
};

export const expectValidationError = async (response: NextResponse) => {
  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body).toHaveProperty("error");
  expect(body.error).toHaveProperty("issues");
};

export const expectAuthError = (response: NextResponse) => {
  expect(response.status).toBe(401);
};

export const parseJsonResponse = async (response: NextResponse) => {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON response: ${text}`);
  }
};

export const expectJsonResponse = async (
  response: NextResponse,
  expectedData: any,
  expectedStatus: number = 200,
) => {
  expect(response.status).toBe(expectedStatus);
  expect(response.headers.get("content-type")).toContain("application/json");

  const data = await parseJsonResponse(response);
  expect(data).toEqual(expectedData);
};

export const expectResponseHeaders = (
  response: NextResponse,
  expectedHeaders: Record<string, string>,
) => {
  Object.entries(expectedHeaders).forEach(([key, value]) => {
    expect(response.headers.get(key)).toBe(value);
  });
};
