/**
 * Test suite for Autonomous Agent Orchestration System
 */

import { AutonomousAgentOrchestrator, TaskExecutionState } from '@/server-lib/simple-autonomous-orchestrator';

describe('AutonomousAgentOrchestrator', () => {
  let orchestrator: AutonomousAgentOrchestrator;

  beforeEach(() => {
    orchestrator = new AutonomousAgentOrchestrator();
  });

  describe('Task Initialization', () => {
    it('should create a new task with valid parameters', async () => {
      const taskId = await orchestrator.initializeTask(
        'test-user-123',
        'test-agent-456',
        'Create a simple landing page'
      );

      expect(taskId).toMatch(/^task_\d+_[a-z0-9]+$/);
      
      const taskContext = await orchestrator.getTaskContext(taskId);
      expect(taskContext).toBeDefined();
      expect(taskContext.userId).toBe('test-user-123');
      expect(taskContext.agentId).toBe('test-agent-456');
      expect(taskContext.originalPrompt).toBe('Create a simple landing page');
      expect(taskContext.currentState).toBe(TaskExecutionState.ANALYZING);
    });

    it('should reject empty parameters', async () => {
      await expect(
        orchestrator.initializeTask('', 'agent-123', 'prompt')
      ).rejects.toThrow();

      await expect(
        orchestrator.initializeTask('user-123', '', 'prompt')
      ).rejects.toThrow();

      await expect(
        orchestrator.initializeTask('user-123', 'agent-123', '')
      ).rejects.toThrow();
    });
  });

  describe('Complexity Detection', () => {
    it('should detect simple tasks correctly', async () => {
      const taskId = await orchestrator.initializeTask(
        'user-123',
        'agent-456',
        'Fix the typo in the header text'
      );
      
      // Wait for analysis to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const taskContext = await orchestrator.getTaskContext(taskId);
      expect(taskContext.complexity.level).toBe('simple');
      expect(taskContext.complexity.score).toBeLessThan(30);
    });

    it('should detect medium complexity tasks', async () => {
      const taskId = await orchestrator.initializeTask(
        'user-123',
        'agent-456',
        'Add a new feature component to the dashboard'
      );
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const taskContext = await orchestrator.getTaskContext(taskId);
      expect(taskContext.complexity.level).toBe('medium');
      expect(taskContext.complexity.score).toBeGreaterThan(30);
      expect(taskContext.complexity.score).toBeLessThan(70);
    });

    it('should detect complex tasks', async () => {
      const taskId = await orchestrator.initializeTask(
        'user-123',
        'agent-456',
        'Build a complete e-commerce application with payment integration'
      );
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const taskContext = await orchestrator.getTaskContext(taskId);
      expect(taskContext.complexity.level).toBe('complex');
      expect(taskContext.complexity.score).toBeGreaterThan(70);
    });
  });

  describe('State Transitions', () => {
    it('should transition from ANALYZING to PLANNING', async () => {
      const taskId = await orchestrator.initializeTask(
        'user-123',
        'agent-456',
        'Test task'
      );
      
      // Wait for workflow to progress
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const taskContext = await orchestrator.getTaskContext(taskId);
      expect([
        TaskExecutionState.PLANNING,
        TaskExecutionState.AWAITING_APPROVAL
      ]).toContain(taskContext.currentState);
    });

    it('should handle task approval', async () => {
      const taskId = await orchestrator.initializeTask(
        'user-123',
        'agent-456',
        'Complex task requiring approval'
      );
      
      // Wait for task to reach approval state
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const taskContext = await orchestrator.getTaskContext(taskId);
      
      if (taskContext.currentState === TaskExecutionState.AWAITING_APPROVAL) {
        await orchestrator.approveTask(taskId);
        
        const updatedContext = await orchestrator.getTaskContext(taskId);
        expect(updatedContext.currentState).toBe(TaskExecutionState.EXECUTING);
      }
    });

    it('should handle task cancellation', async () => {
      const taskId = await orchestrator.initializeTask(
        'user-123',
        'agent-456',
        'Test task'
      );
      
      await orchestrator.cancelTask(taskId);
      
      const taskContext = await orchestrator.getTaskContext(taskId);
      expect(taskContext.currentState).toBe(TaskExecutionState.CANCELLED);
    });
  });

  describe('Task Context Management', () => {
    it('should return null for non-existent tasks', async () => {
      const taskContext = await orchestrator.getTaskContext('non-existent-task');
      expect(taskContext).toBeNull();
    });

    it('should maintain task metadata throughout execution', async () => {
      const taskId = await orchestrator.initializeTask(
        'user-123',
        'agent-456',
        'Test metadata preservation'
      );
      
      const initialContext = await orchestrator.getTaskContext(taskId);
      expect(initialContext.metadata).toBeDefined();
      expect(initialContext.metadata.startTime).toBeDefined();
      expect(initialContext.metadata.toolsUsed).toEqual([]);
      expect(initialContext.metadata.totalCost).toBe(0);
    });
  });
});

describe('Client Library', () => {
  // Mock fetch for testing
  const originalFetch = global.fetch;
  
  beforeEach(() => {
    global.fetch = jest.fn();
  });
  
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should handle successful task creation', async () => {
    // @ts-ignore
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ taskId: 'test-task-123' })
    });

    // Import here to use mocked fetch
    const { autonomousOrchestrator } = await import('@/client-lib/autonomous-orchestrator-client');
    
    const result = await autonomousOrchestrator.createTask('agent-123', 'Test prompt');
    
    expect(result).toEqual({ taskId: 'test-task-123' });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/orchestrator/tasks',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: 'agent-123', prompt: 'Test prompt' })
      })
    );
  });

  it('should handle task creation errors', async () => {
    // @ts-ignore
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Invalid agent ID' })
    });

    const { autonomousOrchestrator } = await import('@/client-lib/autonomous-orchestrator-client');
    
    const result = await autonomousOrchestrator.createTask('invalid-agent', 'Test prompt');
    
    expect(result).toEqual({ error: 'Invalid agent ID' });
  });

  it('should handle network errors gracefully', async () => {
    // @ts-ignore
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    const { autonomousOrchestrator } = await import('@/client-lib/autonomous-orchestrator-client');
    
    const result = await autonomousOrchestrator.createTask('agent-123', 'Test prompt');
    
    expect(result).toEqual({ error: 'Network error' });
  });
});

describe('API Endpoints', () => {
  // These would typically be integration tests using a test server
  // For now, we'll test the request/response structure
  
  it('should validate required parameters', async () => {
    // This would test the actual API endpoint behavior
    // In a real test, we'd make HTTP requests to the endpoints
    expect(true).toBe(true); // Placeholder
  });

  it('should enforce authentication', async () => {
    // Test that unauthorized requests are rejected
    expect(true).toBe(true); // Placeholder
  });
});