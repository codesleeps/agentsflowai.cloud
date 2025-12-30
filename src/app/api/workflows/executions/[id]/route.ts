import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
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
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const execution = await prisma.workflowExecution.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
            description: true,
            steps: true,
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
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateExecutionSchema.parse(body);

    // Verify execution ownership
    const existingExecution = await prisma.workflowExecution.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
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
        ...validatedData,
        completedAt: validatedData.completedAt
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
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify execution ownership
    const existingExecution = await prisma.workflowExecution.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
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
