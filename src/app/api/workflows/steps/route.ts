import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createStepSchema = z.object({
  workflowId: z.string().min(1, "Workflow ID is required"),
  name: z.string().min(1, "Step name is required"),
  description: z.string().optional(),
  type: z.enum([
    "action",
    "condition",
    "loop",
    "parallel",
    "delay",
    "webhook",
    "ai_agent",
  ]),
  config: z.record(z.any()),
  order: z.number().int().min(0),
  dependencies: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get("workflowId");

    if (!workflowId) {
      return NextResponse.json(
        { error: "Workflow ID is required" },
        { status: 400 },
      );
    }

    // Verify workflow ownership
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: workflowId,
        created_by: user.id,
      },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found or access denied" },
        { status: 404 },
      );
    }

    const steps = await prisma.workflowAction.findMany({
      where: { workflow_id: workflowId },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(steps);
  } catch (error) {
    console.error("Error fetching workflow steps:", error);
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
    const validatedData = createStepSchema.parse(body);

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

    // Map step data to WorkflowAction
    // WorkflowAction: action_type, action_config, order, workflow_id.
    // We'll store name/description in config since they don't exist in model.
    const actionConfig = {
      ...validatedData.config,
      name: validatedData.name,
      description: validatedData.description,
      dependencies: validatedData.dependencies,
    };

    const step = await prisma.workflowAction.create({
      data: {
        workflow_id: validatedData.workflowId,
        action_type: validatedData.type,
        action_config: actionConfig,
        order: validatedData.order,
      },
    });

    return NextResponse.json(step, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Error creating workflow step:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
