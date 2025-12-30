import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
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
        userId: session.user.id,
      },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found or access denied" },
        { status: 404 },
      );
    }

    const steps = await prisma.workflowStep.findMany({
      where: { workflowId },
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createStepSchema.parse(body);

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

    const step = await prisma.workflowStep.create({
      data: {
        ...validatedData,
        userId: session.user.id,
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
