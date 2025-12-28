import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import {
  createApiKey,
  getUserApiKeys,
  revokeApiKey,
  rotateApiKey,
} from "@/lib/api-keys";
import { Permissions } from "@/lib/roles";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const apiKeys = await getUserApiKeys(user.id);

    return NextResponse.json({
      success: true,
      data: apiKeys,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch API keys", code: "API_KEYS_FETCH_FAILED" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    // Check if user has permission to create API keys
    if (user.role !== "admin" && user.role !== "user") {
      return NextResponse.json(
        {
          error: "Insufficient permissions to create API keys",
          code: "FORBIDDEN",
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { name, permissions, expiresAt, rateLimit } = body;

    if (!name) {
      return NextResponse.json(
        { error: "API key name is required", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const apiKey = await createApiKey(
      user.id,
      name,
      permissions || [Permissions.INTEGRATION_READ],
      expiresAt ? new Date(expiresAt) : undefined,
      rateLimit,
    );

    return NextResponse.json({
      success: true,
      data: {
        id: apiKey.id,
        name: apiKey.name,
        key: apiKey.key, // Only returned once!
        prefix: apiKey.prefix,
        permissions: apiKey.permissions,
        rateLimit: apiKey.rateLimit,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
      },
      message:
        "API key created. Store this key securely - it will not be shown again.",
    });
  } catch (error) {
    console.error("Failed to create API key:", error);
    return NextResponse.json(
      { error: "Failed to create API key", code: "API_KEY_CREATE_FAILED" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get("id");

    if (!keyId) {
      return NextResponse.json(
        { error: "API key ID is required", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const deleted = await revokeApiKey(keyId, user.id);

    if (deleted.count === 0) {
      return NextResponse.json(
        { error: "API key not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "API key revoked successfully",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to revoke API key", code: "API_KEY_REVOKE_FAILED" },
      { status: 500 },
    );
  }
}
