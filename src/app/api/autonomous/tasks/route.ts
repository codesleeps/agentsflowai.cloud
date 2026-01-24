/**
 * Autonomous Agent Orchestration API Routes
 * 
 * REST API endpoints for managing autonomous task execution
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { handleApiError } from "@/lib/api-errors";
import {
  createAutonomousTask,
  getTaskStatus
} from "@/server-lib/autonomous-agent-orchestrator";

// ==================== CREATE AUTONOMOUS TASK ====================

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    const { agentId, prompt } = body;
    
    if (!agentId || !prompt) {
      return NextResponse.json(
        { error: "agentId and prompt are required" },
        { status: 400 }
      );
    }

    // Validate prompt length
    if (prompt.length > 10000) {
      return NextResponse.json(
        { error: "Prompt too long (max 10000 characters)" },
        { status: 400 }
      );
    }

    console.log(`[API] Creating autonomous task for user ${user.id}, agent ${agentId}`);

    // Create the autonomous task
    const taskId = await createAutonomousTask(user.id, agentId, prompt);

    return NextResponse.json({
      taskId,
      status: "initialized",
      message: "Autonomous task created and started"
    });

  } catch (error) {
    console.error("[API] Failed to create autonomous task:", error);
    return handleApiError(error);
  }
}

// ==================== GET TASK STATUS ====================

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json(
        { error: "taskId parameter is required" },
        { status: 400 }
      );
    }

    console.log(`[API] Getting status for task ${taskId}`);

    const taskContext = await getTaskStatus(taskId);

    // Verify user owns this task
    if (taskContext.userId !== user.id) {
      return NextResponse.json(
        { error: "Task not found or access denied" },
        { status: 404 }
      );
    }

    // Calculate progress and timing info
    const totalSteps = taskContext.complexity.estimatedSteps;
    const completedSteps = taskContext.executionResults?.length || 0;
    const progress = totalSteps > 0 ? Math.min(completedSteps / totalSteps, 1) : 0;
    
    const elapsed = Date.now() - taskContext.metadata.startTime.getTime();
    const estimatedTotal = taskContext.complexity.estimatedSteps * 30000;
    const estimatedTimeRemaining = Math.max(0, estimatedTotal - elapsed);

    return NextResponse.json({
      taskId: taskContext.taskId,
      currentState: taskContext.currentState,
      originalPrompt: taskContext.originalPrompt,
      complexity: taskContext.complexity,
      progress: {
        percentage: Math.round(progress * 100),
        completedSteps,
        totalSteps,
        estimatedTimeRemaining: Math.round(estimatedTimeRemaining / 1000) // in seconds
      },
      metadata: {
        startTime: taskContext.metadata.startTime,
        toolsUsed: taskContext.metadata.toolsUsed,
        totalCost: taskContext.metadata.totalCost,
        totalDuration: Math.round(elapsed / 1000) // in seconds
      },
      analysisResults: taskContext.analysisResults,
      executionResults: taskContext.executionResults?.slice(-5), // Last 5 results
      stateTransitions: taskContext.metadata.stateTransitions.slice(-10) // Last 10 transitions
    });

  } catch (error) {
    console.error("[API] Failed to get task status:", error);
    return handleApiError(error);
  }
}