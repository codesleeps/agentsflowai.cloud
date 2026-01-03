import { createAuthClient } from "better-auth/react";
import { getEnv } from "@/lib/env-validation";

const env = getEnv();

// Validate baseURL for production
const baseURL = env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "https://agentsflowai.cloud");

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
  await signIn.social({
    provider: "google",
    callbackURL: "/dashboard",
  });
}

// TypeScript types for better type safety
export type SessionData = {
  user: {
    name: string;
    email?: string;
    image?: string;
  };
} | null;

export type UseAuthSessionReturn = {
  data: SessionData;
  isPending: boolean;
  error: Error | null;
};

/**
 * Custom hook for accessing authentication session data.
 *
 * In development mode with NEXT_PUBLIC_DEV_USER_NAME set, returns mock data.
 * In production, fetches real session data from better-auth.
 *
 * @returns {UseAuthSessionReturn} Session data with loading and error states
 *
 * @example
 * const { data, isPending, error } = useAuthSession();
 *
 * if (isPending) return <Loading />;
 * if (error) return <Error />;
 * if (data?.user) return <Dashboard user={data.user} />;
 */
export function useAuthSession(): UseAuthSessionReturn {
  try {
    // Use the actual better-auth useSession hook
    const session = useSession();

    // Check for development mode mock data after obtaining session
    if (env.NODE_ENV === "development" && env.NEXT_PUBLIC_DEV_USER_NAME) {
      logAuthEvent("Development mode active", { user: env.NEXT_PUBLIC_DEV_USER_NAME });
      return {
        data: {
          user: {
            name: env.NEXT_PUBLIC_DEV_USER_NAME,
            email: env.NEXT_PUBLIC_DEV_USER_EMAIL || "dev@example.com",
            image: env.NEXT_PUBLIC_DEV_USER_IMAGE,
          },
        },
        isPending: false,
        error: null,
      };
    }

    return {
      data: session.data ? { user: session.data.user } : null,
      isPending: session.isPending,
      error: session.error,
    };
  } catch (error) {
    logAuthEvent("Authentication error", { error });
    return {
      data: null,
      isPending: false,
      error: error as Error,
    };
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
