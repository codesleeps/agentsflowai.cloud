/**
 * Simplified Autonomous Agent Orchestration System
 * 
 * Core implementation focusing on essential functionality
 */

import { routeMCPRequest } from "./mcp-router-agent";
import { executeSimpleGeneration } from "./ai-fallback-handler";
import { db } from "./prisma";
import {
  MCPRouterRequest,
  MCPToolRoute,
  MCPToolExecutionResult
} from "@/shared/models/mcp-types";

// ==================== ENUMS AND INTERFACES ====================

export enum TaskExecutionState {
  ANALYZING = "ANALYZING",
  PLANNING = "PLANNING", 
  AWAITING_APPROVAL = "AWAITING_APPROVAL",
  EXECUTING = "EXECUTING",
  VERIFYING = "VERIFYING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED"
}

export interface ComplexityResult {
  level: 'simple' | 'medium' | 'complex';
  score: number;
  estimatedSteps: number;
  reasoning: string;
  suggestedTools: string[];
}

export interface TaskAnalysis {
  complexity: ComplexityResult;
  requiredTools: string[];
  estimatedDuration: number;
  risks: string[];
  dependencies: string[];
}

export interface TaskExecutionContext {
  taskId: string;
  userId: string;
  agentId: string;
  originalPrompt: string;
  currentState: TaskExecutionState;
  complexity: ComplexityResult;
  analysisResults?: TaskAnalysis;
  executionPlan?: any;
  executionResults?: MCPToolExecutionResult[];
  metadata: {
    startTime: Date;
    toolsUsed: string[];
    totalCost: number;
    totalDuration: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

// ==================== STATE TRANSITION VALIDATION ====================

const VALID_STATE_TRANSITIONS: Record<TaskExecutionState, TaskExecutionState[]> = {
  [TaskExecutionState.ANALYZING]: [TaskExecutionState.PLANNING],
  [TaskExecutionState.PLANNING]: [TaskExecutionState.AWAITING_APPROVAL],
  [TaskExecutionState.AWAITING_APPROVAL]: [TaskExecutionState.EXECUTING, TaskExecutionState.CANCELLED],
  [TaskExecutionState.EXECUTING]: [TaskExecutionState.VERIFYING],
  [TaskExecutionState.VERIFYING]: [TaskExecutionState.COMPLETED, TaskExecutionState.FAILED, TaskExecutionState.EXECUTING],
  [TaskExecutionState.COMPLETED]: [],
  [TaskExecutionState.FAILED]: [],
  [TaskExecutionState.CANCELLED]: []
};

function isValidTransition(from: TaskExecutionState, to: TaskExecutionState): boolean {
  return VALID_STATE_TRANSITIONS[from].includes(to);
}

// ==================== COMPLEXITY DETECTION ====================

async function detectTaskComplexity(prompt: string): Promise<ComplexityResult> {
  // Simple pattern-based analysis for now
  const lowerPrompt = prompt.toLowerCase();
  
  let score = 0;
  const patterns = {
    simple: /fix|update|change|modify|correct|typo|color|text/i,
    medium: /add|create|implement|feature|component|function/i,
    complex: /build|architecture|integrate|authentication|database|api/i
  };

  if (patterns.simple.test(lowerPrompt)) score += 20;
  if (patterns.medium.test(lowerPrompt)) score += 40;
  if (patterns.complex.test(lowerPrompt)) score += 60;

  // File mentions
  const fileMatches = (prompt.match(/\.[a-z]{1,4}\b/gi) || []).length;
  score += Math.min(fileMatches * 10, 30);

  let level: 'simple' | 'medium' | 'complex' = 'simple';
  let estimatedSteps = 1;

  if (score > 70) {
    level = 'complex';
    estimatedSteps = 8;
  } else if (score > 30) {
    level = 'medium';
    estimatedSteps = 4;
  } else {
    estimatedSteps = 2;
  }

  return {
    level,
    score,
    estimatedSteps,
    reasoning: `Pattern-based analysis: ${score} points`,
    suggestedTools: level === 'complex' ? ['context7', 'fetch'] : ['context7']
  };
}

// ==================== MAIN ORCHESTRATOR CLASS ====================

export class AutonomousAgentOrchestrator {
  // ==================== TASK INITIALIZATION ====================
  
  async initializeTask(userId: string, agentId: string, prompt: string): Promise<string> {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const initialContext: any = {
      taskId,
      userId,
      agentId,
      originalPrompt: prompt,
      currentState: TaskExecutionState.ANALYZING,
      complexity: {
        level: 'simple',
        score: 0,
        estimatedSteps: 0,
        reasoning: 'Initializing...',
        suggestedTools: []
      },
      metadata: {
        startTime: new Date().toISOString(),
        toolsUsed: [],
        totalCost: 0,
        totalDuration: 0
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Create database record
    await db.workflowExecution.create({
      data: {
        id: taskId,
        workflow_id: agentId,
        trigger_type: 'autonomous_task',
        status: 'running',
        trigger_data: initialContext,
        started_at: new Date()
      }
    });

    console.log(`[Orchestrator] Initialized task ${taskId} for user ${userId}`);

    // Start the workflow asynchronously
    setImmediate(() => this.executeWorkflow(taskId));

    return taskId;
  }

  // ==================== STATE HANDLERS ====================

  private async handleAnalyzeState(taskId: string): Promise<void> {
    const execution = await db.workflowExecution.findUnique({ where: { id: taskId } });
    if (!execution?.trigger_data) return;

    const context = execution.trigger_data as any;
    console.log(`[Orchestrator] Analyzing task ${taskId}: "${context.originalPrompt}"`);
    
    const complexity = await detectTaskComplexity(context.originalPrompt);

    const analysis: TaskAnalysis = {
      complexity,
      requiredTools: complexity.suggestedTools,
      estimatedDuration: complexity.estimatedSteps * 30,
      risks: [],
      dependencies: []
    };

    // Update context
    const updatedContext = {
      ...context,
      complexity,
      analysisResults: analysis,
      currentState: TaskExecutionState.PLANNING,
      updatedAt: new Date().toISOString()
    };

    await db.workflowExecution.update({
      where: { id: taskId },
      data: {
        trigger_data: updatedContext,
        status: 'running'
      }
    });

    // Log analysis
    await db.workflowExecutionLog.create({
      data: {
        execution_id: taskId,
        action_type: 'complexity_analyzed',
        input_data: { prompt: context.originalPrompt },
        output_data: { complexity: JSON.stringify(complexity) },
        created_at: new Date()
      }
    });

    console.log(`[Orchestrator] Task ${taskId} complexity: ${complexity.level} (${complexity.score})`);
  }

  private async handlePlanningState(taskId: string): Promise<void> {
    const execution = await db.workflowExecution.findUnique({ where: { id: taskId } });
    if (!execution?.trigger_data) return;

    const context = execution.trigger_data as any;
    console.log(`[Orchestrator] Planning task ${taskId}`);

    // Simple plan generation
    const executionPlan = this.generateExecutionPlan(context);

    const updatedContext = {
      ...context,
      executionPlan,
      currentState: TaskExecutionState.AWAITING_APPROVAL,
      updatedAt: new Date().toISOString()
    };

    await db.workflowExecution.update({
      where: { id: taskId },
      data: {
        trigger_data: updatedContext,
        status: 'waiting_approval'
      }
    });

    await db.workflowExecutionLog.create({
      data: {
        execution_id: taskId,
        action_type: 'plan_generated',
        input_data: { complexity: context.complexity.level },
        output_data: { planSteps: executionPlan.steps?.length || 0 },
        created_at: new Date()
      }
    });

    console.log(`[Orchestrator] Task ${taskId} plan generated with ${executionPlan.steps?.length || 0} steps`);
  }

  private async handleExecutingState(taskId: string): Promise<void> {
    const execution = await db.workflowExecution.findUnique({ where: { id: taskId } });
    if (!execution?.trigger_data) return;

    const context = execution.trigger_data as any;
    console.log(`[Orchestrator] Executing task ${taskId}`);

    if (!context.executionPlan) {
      throw new Error('No execution plan available');
    }

    const results: MCPToolExecutionResult[] = [];
    
    try {
      // Execute plan steps
      for (const step of context.executionPlan.steps || []) {
        const toolResults = await this.executeToolChain(step.tools);
        results.push(...toolResults);
      }

      const updatedContext = {
        ...context,
        executionResults: results,
        currentState: TaskExecutionState.VERIFYING,
        updatedAt: new Date().toISOString()
      };

      await db.workflowExecution.update({
        where: { id: taskId },
        data: {
          trigger_data: updatedContext
        }
      });

      await db.workflowExecutionLog.create({
        data: {
          execution_id: taskId,
          action_type: 'execution_completed',
          input_data: { steps: context.executionPlan.steps?.length || 0 },
          output_data: { results: results.length },
          created_at: new Date()
        }
      });

    } catch (error) {
      console.error(`[Orchestrator] Execution failed for task ${taskId}:`, error);
      
      await db.workflowExecution.update({
        where: { id: taskId },
        data: {
          status: 'failed',
          completed_at: new Date()
        }
      });

      await db.workflowExecutionLog.create({
        data: {
          execution_id: taskId,
          action_type: 'execution_failed',
          input_data: { error: error instanceof Error ? error.message : String(error) },
          output_data: {},
          created_at: new Date()
        }
      });
    }
  }

  private async handleVerifyingState(taskId: string): Promise<void> {
    const execution = await db.workflowExecution.findUnique({ where: { id: taskId } });
    if (!execution?.trigger_data) return;

    const context = execution.trigger_data as any;
    const executionResults = context.executionResults || [];
    const failedResults = executionResults.filter((r: any) => !r.success);
    
    if (failedResults.length > 0) {
      await db.workflowExecution.update({
        where: { id: taskId },
        data: {
          status: 'failed',
          completed_at: new Date()
        }
      });

      await db.workflowExecutionLog.create({
        data: {
          execution_id: taskId,
          action_type: 'verification_failed',
          input_data: { failedTools: failedResults.length },
          output_data: {},
          created_at: new Date()
        }
      });
    } else {
      await db.workflowExecution.update({
        where: { id: taskId },
        data: {
          status: 'completed',
          completed_at: new Date()
        }
      });

      await db.workflowExecutionLog.create({
        data: {
          execution_id: taskId,
          action_type: 'verification_passed',
          input_data: { successfulTools: executionResults.length },
          output_data: { totalCost: executionResults.reduce((sum: number, r: any) => sum + r.cost, 0) },
          created_at: new Date()
        }
      });
    }
  }

  // ==================== CORE EXECUTION METHODS ====================

  async executeWorkflow(taskId: string): Promise<void> {
    console.log(`[Orchestrator] Starting workflow execution for task ${taskId}`);

    try {
      while (true) {
        const execution = await db.workflowExecution.findUnique({ where: { id: taskId } });
        if (!execution?.trigger_data) break;

        const context = execution.trigger_data as any;
        const currentState = context.currentState;

        // Check for terminal states
        if ([TaskExecutionState.COMPLETED, TaskExecutionState.FAILED, TaskExecutionState.CANCELLED].includes(currentState as TaskExecutionState)) {
          console.log(`[Orchestrator] Task ${taskId} reached terminal state: ${currentState}`);
          break;
        }

        // Handle each state
        switch (currentState) {
          case TaskExecutionState.ANALYZING:
            await this.handleAnalyzeState(taskId);
            break;
            
          case TaskExecutionState.PLANNING:
            await this.handlePlanningState(taskId);
            break;
            
          case TaskExecutionState.AWAITING_APPROVAL:
            // Exit loop and wait for external approval
            console.log(`[Orchestrator] Task ${taskId} awaiting approval`);
            return;
            
          case TaskExecutionState.EXECUTING:
            await this.handleExecutingState(taskId);
            break;
            
          case TaskExecutionState.VERIFYING:
            await this.handleVerifyingState(taskId);
            break;
        }

        // Small delay to prevent tight loops
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } catch (error) {
      console.error(`[Orchestrator] Workflow execution failed for task ${taskId}:`, error);
      
      await db.workflowExecution.update({
        where: { id: taskId },
        data: {
          status: 'failed',
          completed_at: new Date()
        }
      });
    }
  }

  // ==================== TOOL EXECUTION ====================

  private async executeToolChain(tools: MCPToolRoute[]): Promise<MCPToolExecutionResult[]> {
    const results: MCPToolExecutionResult[] = [];
    
    for (const toolRoute of tools) {
      try {
        const request: MCPRouterRequest = {
          query: `Execute tool: ${toolRoute.toolName}`,
          userId: 'system',
          context: {
            tool: toolRoute.toolName,
            server: toolRoute.serverName
          },
          preferences: {
            maxTools: 1,
            enableOrchestration: false
          }
        };

        const response = await routeMCPRequest(request);
        
        const result: MCPToolExecutionResult = {
          toolRoute,
          success: response.executionResults.some(r => r.success),
          result: response.executionResults.find(r => r.success)?.result,
          error: response.error,
          cost: response.totalCost,
          executionTime: response.executionTime,
          retryCount: 0
        };

        results.push(result);

      } catch (error) {
        const result: MCPToolExecutionResult = {
          toolRoute,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          cost: 0,
          executionTime: 0,
          retryCount: 0
        };

        results.push(result);
      }
    }

    return results;
  }

  // ==================== HELPER METHODS ====================

  private generateExecutionPlan(context: any): any {
    const steps = [];
    
    switch (context.complexity.level) {
      case 'simple':
        steps.push({
          id: 'step_1',
          description: 'Execute single tool operation',
          tools: [{
            serverName: 'context7',
            toolName: 'search',
            parameters: { query: context.originalPrompt },
            priority: 1
          }]
        });
        break;
        
      case 'medium':
        steps.push({
          id: 'step_1',
          description: 'Research and gather information',
          tools: [{
            serverName: 'context7',
            toolName: 'search',
            parameters: { query: context.originalPrompt },
            priority: 1
          }]
        });
        break;
        
      case 'complex':
        steps.push({
          id: 'step_1',
          description: 'Initial research phase',
          tools: [{
            serverName: 'context7',
            toolName: 'search',
            parameters: { query: context.originalPrompt },
            priority: 1
          }]
        });
        steps.push({
          id: 'step_2',
          description: 'Data processing',
          tools: [{
            serverName: 'fetch',
            toolName: 'fetch_and_extract',
            parameters: { url: 'https://example.com' },
            priority: 1
          }]
        });
        break;
    }

    return { steps };
  }

  // ==================== PUBLIC INTERFACE ====================

  async getTaskContext(taskId: string): Promise<any> {
    const execution = await db.workflowExecution.findUnique({ where: { id: taskId } });
    return execution?.trigger_data || null;
  }

  async approveTask(taskId: string): Promise<void> {
    const execution = await db.workflowExecution.findUnique({ where: { id: taskId } });
    if (!execution?.trigger_data) return;

    const context = execution.trigger_data as any;
    
    if (context.currentState !== TaskExecutionState.AWAITING_APPROVAL) {
      throw new Error('Task is not awaiting approval');
    }

    const updatedContext = {
      ...context,
      currentState: TaskExecutionState.EXECUTING,
      updatedAt: new Date().toISOString()
    };

    await db.workflowExecution.update({
      where: { id: taskId },
      data: {
        trigger_data: updatedContext,
        status: 'running'
      }
    });

    await db.workflowExecutionLog.create({
      data: {
        execution_id: taskId,
        action_type: 'task_approved',
        input_data: {},
        output_data: {},
        created_at: new Date()
      }
    });

    // Resume workflow execution
    setImmediate(() => this.executeWorkflow(taskId));
  }

  async cancelTask(taskId: string): Promise<void> {
    await db.workflowExecution.update({
      where: { id: taskId },
      data: {
        status: 'failed',
        completed_at: new Date()
      }
    });
    
    await db.workflowExecutionLog.create({
      data: {
        execution_id: taskId,
        action_type: 'task_cancelled',
        input_data: {},
        output_data: {},
        created_at: new Date()
      }
    });
  }
}

// ==================== EXPORTED FUNCTIONS ====================

export async function createAutonomousTask(
  userId: string, 
  agentId: string, 
  prompt: string
): Promise<string> {
  const orchestrator = new AutonomousAgentOrchestrator();
  return orchestrator.initializeTask(userId, agentId, prompt);
}

export async function getTaskStatus(taskId: string): Promise<any> {
  const orchestrator = new AutonomousAgentOrchestrator();
  return orchestrator.getTaskContext(taskId);
}

export async function approveTask(taskId: string): Promise<void> {
  const orchestrator = new AutonomousAgentOrchestrator();
  return orchestrator.approveTask(taskId);
}

export async function cancelTask(taskId: string): Promise<void> {
  const orchestrator = new AutonomousAgentOrchestrator();
  return orchestrator.cancelTask(taskId);
}