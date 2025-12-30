import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { handleApiError } from "@/lib/api-errors";
import { prisma } from "@/server-lib/prisma";
import { z } from "zod";

const UpdateAgentSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  category: z.string().optional(),
  systemPrompt: z.string().min(1, "System prompt is required").optional(),
  model: z.string().optional(),
  provider: z.string().optional(),
  supportedProviders: z
    .array(
      z.object({
        provider: z.string(),
        model: z.string(),
        priority: z.number(),
      }),
    )
    .optional(),
  defaultProvider: z.string().optional(),
  costTier: z.enum(["free", "low", "medium", "high"]).optional(),
  isPublic: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/user/ai-agents/[id] - Get specific agent
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    const agent = await prisma.userAIAgent.findFirst({
      where: {
        id,
        user_id: user.id,
      },
    });

    if (!agent) {
      return NextResponse.json(
        {
          error: "Agent not found",
          code: "AGENT_NOT_FOUND",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(agent);
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT /api/user/ai-agents/[id] - Update agent
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;
    const body = await request.json();

    const validatedData = UpdateAgentSchema.parse(body);

    // Check if agent exists and belongs to user
    const existingAgent = await prisma.userAIAgent.findFirst({
      where: {
        id,
        user_id: user.id,
      },
    });

    if (!existingAgent) {
      return NextResponse.json(
        {
          error: "Agent not found",
          code: "AGENT_NOT_FOUND",
        },
        { status: 404 },
      );
    }

    // Check if name is being changed and if it conflicts
    if (validatedData.name && validatedData.name !== existingAgent.name) {
      const nameConflict = await prisma.userAIAgent.findFirst({
        where: {
          user_id: user.id,
          name: validatedData.name,
          id: { not: id }, // Exclude current agent
        },
      });

      if (nameConflict) {
        return NextResponse.json(
          {
            error: "An agent with this name already exists",
            code: "AGENT_EXISTS",
          },
          { status: 409 },
        );
      }
    }

    const updatedAgent = await prisma.userAIAgent.update({
      where: {
        id,
      },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.description !== undefined && {
          description: validatedData.description,
        }),
        ...(validatedData.icon && { icon: validatedData.icon }),
        ...(validatedData.category && { category: validatedData.category }),
        ...(validatedData.systemPrompt && {
          system_prompt: validatedData.systemPrompt,
        }),
        ...(validatedData.model && { model: validatedData.model }),
        ...(validatedData.provider && { provider: validatedData.provider }),
        ...(validatedData.supportedProviders && {
          supported_providers: validatedData.supportedProviders,
        }),
        ...(validatedData.defaultProvider && {
          default_provider: validatedData.defaultProvider,
        }),
        ...(validatedData.costTier && { cost_tier: validatedData.costTier }),
        ...(validatedData.isPublic !== undefined && {
          is_public: validatedData.isPublic,
        }),
        ...(validatedData.isActive !== undefined && {
          is_active: validatedData.isActive,
        }),
        updated_at: new Date(),
      },
    });

    // Log the update
    await prisma.activityLog.create({
      data: {
        user_id: user.id,
        type: "AGENT_UPDATE",
        description: `Updated AI agent: ${updatedAgent.name}`,
        metadata: {
          agent_id: updatedAgent.id,
          agent_name: updatedAgent.name,
        },
      },
    });

    return NextResponse.json(updatedAgent);
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

// DELETE /api/user/ai-agents/[id] - Delete agent
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    // Check if agent exists and belongs to user
    const existingAgent = await prisma.userAIAgent.findFirst({
      where: {
        id,
        user_id: user.id,
      },
    });

    if (!existingAgent) {
      return NextResponse.json(
        {
          error: "Agent not found",
          code: "AGENT_NOT_FOUND",
        },
        { status: 404 },
      );
    }

    // Delete the agent
    await prisma.userAIAgent.delete({
      where: {
        id,
      },
    });

    // Log the deletion
    await prisma.activityLog.create({
      data: {
        user_id: user.id,
        type: "AGENT_DELETE",
        description: `Deleted AI agent: ${existingAgent.name}`,
        metadata: {
          agent_id: id,
          agent_name: existingAgent.name,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
