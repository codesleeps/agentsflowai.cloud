import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { handleApiError } from "@/lib/api-errors";
import { prisma } from "@/server-lib/prisma";
import { z } from "zod";

// Validation schemas
const CreateAgentSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().optional(),
  icon: z.string().optional(),
  category: z.string().default("custom"),
  systemPrompt: z.string().min(1, "System prompt is required"),
  model: z.string().default("mistral:latest"),
  provider: z.string().default("ollama"),
  supportedProviders: z
    .array(
      z.object({
        provider: z.string(),
        model: z.string(),
        priority: z.number(),
      }),
    )
    .default([]),
  defaultProvider: z.string().default("ollama"),
  costTier: z.enum(["free", "low", "medium", "high"]).default("medium"),
  isPublic: z.boolean().default(false),
});

const UpdateAgentSchema = CreateAgentSchema.partial();

// GET /api/user/ai-agents - List user's AI agents
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const agents = await prisma.userAIAgent.findMany({
      where: {
        user_id: user.id,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return NextResponse.json(agents);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/user/ai-agents - Create new AI agent
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();

    const validatedData = CreateAgentSchema.parse(body);

    // Check if agent with same name already exists for this user
    const existingAgent = await prisma.userAIAgent.findFirst({
      where: {
        user_id: user.id,
        name: validatedData.name,
      },
    });

    if (existingAgent) {
      return NextResponse.json(
        {
          error: "An agent with this name already exists",
          code: "AGENT_EXISTS",
        },
        { status: 409 },
      );
    }

    const agent = await prisma.userAIAgent.create({
      data: {
        user_id: user.id,
        name: validatedData.name,
        description: validatedData.description,
        icon: validatedData.icon || "🤖",
        category: validatedData.category,
        system_prompt: validatedData.systemPrompt,
        model: validatedData.model,
        provider: validatedData.provider,
        supported_providers: validatedData.supportedProviders,
        default_provider: validatedData.defaultProvider,
        cost_tier: validatedData.costTier,
        is_public: validatedData.isPublic,
      },
    });

    // Log the creation
    await prisma.activityLog.create({
      data: {
        user_id: user.id,
        type: "AGENT_CREATE",
        description: `Created custom AI agent: ${agent.name}`,
        metadata: {
          agent_id: agent.id,
          agent_name: agent.name,
        },
      },
    });

    return NextResponse.json(agent, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: error.errors,
        },
        { status: 400 },
      );
    }
    return handleApiError(error);
  }
}
