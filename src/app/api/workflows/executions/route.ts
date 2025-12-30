import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helpers";
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
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get("workflowId");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: any = {
      workflow: {
        created_by: user.id
      }
    };

    if (workflowId) {
      where.workflow_id = workflowId;
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
        created_at: "desc",
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
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createExecutionSchema.parse(body);

    // Verify workflow ownership
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: validatedData.workflowId,
        created_by: user.id,
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
        workflow_id: validatedData.workflowId,
        trigger_type: "manual",
        trigger_data: validatedData.inputData || {}, // Map inputData to trigger_data
        status: "pending",
        // validatedData.scheduledAt ignored as per schema
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
    include: {
      workflow: {
        include: {
          actions: {
            orderBy: {
              order: 'asc'
            }
          }
        }
      }
    },
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

    const actions = execution.workflow.actions;
    let currentData = execution.trigger_data;

    for (const action of actions) {
      // Execute each step based on its type
      switch (action.action_type) {
        case "ai_agent":
          // Call AI agent
          currentData = await executeAIAgentStep(action, currentData);
          break;
        case "api_call":
          // Make API call
          currentData = await executeAPICallStep(action, currentData);
          break;
        case "condition":
          // Evaluate condition
          currentData = await executeConditionStep(action, currentData);
          break;
        default:
          break;
      }
    }

    await prisma.workflowExecution.update({
      where: { id: executionId },
      data: {
        status: "completed",
        completed_at: new Date(),
        // output_data: currentData, // Not supported in schema
      },
    });
  } catch (error) {
    await prisma.workflowExecution.update({
      where: { id: executionId },
      data: {
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
        completed_at: new Date(),
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
