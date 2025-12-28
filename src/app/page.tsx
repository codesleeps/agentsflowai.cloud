"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthClient } from "@/client-lib/auth-client";

export default function HomePage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const auth = getAuthClient();

  useEffect(() => {
    // Check authentication status
    const checkAuth = async () => {
      try {
        if (auth.data?.user) {
          // User is authenticated, redirect to dashboard
          router.replace("/dashboard");
        } else {
          // User is not authenticated, redirect to welcome
          router.replace("/welcome");
        }
      } catch (error) {
        console.error("Authentication check failed:", error);
        // On error, redirect to welcome as fallback
        router.replace("/welcome");
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [router, auth]);

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-pulse rounded-full bg-primary" />
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return null;
}
