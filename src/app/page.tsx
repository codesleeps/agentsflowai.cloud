"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/client-lib/auth-client";

export default function HomePage() {
  const router = useRouter();
  const { data: auth, isPending, error } = useAuthSession();
  const [mounted, setMounted] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Safety timeout — if isPending never resolves, redirect to welcome after 4s
    const timer = setTimeout(() => setTimedOut(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const resolved = mounted && (!isPending || timedOut);
    if (resolved) {
      if (auth?.user) {
        router.replace("/dashboard");
      } else {
        router.replace("/welcome");
      }
    }
  }, [mounted, isPending, timedOut, auth, error, router]);

  if (!mounted || (isPending && !timedOut)) {
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
