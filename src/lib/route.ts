import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/server-lib/prisma";
import { UserAIPreferenceUpdateSchema, validateAndSanitize } from "@/lib/validation-schemas";
import { handleApiError, createSuccessResponse } from "@/lib/api-errors";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const searchParams = request.nextUrl.searchParams;
    const agentId = searchParams.get("agentId");

    const whereClause: any = { userId: user.id };
    if (agentId) {
      whereClause.agentId = agentId;
    }

    // Assuming AIModelConfig table exists as per requirements
    // If not, this will need to be adjusted to match actual schema
    const preferences = await db.aIModelConfig.findMany({
      where: whereClause,
      orderBy: [
        { agentId: 'asc' },
        { priority: 'asc' }
      ]
    });

    return createSuccessResponse(preferences);
  } catch (error) {
    return handleApiError(error as Error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    
    const validatedData = validateAndSanitize(UserAIPreferenceUpdateSchema, body);
    const { agentId, fallbackChain } = validatedData;

    // Transaction to update preferences for an agent
    await db.$transaction(async (tx) => {
      // 1. Delete existing config for this agent/user
      await tx.aIModelConfig.deleteMany({
        where: {
          userId: user.id,
          agentId: agentId
        }
      });

      // 2. Insert new config
      if (fallbackChain.length > 0) {
        await tx.aIModelConfig.createMany({
          data: fallbackChain.map((item, index) => ({
            userId: user.id,
            agentId: agentId,
            provider: item.provider,
            model: item.model,
            priority: index + 1, // Ensure sequential priority
            isEnabled: item.isEnabled ?? true
          }))
        });
      }
    });

    return createSuccessResponse({ success: true, message: "Preferences updated" });
  } catch (error) {
    return handleApiError(error as Error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const searchParams = request.nextUrl.searchParams;
    const agentId = searchParams.get("agentId");

    if (!agentId) {
      throw new Error("Agent ID is required");
    }

    await db.aIModelConfig.deleteMany({
      where: {
        userId: user.id,
        agentId: agentId
      }
    });

    return createSuccessResponse({ success: true, message: "Preferences reset to default" });
  } catch (error) {
    return handleApiError(error as Error);
  }
}