"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/client-lib/auth-client";

export default function HomePage() {
  const router = useRouter();
  const { data: auth, isPending, error } = useAuthSession();

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-pulse rounded-full bg-primary" />
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (error || !auth?.user) {
    router.replace("/welcome");
  } else {
    router.replace("/dashboard");
  }

  return null;
}
