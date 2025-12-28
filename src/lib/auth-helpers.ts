import { NextRequest } from "next/server";
import { getEnv } from "./env-validation";
import { auth } from "@/lib/auth";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  image?: string;
  role?: string;
}

export interface AuthResult {
  authenticated: boolean;
  user?: AuthenticatedUser;
  error?: string;
}

/**
 * Extract and verify session from request headers
 */
export async function getServerSessionFromRequest(
  request: NextRequest,
): Promise<AuthResult> {
  const env = getEnv();

  try {
    // Check for real session first
    const sessionCallback = await auth.api.getSession({
      headers: request.headers
    });

    if (sessionCallback?.user) {
      return {
        authenticated: true,
        user: {
          id: sessionCallback.user.id,
          name: sessionCallback.user.name,
          email: sessionCallback.user.email,
          image: sessionCallback.user.image || undefined,
          role: (sessionCallback.user as any).role,
        },
      };
    }

    // Check for development mode bypass (only if no real session)
    if (
      env.NODE_ENV === "development" &&
      env.NEXT_PUBLIC_DEV_USER_NAME &&
      env.NEXT_PUBLIC_DEV_USER_EMAIL
    ) {
      return {
        authenticated: true,
        user: {
          id: "dev-user",
          name: env.NEXT_PUBLIC_DEV_USER_NAME,
          email: env.NEXT_PUBLIC_DEV_USER_EMAIL,
          image: env.NEXT_PUBLIC_DEV_USER_IMAGE,
          role: "admin", // Assume admin for dev user
        },
      };
    }

    return {
      authenticated: false,
      error: "No session found",
    };
  } catch (error) {
    console.error("Session verification failed:", error);
    return {
      authenticated: false,
      error: "Session verification failed",
    };
  }
}

/**
 * Require authentication for API routes
 */
export async function requireAuth(
  request: NextRequest,
): Promise<AuthenticatedUser> {
  const authResult = await getServerSessionFromRequest(request);

  if (!authResult.authenticated || !authResult.user) {
    throw new Error(authResult.error || "Authentication required");
  }

  return authResult.user;
}

/**
 * Get user from request, returns null if not authenticated
 */
export async function getUserFromRequest(
  request: NextRequest,
): Promise<AuthenticatedUser | null> {
  const authResult = await getServerSessionFromRequest(request);
  return authResult.authenticated ? authResult.user || null : null;
}

/**
 * Check if request is from Inngest (for webhook routes)
 */
export function isInngestRequest(request: NextRequest): boolean {
  const env = getEnv();
  const inngestKey = request.headers.get("x-inngest-signature");

  if (!inngestKey || !env.INNGEST_SIGNING_KEY) {
    return false;
  }

  // Basic signature verification (Inngest would have more sophisticated verification)
  return inngestKey === env.INNGEST_SIGNING_KEY;
}

/**
 * Require specific role for API routes
 */
export async function requireRole(
  request: NextRequest,
  allowedRoles: string[]
): Promise<AuthenticatedUser> {
  const user = await requireAuth(request);
  // Allow admin to access everything if not explicitly forbidden? 
  // Or just strict check.
  // We'll do strict check, but assuming 'admin' should probably have access.
  if (!user.role || !allowedRoles.includes(user.role)) {
    // If user is admin, allow? (Optional policy, but common)
    if (user.role === 'admin') return user;

    throw new Error("Insufficient permissions");
  }

  return user;
}
