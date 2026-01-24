import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-helpers';
import { createAutonomousTask, getTaskStatus } from '@/server-lib/autonomous-agent-orchestrator';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    
    const body = await req.json();
    const { agentId, prompt } = body;
    
    if (!agentId || !prompt) {
      return NextResponse.json({ error: 'Missing required fields: agentId, prompt' }, { status: 400 });
    }

    const taskId = await createAutonomousTask(user.id, agentId, prompt);

    return NextResponse.json({ 
      success: true, 
      taskId,
      message: 'Task initialized successfully'
    });

  } catch (error) {
    console.error('Error creating autonomous task:', error);
    return NextResponse.json(
      { error: 'Failed to create task', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json({ error: 'Missing taskId parameter' }, { status: 400 });
    }

    const taskContext = await getTaskStatus(taskId);

    if (!taskContext) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      task: taskContext 
    });

  } catch (error) {
    console.error('Error fetching task status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}