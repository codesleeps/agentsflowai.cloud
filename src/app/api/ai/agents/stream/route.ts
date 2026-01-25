import { NextResponse } from 'next/server';
import { getRedisClient } from '@/server-lib/redis-cache';
import { db } from '@/server-lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('taskId');
  
  if (!taskId) {
    return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
  }

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let lastSentTimestamp = Date.now();
      
      // Send initial connection confirmation
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
        type: 'connected',
        taskId,
        timestamp: new Date().toISOString()
      })}\n\n`));

      // Set up polling interval
      const interval = setInterval(async () => {
        try {
          // Check if client is still connected (this is approximate)
          if (Date.now() - lastSentTimestamp > 30000) {
            clearInterval(interval);
            controller.close();
            return;
          }

          // Get task status from database
          const task = await db.workflowExecution.findUnique({
            where: { id: taskId },
            include: {
              logs: {
                orderBy: { created_at: 'desc' },
                take: 5
              }
            }
          });

          if (!task) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'error',
              message: 'Task not found',
              timestamp: new Date().toISOString()
            })}\n\n`));
            clearInterval(interval);
            controller.close();
            return;
          }

          // Get current context from Redis (if available)
          let taskContext = null;
          try {
            const redis = await getRedisClient();
            const contextData = await redis.get(`task:context:${taskId}`);
            if (contextData) {
              taskContext = JSON.parse(contextData);
            }
          } catch (error) {
            console.warn('Redis unavailable for SSE stream');
          }

          // Prepare status update
          const statusUpdate = {
            type: 'status_update',
            taskId,
            status: task.status,
            progress: calculateProgress(task, taskContext),
            currentStep: getCurrentStep(taskContext),
            timestamp: new Date().toISOString(),
            taskData: {
              id: task.id,
              status: task.status,
              startedAt: task.started_at?.toISOString(),
              completedAt: task.completed_at?.toISOString(),
              recentLogs: task.logs.map(log => ({
                id: log.id,
                actionType: log.action_type,
                createdAt: log.created_at?.toISOString(),
                status: log.status
              }))
            }
          };

          // Send update
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(statusUpdate)}\n\n`));
          lastSentTimestamp = Date.now();

          // If task is completed, failed, or cancelled, close the stream
          if (['completed', 'failed', 'cancelled'].includes(task.status)) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'task_complete',
              taskId,
              finalStatus: task.status,
              timestamp: new Date().toISOString()
            })}\n\n`));
            clearInterval(interval);
            controller.close();
          }

        } catch (error) {
          console.error('Error in SSE stream:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            message: 'Internal server error',
            timestamp: new Date().toISOString()
          })}\n\n`));
          clearInterval(interval);
          controller.close();
        }
      }, 2000); // Poll every 2 seconds

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// Helper functions
function calculateProgress(task: any, context: any): number {
  if (task.status === 'completed') return 1;
  if (task.status === 'failed' || task.status === 'cancelled') return 0;
  
  // Calculate progress based on task state and steps completed
  if (context?.currentState) {
    const stateProgress: Record<string, number> = {
      'ANALYZING': 0.1,
      'PLANNING': 0.3,
      'AWAITING_APPROVAL': 0.4,
      'EXECUTING': 0.7,
      'VERIFYING': 0.9,
      'COMPLETED': 1,
      'FAILED': 0,
      'CANCELLED': 0
    };
    
    let progress = stateProgress[context.currentState] || 0;
    
    // Adjust based on step completion if available
    if (context.executionResults && context.technicalPlan?.implementationSteps) {
      const totalSteps = context.technicalPlan.implementationSteps.length;
      const completedSteps = context.executionResults.length;
      if (totalSteps > 0) {
        const stepProgress = completedSteps / totalSteps;
        progress = Math.max(progress, 0.4 + (stepProgress * 0.5)); // Scale between 40-90%
      }
    }
    
    return Math.min(progress, 0.95); // Cap at 95% until verified complete
  }
  
  // Default progress based on status
  switch (task.status) {
    case 'running': return 0.5;
    case 'pending': return 0.1;
    default: return 0;
  }
}

function getCurrentStep(context: any): string | undefined {
  if (!context?.currentState) return undefined;
  
  switch (context.currentState) {
    case 'ANALYZING':
      return 'Analyzing task requirements...';
    case 'PLANNING':
      return 'Generating implementation plan...';
    case 'AWAITING_APPROVAL':
      return 'Waiting for plan approval...';
    case 'EXECUTING':
      if (context.executionResults?.length > 0) {
        const lastResult = context.executionResults[context.executionResults.length - 1];
        return `Executing step: ${lastResult.toolRoute?.toolName || 'unknown'}`;
      }
      return 'Starting execution...';
    case 'VERIFYING':
      return 'Verifying results...';
    default:
      return undefined;
  }
}