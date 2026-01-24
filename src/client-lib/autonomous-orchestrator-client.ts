/**
 * Client library for interacting with the Autonomous Agent Orchestration API
 */

interface TaskCreationRequest {
  agentId: string;
  prompt: string;
}

interface TaskStatusResponse {
  success: boolean;
  task?: any;
  error?: string;
}

interface TaskActionResult {
  success: boolean;
  message?: string;
  error?: string;
}

export class AutonomousOrchestratorClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api/orchestrator') {
    this.baseUrl = baseUrl;
  }

  /**
   * Create a new autonomous task
   */
  async createTask(agentId: string, prompt: string): Promise<{ taskId: string } | { error: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ agentId, prompt }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create task');
      }

      return { taskId: data.taskId };
    } catch (error) {
      console.error('Error creating autonomous task:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get task status and context
   */
  async getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/tasks?taskId=${encodeURIComponent(taskId)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to fetch task status' };
      }

      return { success: true, task: data.task };
    } catch (error) {
      console.error('Error fetching task status:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Approve a task for execution
   */
  async approveTask(taskId: string): Promise<TaskActionResult> {
    try {
      const response = await fetch(`${this.baseUrl}/tasks/${taskId}/approval`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskId, action: 'approve' }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to approve task' };
      }

      return { success: true, message: data.message };
    } catch (error) {
      console.error('Error approving task:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Cancel a task
   */
  async cancelTask(taskId: string): Promise<TaskActionResult> {
    try {
      const response = await fetch(`${this.baseUrl}/tasks/${taskId}/approval`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskId, action: 'cancel' }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to cancel task' };
      }

      return { success: true, message: data.message };
    } catch (error) {
      console.error('Error canceling task:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Poll for task updates with exponential backoff
   */
  async pollTaskStatus(
    taskId: string, 
    onStatusUpdate: (task: any) => void,
    onComplete?: (task: any) => void,
    onError?: (error: string) => void,
    maxRetries: number = 30
  ): Promise<void> {
    let retries = 0;
    const baseDelay = 1000; // 1 second

    const poll = async () => {
      if (retries >= maxRetries) {
        onError?.('Max polling retries exceeded');
        return;
      }

      try {
        const result = await this.getTaskStatus(taskId);
        
        if (!result.success) {
          throw new Error(result.error);
        }

        const task = result.task;
        onStatusUpdate(task);

        // Check if task is complete
        if (task.currentState === 'COMPLETED' || task.currentState === 'FAILED' || task.currentState === 'CANCELLED') {
          onComplete?.(task);
          return;
        }

        // Continue polling with exponential backoff
        retries++;
        const delay = baseDelay * Math.pow(1.5, retries);
        setTimeout(poll, delay);

      } catch (error) {
        console.error('Polling error:', error);
        onError?.(error instanceof Error ? error.message : 'Unknown error');
      }
    };

    // Start polling
    poll();
  }
}

// Export singleton instance
export const autonomousOrchestrator = new AutonomousOrchestratorClient();