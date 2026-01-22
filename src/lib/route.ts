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

    const whereClause: any = { user_id: user.id };
    if (agentId) {
      whereClause.agent_id = agentId;
    }

    // Assuming AIModelConfig table exists as per requirements
    // If not, this will need to be adjusted to match actual schema
    const preferences = await db.aIModelConfig.findMany({
      where: whereClause,
      orderBy: [
        { agent_id: 'asc' }
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
          user_id: user.id,
          agent_id: agentId
        }
      });

      // 2. Insert new config
      if (fallbackChain.length > 0) {
        // Convert fallbackChain to the expected format
        const fallbackChainJson = fallbackChain.map((item, index) => ({
          provider: item.provider,
          model: item.model,
          priority: index + 1,
          isEnabled: item.isEnabled ?? true
        }));
        
        await tx.aIModelConfig.upsert({
          where: {
            user_id_agent_id: {
              user_id: user.id,
              agent_id: agentId
            }
          },
          update: {
            primary_provider: fallbackChain[0]?.provider || 'ollama',
            primary_model: fallbackChain[0]?.model || 'mistral',
            fallback_chain: fallbackChainJson
          },
          create: {
            user_id: user.id,
            agent_id: agentId,
            primary_provider: fallbackChain[0]?.provider || 'ollama',
            primary_model: fallbackChain[0]?.model || 'mistral',
            fallback_chain: fallbackChainJson
          }
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
        user_id: user.id,
        agent_id: agentId
      }
    });

    return createSuccessResponse({ success: true, message: "Preferences reset to default" });
  } catch (error) {
    return handleApiError(error as Error);
  }
}