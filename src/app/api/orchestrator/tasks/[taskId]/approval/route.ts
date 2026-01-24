import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-helpers';
import { approveTask, cancelTask } from '@/server-lib/simple-autonomous-orchestrator';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    
    const body = await req.json();
    const { taskId, action } = body;
    
    if (!taskId) {
      return NextResponse.json({ error: 'Missing taskId parameter' }, { status: 400 });
    }

    if (!action || (action !== 'approve' && action !== 'cancel')) {
      return NextResponse.json({ error: 'Invalid action. Must be "approve" or "cancel"' }, { status: 400 });
    }

    if (action === 'approve') {
      await approveTask(taskId);
      return NextResponse.json({ 
        success: true, 
        message: 'Task approved successfully'
      });
    } else {
      await cancelTask(taskId);
      return NextResponse.json({ 
        success: true, 
        message: 'Task cancelled successfully'
      });
    }

  } catch (error) {
    console.error('Error handling task action:', error);
    return NextResponse.json(
      { error: 'Failed to handle task action', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}