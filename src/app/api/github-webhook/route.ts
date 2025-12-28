import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// Webhook secret from environment variable
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || "";

export async function POST(request: NextRequest) {
  try {
    // Get the raw body for signature verification
    const body = await request.text();

    // Get GitHub signature
    const signature = request.headers.get("x-hub-signature-256") || "";

    // Verify signature if secret is configured
    if (WEBHOOK_SECRET) {
      const expectedSignature =
        "sha256=" +
        crypto.createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");

      if (signature !== expectedSignature) {
        console.error("Invalid webhook signature");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 },
        );
      }
    }

    // Parse the webhook payload
    const payload = JSON.parse(body);

    // Only respond to push events on main branch
    if (payload.ref !== "refs/heads/main") {
      return NextResponse.json({
        message: "Ignoring non-main branch push",
        ref: payload.ref,
      });
    }

    // Get deployment info
    const commits = payload.commits || [];
    const pusher = payload.pusher?.name || "unknown";
    const repository = payload.repository?.full_name || "unknown";

    console.log(
      `[GitHub Webhook] Push detected from ${pusher} to ${repository}`,
    );
    console.log(`[GitHub Webhook] Commits: ${commits.length}`);

    // In a production setup, you would trigger a deployment script here
    // Example: spawn a child process to run the deploy script

    // For security reasons, we don't execute shell commands directly from the webhook
    // Instead, this endpoint confirms the webhook was received and logged

    return NextResponse.json({
      success: true,
      message: "Webhook received",
      deployment: {
        branch: "main",
        commits: commits.map((c: any) => ({
          id: c.id?.substring(0, 7),
          message: c.message,
          author: c.author?.name,
        })),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[GitHub Webhook] Error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}

// Verify the endpoint is working
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "GitHub webhook endpoint is active",
    usage: "POST to this endpoint with GitHub webhook payload",
  });
}
