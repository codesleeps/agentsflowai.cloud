import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createExecutionSchema = z.object({
  workflowId: z.string(),
  inputData: z.record(z.any()).optional(),
  scheduledAt: z.string().datetime().optional(),
});

const updateExecutionSchema = z.object({
  status: z
    .enum(["pending", "running", "completed", "failed", "cancelled"])
    .optional(),
  outputData: z.record(z.any()).optional(),
  errorMessage: z.string().optional(),
  completedAt: z.string().datetime().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get("workflowId");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: any = {
      userId: session.user.id,
    };

    if (workflowId) {
      where.workflowId = workflowId;
    }

    if (status) {
      where.status = status;
    }

    const executions = await prisma.workflowExecution.findMany({
      where,
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip: offset,
    });

    const total = await prisma.workflowExecution.count({ where });

    return NextResponse.json({
      executions,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error("Error fetching workflow executions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createExecutionSchema.parse(body);

    // Verify workflow ownership
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: validatedData.workflowId,
        userId: session.user.id,
      },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found or access denied" },
        { status: 404 },
      );
    }

    const execution = await prisma.workflowExecution.create({
      data: {
        workflowId: validatedData.workflowId,
        userId: session.user.id,
        status: "pending",
        inputData: validatedData.inputData || {},
        scheduledAt: validatedData.scheduledAt
          ? new Date(validatedData.scheduledAt)
          : null,
      },
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    // Trigger workflow execution asynchronously
    // This would typically be handled by a job queue or background service
    setImmediate(async () => {
      try {
        await executeWorkflow(execution.id);
      } catch (error) {
        console.error("Error executing workflow:", error);
      }
    });

    return NextResponse.json(execution, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Error creating workflow execution:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Helper function to execute workflow (simplified version)
async function executeWorkflow(executionId: string) {
  const execution = await prisma.workflowExecution.findUnique({
    where: { id: executionId },
    include: { workflow: true },
  });

  if (!execution) return;

  try {
    await prisma.workflowExecution.update({
      where: { id: executionId },
      data: { status: "running" },
    });

    // Execute workflow steps based on workflow configuration
    // This is a simplified implementation - in a real system,
    // you'd have a proper workflow engine

    const steps = execution.workflow.steps as any[];
    let currentData = execution.inputData;

    for (const step of steps) {
      // Execute each step based on its type
      switch (step.type) {
        case "ai_agent":
          // Call AI agent
          currentData = await executeAIAgentStep(step, currentData);
          break;
        case "api_call":
          // Make API call
          currentData = await executeAPICallStep(step, currentData);
          break;
        case "condition":
          // Evaluate condition
          currentData = await executeConditionStep(step, currentData);
          break;
        default:
          break;
      }
    }

    await prisma.workflowExecution.update({
      where: { id: executionId },
      data: {
        status: "completed",
        outputData: currentData,
        completedAt: new Date(),
      },
    });
  } catch (error) {
    await prisma.workflowExecution.update({
      where: { id: executionId },
      data: {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        completedAt: new Date(),
      },
    });
  }
}

// Placeholder functions for step execution
async function executeAIAgentStep(step: any, data: any) {
  // Implementation would call the appropriate AI agent
  return data;
}

async function executeAPICallStep(step: any, data: any) {
  // Implementation would make the API call
  return data;
}

async function executeConditionStep(step: any, data: any) {
  // Implementation would evaluate the condition
  return data;
}
