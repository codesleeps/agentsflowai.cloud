import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const error = searchParams.get("error");
  const callbackUrl = searchParams.get("callbackUrl");

  if (error) {
    return NextResponse.redirect(
      new URL(`/sign-in?error=${encodeURIComponent(error)}`, origin),
    );
  }

  // Let Better Auth handle the OAuth callback automatically
  // The toNextJsHandler in [...all]/route.ts processes the code
  // and creates the session. We just need to redirect to the right place.

  // Check if we should redirect to onboarding (new users) or the callback URL
  if (callbackUrl && callbackUrl.includes("onboarding")) {
    return NextResponse.redirect(new URL("/onboarding", origin));
  }

  return NextResponse.redirect(new URL("/dashboard", origin));
}
