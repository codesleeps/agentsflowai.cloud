import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { handleApiError } from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workflows = await prisma.workflow.findMany({
      where: {
        // For now, workflows are global, but we could add user ownership later
      },
      include: {
        triggers: true,
        actions: true,
        executions: {
          take: 5,
          orderBy: { created_at: "desc" },
        },
      },
      orderBy: { created_at: "desc" },
    });

    // Transform to match our client interface
    const transformedWorkflows = workflows.map((workflow) => ({
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
    }));

    return NextResponse.json(transformedWorkflows);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      status = "draft",
      triggerType,
      triggerConfig = {},
      actions = [],
    } = body;

    // Create workflow with triggers and actions
    const workflow = await prisma.workflow.create({
      data: {
        name,
        description,
        status,
        created_by: user.id, // Add this field to schema if needed
        triggers: {
          create: {
            trigger_type: triggerType,
            trigger_config: triggerConfig,
            is_active: status === "active",
          },
        },
        actions: {
          create: actions.map((action: any, index: number) => ({
            action_type: action.actionType,
            action_config: action.actionConfig || {},
            order: action.order || index,
            condition: action.condition,
          })),
        },
      },
      include: {
        triggers: true,
        actions: true,
      },
    });

    // Transform response
    const transformedWorkflow = {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      status: workflow.status,
      execution_count: workflow.execution_count,
      success_count: workflow.success_count,
      failure_count: workflow.failure_count,
      created_at: workflow.created_at.toISOString(),
      updated_at: workflow.updated_at.toISOString(),
      trigger_type: workflow.triggers[0]?.trigger_type || "",
      trigger_config: workflow.triggers[0]?.trigger_config || {},
      actions: workflow.actions.map((action) => ({
        id: action.id,
        actionType: action.action_type,
        actionConfig: action.action_config,
        order: action.order,
      })),
    };

    return NextResponse.json(transformedWorkflow, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
