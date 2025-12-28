import { NextRequest, NextResponse } from "next/server";
import { hasPermission, canPerform, Permission, UserRole } from "./roles";
import { verifyApiKey, apiKeyHasPermission } from "./api-keys";
import { getServerSessionFromRequest } from "./auth-helpers";

// Extend the AuthenticatedUser interface to include role
export interface AuthenticatedUserWithRole {
  id: string;
  name: string;
  email: string;
  image?: string;
  role?: string;
}

// Check if user has permission
export function requirePermission(
  request: NextRequest,
  permission: Permission,
): { authorized: boolean; user?: AuthenticatedUserWithRole; error?: string } {
  // This is a placeholder - actual implementation would extract user from session
  // For now, returns unauthorized
  return { authorized: false, error: "Permission checking requires session" };
}

// Check if user has any of the required permissions
export function requireAnyPermission(
  request: NextRequest,
  permissions: Permission[],
): { authorized: boolean; user?: AuthenticatedUserWithRole; error?: string } {
  return { authorized: false, error: "Permission checking requires session" };
}

// Check if user has minimum role
export function requireRole(
  request: NextRequest,
  minimumRole: UserRole,
): { authorized: boolean; user?: AuthenticatedUserWithRole; error?: string } {
  return { authorized: false, error: "Role checking requires session" };
}

// Middleware helper to check API key permissions
export async function checkApiKeyPermission(
  request: NextRequest,
  requiredPermission: Permission,
) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      authorized: false,
      error: "Missing or invalid Authorization header",
    };
  }

  const apiKey = authHeader.substring(7); // Remove "Bearer " prefix

  const verifiedKey = await verifyApiKey(apiKey);

  if (!verifiedKey) {
    return { authorized: false, error: "Invalid or expired API key" };
  }

  if (!apiKeyHasPermission(verifiedKey, requiredPermission)) {
    return {
      authorized: false,
      error: `Missing required permission: ${requiredPermission}`,
    };
  }

  return {
    authorized: true,
    user: {
      id: verifiedKey.userId,
      name: verifiedKey.user.name || "API User",
      email: verifiedKey.user.email,
      role: verifiedKey.user.role,
    },
    apiKey: verifiedKey,
  };
}

// Create a response for unauthorized access
export function unauthorizedResponse(message: string = "Unauthorized") {
  return NextResponse.json(
    {
      error: message,
      code: "UNAUTHORIZED",
    },
    { status: 403 },
  );
}

// Create a response for forbidden access
export function forbiddenResponse(message: string = "Forbidden") {
  return NextResponse.json(
    {
      error: message,
      code: "FORBIDDEN",
    },
    { status: 403 },
  );
}

// Helper to wrap API route handlers with permission checks
export function withPermission(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>,
  requiredPermission: Permission,
) {
  return async (request: NextRequest, context?: any) => {
    const authHeader = request.headers.get("authorization");

    // Check for API key first
    if (authHeader?.startsWith("Bearer ")) {
      const result = await checkApiKeyPermission(request, requiredPermission);
      if (!result.authorized) {
        return unauthorizedResponse(result.error);
      }
      // Continue to handler with API key context
    }

    // Otherwise, check session-based auth (placeholder)
    // In production, this would use the actual session
    return handler(request, context);
  };
}

// Higher-order function for role-based access
export function withRole(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>,
  minimumRole: UserRole,
) {
  return async (request: NextRequest, context?: any) => {
    // Placeholder for role-based access control
    // In production, this would use the actual session
    return handler(request, context);
  };
}
