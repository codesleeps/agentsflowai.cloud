import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { origin } = new URL(request.url);

  // Generate the Google OAuth URL using signInSocial
  // The provider goes in the body for signInSocial
  const signInResult = await auth.api.signInSocial({
    body: {
      provider: "google" as const,
      callbackURL: "/onboarding",
    },
    headers: request.headers
      ? Object.fromEntries(request.headers.entries())
      : undefined,
  });

  if (signInResult && "url" in signInResult && signInResult.url) {
    return NextResponse.redirect(new URL(signInResult.url, origin));
  }

  return NextResponse.redirect(
    new URL("/sign-in?error=google_auth_init_failed", origin),
  );
}
