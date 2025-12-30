import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { handleApiError } from "@/lib/api-errors";
import { prisma } from "@/server-lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Authenticate user
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const workflow = await prisma.workflow.findUnique({
      where: { id },
      include: {
        triggers: true,
        actions: true,
        executions: {
          take: 10,
          orderBy: { created_at: "desc" },
        },
      },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 },
      );
    }

    // Transform to match our client interface
    const transformedWorkflow = {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      status: workflow.status,
      is_template: workflow.is_template,
      template_category: workflow.template_category,
      execution_count: workflow.execution_count,
      success_count: workflow.success_count,
      failure_count: workflow.failure_count,
      last_executed_at: workflow.last_executed_at?.toISOString(),
      created_at: workflow.created_at.toISOString(),
      updated_at: workflow.updated_at.toISOString(),
      trigger_type: workflow.triggers[0]?.trigger_type || "",
      trigger_config: workflow.triggers[0]?.trigger_config || {},
      actions: workflow.actions.map((action) => ({
        id: action.id,
        actionType: action.action_type,
        actionConfig: action.action_config,
        order: action.order,
        parent_action_id: action.parent_action_id,
        condition: action.condition,
      })),
      executions: workflow.executions,
    };

    return NextResponse.json(transformedWorkflow);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Authenticate user
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, status, triggerType, triggerConfig, actions } =
      body;

    // Update workflow
    const workflow = await prisma.workflow.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
      },
      include: {
        triggers: true,
        actions: true,
      },
    });

    // Update trigger if provided
    if (triggerType) {
      const existingTrigger = await prisma.workflowTrigger.findFirst({
        where: { workflow_id: id },
      });

      if (existingTrigger) {
        await prisma.workflowTrigger.update({
          where: { id: existingTrigger.id },
          data: {
            trigger_type: triggerType,
            trigger_config: triggerConfig || {},
            is_active: status === "active",
          },
        });
      } else {
        await prisma.workflowTrigger.create({
          data: {
            workflow_id: id,
            trigger_type: triggerType,
            trigger_config: triggerConfig || {},
            is_active: status === "active",
          },
        });
      }
    }

    // Update actions if provided
    if (actions) {
      // Delete existing actions
      await prisma.workflowAction.deleteMany({
        where: { workflow_id: id },
      });

      // Create new actions
      if (actions.length > 0) {
        await prisma.workflowAction.createMany({
          data: actions.map((action: any, index: number) => ({
            workflow_id: id,
            action_type: action.actionType,
            action_config: action.actionConfig || {},
            order: action.order || index,
            condition: action.condition,
          })),
        });
      }
    }

    // Fetch updated workflow
    const updatedWorkflow = await prisma.workflow.findUnique({
      where: { id },
      include: {
        triggers: true,
        actions: true,
      },
    });

    if (!updatedWorkflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 },
      );
    }

    // Transform response
    const transformedWorkflow = {
      id: updatedWorkflow.id,
      name: updatedWorkflow.name,
      description: updatedWorkflow.description,
      status: updatedWorkflow.status,
      execution_count: updatedWorkflow.execution_count,
      success_count: updatedWorkflow.success_count,
      failure_count: updatedWorkflow.failure_count,
      created_at: updatedWorkflow.created_at.toISOString(),
      updated_at: updatedWorkflow.updated_at.toISOString(),
      trigger_type: updatedWorkflow.triggers[0]?.trigger_type || "",
      trigger_config: updatedWorkflow.triggers[0]?.trigger_config || {},
      actions: updatedWorkflow.actions.map((action) => ({
        id: action.id,
        actionType: action.action_type,
        actionConfig: action.action_config,
        order: action.order,
      })),
    };

    return NextResponse.json(transformedWorkflow);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Authenticate user
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Delete workflow (cascade will handle triggers and actions)
    await prisma.workflow.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
