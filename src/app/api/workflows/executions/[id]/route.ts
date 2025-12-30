import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateExecutionSchema = z.object({
  status: z
    .enum(["pending", "running", "completed", "failed", "cancelled"])
    .optional(),
  outputData: z.record(z.any()).optional(),
  errorMessage: z.string().optional(),
  completedAt: z.string().datetime().optional(),
});

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const execution = await prisma.workflowExecution.findFirst({
      where: {
        id: params.id,
        workflow: {
          created_by: user.id
        }
      },
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
            description: true,
            actions: true, // was steps, but schema has actions
          },
        },
      },
    });

    if (!execution) {
      return NextResponse.json(
        { error: "Execution not found or access denied" },
        { status: 404 },
      );
    }

    return NextResponse.json(execution);
  } catch (error) {
    console.error("Error fetching workflow execution:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateExecutionSchema.parse(body);

    // Verify execution ownership - note: WorkflowExecution doesn't have userId, so we check via workflow
    // But since we can't easily do nested where on update with simple findFirst logic cleanly without include,
    // we'll fetch first.

    // Check if execution exists and belongs to a workflow created by user
    const existingExecution = await prisma.workflowExecution.findFirst({
      where: {
        id: params.id,
        workflow: {
          created_by: user.id
        }
      },
    });

    if (!existingExecution) {
      return NextResponse.json(
        { error: "Execution not found or access denied" },
        { status: 404 },
      );
    }

    const execution = await prisma.workflowExecution.update({
      where: { id: params.id },
      data: {
        status: validatedData.status,
        // output_data: validatedData.outputData, // Removed as not in schema
        error_message: validatedData.errorMessage,
        completed_at: validatedData.completedAt
          ? new Date(validatedData.completedAt)
          : undefined,
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

    return NextResponse.json(execution);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Error updating workflow execution:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify execution ownership
    const existingExecution = await prisma.workflowExecution.findFirst({
      where: {
        id: params.id,
        workflow: {
          created_by: user.id
        }
      },
    });

    if (!existingExecution) {
      return NextResponse.json(
        { error: "Execution not found or access denied" },
        { status: 404 },
      );
    }

    // Only allow deletion of completed, failed, or cancelled executions
    if (
      !["completed", "failed", "cancelled"].includes(existingExecution.status)
    ) {
      return NextResponse.json(
        { error: "Cannot delete an active execution" },
        { status: 400 },
      );
    }

    await prisma.workflowExecution.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Execution deleted successfully" });
  } catch (error) {
    console.error("Error deleting workflow execution:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
