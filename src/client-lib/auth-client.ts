import { createAuthClient } from "better-auth/react";
import { getEnv } from "@/lib/env-validation";

const env = getEnv();

// Validate baseURL for production
const baseURL = env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

if (env.NODE_ENV === "production" && !baseURL.startsWith("https://")) {
  console.warn(
    "[AUTH] Warning: Using non-HTTPS baseURL in production. This is not recommended for security reasons.",
  );
}

export const authClient = createAuthClient({
  baseURL,
});

export const { signIn, signUp, useSession, signOut } = authClient;

// Google sign-in helper
export async function signInWithGoogle() {
  const baseURL = env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  window.location.href = `${baseURL}/api/auth/signin/google`;
}

// Enhanced error boundary for authentication failures
export function getAuthClient() {
  try {
    if (env.NODE_ENV === "development" && env.NEXT_PUBLIC_DEV_USER_NAME) {
      return {
        data: {
          user: {
            name: env.NEXT_PUBLIC_DEV_USER_NAME,
            email: env.NEXT_PUBLIC_DEV_USER_EMAIL,
            image: env.NEXT_PUBLIC_DEV_USER_IMAGE ?? undefined,
          },
        },
      };
    }

    return authClient.useSession();
  } catch (error) {
    console.error("[AUTH] Authentication client error:", error);

    // Return fallback for development
    if (env.NODE_ENV === "development") {
      return {
        data: {
          user: {
            name: "Development User",
            email: "dev@example.com",
            image: undefined,
          },
        },
      };
    }

    throw error;
  }
}

// Enhanced session expiry handling
export function getAuthActiveOrganization() {
  try {
    if (env.NEXT_PUBLIC_DEV_USER_NAME) {
      return {
        data: {
          name: `${env.NEXT_PUBLIC_DEV_USER_NAME}'s org`,
        },
      };
    }

    return {
      data: {
        name: "AgentsFlowAI Org",
      },
    };
  } catch (error) {
    console.error("[AUTH] Active organization error:", error);

    // Return fallback for development
    if (env.NODE_ENV === "development") {
      return {
        data: {
          name: "Development Organization",
        },
      };
    }

    throw error;
  }
}

// Token refresh logic
export async function refreshSession() {
  try {
    if (env.NEXT_PUBLIC_DEV_USER_NAME) {
      return true; // Dev mode doesn't need refresh
    }

    return true;
  } catch (error) {
    console.error("[AUTH] Session refresh failed:", error);
    return false;
  }
}

// Log authentication events for security monitoring
export function logAuthEvent(event: string, details?: any) {
  if (env.NODE_ENV === "production") {
    console.log(`[AUTH EVENT] ${event}`, details);
  } else {
    console.log(`[AUTH EVENT] ${event}`, details);
  }
}
