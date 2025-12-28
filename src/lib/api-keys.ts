import { prisma } from "@/server-lib/prisma";
import { Permissions } from "./roles";
import crypto from "crypto";

// Generate a new API key
export function generateApiKey(): {
  key: string;
  prefix: string;
  keyHash: string;
} {
  const key = `af_${crypto.randomBytes(32).toString("hex")}`;
  const prefix = key.substring(0, 8);
  const keyHash = hashKey(key);
  return { key, prefix, keyHash };
}

// Hash the API key for storage
export function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

// Create a new API key for a user
export async function createApiKey(
  userId: string,
  name: string,
  permissions: string[] = [Permissions.INTEGRATION_READ],
  expiresAt?: Date,
  rateLimit?: number,
) {
  const { key, prefix, keyHash } = generateApiKey();

  const apiKey = await prisma.apiKey.create({
    data: {
      userId,
      name,
      key: keyHash, // Store only the hashed key for security
      keyHash,
      prefix,
      permissions,
      expiresAt,
      rateLimit,
    },
  });

  // Return the key only once - this is the only time the full key is visible
  return {
    ...apiKey,
    key, // Return full key to user (they need to save it)
  };
}

// Verify an API key
export async function verifyApiKey(key: string) {
  const keyHash = hashKey(key);

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: { user: true },
  });

  if (!apiKey) {
    return null;
  }

  // Check if key is active
  if (!apiKey.isActive) {
    return null;
  }

  // Check if key has expired
  if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
    return null;
  }

  // Update last used timestamp
  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });

  return apiKey;
}

// Check if API key has permission
export function apiKeyHasPermission(apiKey: any, permission: string): boolean {
  return apiKey.permissions.includes(permission);
}

// Get all API keys for a user
export async function getUserApiKeys(userId: string) {
  return prisma.apiKey.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      prefix: true,
      permissions: true,
      rateLimit: true,
      expiresAt: true,
      lastUsedAt: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      // Don't return the actual key hash for security
    },
  });
}

// Revoke an API key
export async function revokeApiKey(apiKeyId: string, userId: string) {
  return prisma.apiKey.deleteMany({
    where: {
      id: apiKeyId,
      userId, // Ensure user owns the key
    },
  });
}

// Rotate an API key (revoke old, create new)
export async function rotateApiKey(
  apiKeyId: string,
  userId: string,
  name?: string,
) {
  // Delete old key
  await revokeApiKey(apiKeyId, userId);

  // Create new key with same permissions
  const oldKey = await prisma.apiKey.findUnique({
    where: { id: apiKeyId },
  });

  if (!oldKey) {
    throw new Error("API key not found");
  }

  return createApiKey(
    userId,
    name || oldKey.name,
    oldKey.permissions,
    oldKey.expiresAt,
    oldKey.rateLimit,
  );
}
