/**
 * Autonomous Task Actions API
 * 
 * Endpoint for controlling autonomous task execution (approve, cancel, pause, etc.)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { handleApiError } from "@/lib/api-errors";
import {
  approveTask,
  cancelTask,
  pauseTask,
  resumeTask,
  retryTask,
  getTaskStatus
} from "@/server-lib/autonomous-agent-orchestrator";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string; action: string }> }
) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId, action } = await params;

    if (!taskId) {
      return NextResponse.json(
        { error: "taskId parameter is required" },
        { status: 400 }
      );
    }

    if (!action) {
      return NextResponse.json(
        { error: "action parameter is required" },
        { status: 400 }
      );
    }

    // Verify user owns this task
    try {
      const taskContext = await getTaskStatus(taskId);
      if (taskContext.userId !== user.id) {
        return NextResponse.json(
          { error: "Task not found or access denied" },
          { status: 404 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    console.log(`[API] Performing action '${action}' on task ${taskId}`);

    // Perform the requested action
    switch (action.toLowerCase()) {
      case "approve":
        await approveTask(taskId);
        return NextResponse.json({
          success: true,
          message: "Task approved and execution resumed"
        });

      case "cancel":
        await cancelTask(taskId);
        return NextResponse.json({
          success: true,
          message: "Task cancelled"
        });

      case "pause":
        await pauseTask(taskId);
        return NextResponse.json({
          success: true,
          message: "Task paused"
        });

      case "resume":
        await resumeTask(taskId);
        return NextResponse.json({
          success: true,
          message: "Task resumed"
        });

      case "retry":
        await retryTask(taskId);
        return NextResponse.json({
          success: true,
          message: "Task retry initiated"
        });

      default:
        return NextResponse.json(
          { error: `Unsupported action: ${action}. Supported actions: approve, cancel, pause, resume, retry` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error(`[API] Failed to perform action '${await params.then(p => p.action)}' on task:`, error);
    
    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes('not awaiting approval')) {
        return NextResponse.json(
          { error: "Task is not awaiting approval" },
          { status: 400 }
        );
      }
      if (error.message.includes('not paused')) {
        return NextResponse.json(
          { error: "Task is not paused" },
          { status: 400 }
        );
      }
      if (error.message.includes('Can only pause executing tasks')) {
        return NextResponse.json(
          { error: "Can only pause executing tasks" },
          { status: 400 }
        );
      }
      if (error.message.includes('Can only retry failed tasks')) {
        return NextResponse.json(
          { error: "Can only retry failed tasks" },
          { status: 400 }
        );
      }
      if (error.message.includes('Cannot cancel task in terminal state')) {
        return NextResponse.json(
          { error: "Cannot perform action on completed/cancelled/failed task" },
          { status: 400 }
        );
      }
    }
    
    return handleApiError(error);
  }
}