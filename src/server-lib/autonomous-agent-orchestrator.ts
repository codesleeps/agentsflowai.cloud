/**
 * Autonomous Agent Orchestration System
 * 
 * State machine-based orchestrator for autonomous multi-step task execution
 * Integrates with existing MCP router, workflow models, and AI fallback handler
 */

import { routeMCPRequest } from "./mcp-router-agent";
import { executeSimpleGeneration } from "./ai-fallback-handler";
import { getRedisClient } from "./redis-cache";
import { db } from "./prisma";
import {
  MCPRouterRequest,
  MCPToolRoute,
  MCPToolExecutionResult,
  MCPIntentType
} from "@/shared/models/mcp-types";
import { WorkflowExecution, WorkflowExecutionLog } from "@prisma/client";

// ==================== ENUMS AND INTERFACES ====================

export enum TaskExecutionState {
  ANALYZING = "ANALYZING",
  PLANNING = "PLANNING", 
  AWAITING_APPROVAL = "AWAITING_APPROVAL",
  EXECUTING = "EXECUTING",
  VERIFYING = "VERIFYING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
  PAUSED = "PAUSED"
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

export interface StateTransition {
  from: TaskExecutionState;
  to: TaskExecutionState;
  timestamp: Date;
  reason?: string;
}

export interface TaskMetadata {
  startTime: Date;
  stateTransitions: StateTransition[];
  toolsUsed: string[];
  totalCost: number;
  totalDuration: number;
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
  verificationResults?: any;
  metadata: TaskMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskConstraints {
  maxExecutionTime: number;  // seconds
  maxCost: number;          // USD
  maxTools: number;         // tool executions
  maxRetries: number;
}

// ==================== STATE TRANSITION VALIDATION ====================

const VALID_STATE_TRANSITIONS: Record<TaskExecutionState, TaskExecutionState[]> = {
  [TaskExecutionState.ANALYZING]: [TaskExecutionState.PLANNING],
  [TaskExecutionState.PLANNING]: [TaskExecutionState.AWAITING_APPROVAL],
  [TaskExecutionState.AWAITING_APPROVAL]: [TaskExecutionState.EXECUTING, TaskExecutionState.CANCELLED],
  [TaskExecutionState.EXECUTING]: [TaskExecutionState.VERIFYING, TaskExecutionState.PAUSED],
  [TaskExecutionState.VERIFYING]: [TaskExecutionState.COMPLETED, TaskExecutionState.FAILED, TaskExecutionState.EXECUTING],
  [TaskExecutionState.COMPLETED]: [],
  [TaskExecutionState.FAILED]: [],
  [TaskExecutionState.CANCELLED]: [],
  [TaskExecutionState.PAUSED]: [TaskExecutionState.EXECUTING, TaskExecutionState.CANCELLED]
};

function isValidTransition(from: TaskExecutionState, to: TaskExecutionState): boolean {
  return VALID_STATE_TRANSITIONS[from].includes(to);
}

// ==================== COMPLEXITY DETECTION ====================

class TaskComplexityAnalyzer {
  private async getRedis() {
    const redisClient = getRedisClient();
    if (redisClient instanceof Promise) {
      return await redisClient;
    }
    return redisClient;
  }

  async detectComplexity(prompt: string, context?: Record<string, any>): Promise<ComplexityResult> {
    const redis = await this.getRedis();
    const cacheKey = `task:complexity:${this.generateCacheKey(prompt, context)}`;
    
    // Try cache first
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Redis cache unavailable for complexity detection');
    }

    // AI-powered analysis
    const systemPrompt = `You are a task complexity analyzer. Analyze the following user request and classify its complexity.

Classification criteria:
- Simple (0-30): Single-file changes, basic queries, straightforward operations
- Medium (31-70): Multi-file changes, feature additions, moderate refactoring  
- Complex (71-100): Full feature development, architectural changes, multi-system integration

Return ONLY valid JSON with this exact structure:
{
  "level": "simple|medium|complex",
  "score": number (0-100),
  "estimatedSteps": number,
  "reasoning": "brief explanation",
  "suggestedTools": ["tool1", "tool2"]
}`;

    const userPrompt = `Analyze this task request: "${prompt}"
${context ? `Context: ${JSON.stringify(context)}` : ''}`;

    try {
      const aiResponse = await executeSimpleGeneration({
        prompt: `${systemPrompt}\n\n${userPrompt}`,
        enableWebSearch: false,
        enableDeepResearch: false,
        reasoningEffort: 'low',
        modelProvider: 'openai',
        userId: 'system-analyzer'
      });

      const result = this.parseComplexityResponse(aiResponse.text);
      
      // Cache for 1 hour
      try {
        await redis.setEx(cacheKey, 3600, JSON.stringify(result));
      } catch (error) {
        console.warn('Failed to cache complexity result');
      }

      return result;
    } catch (error) {
      console.error('Complexity analysis failed:', error);
      // Fallback to pattern-based analysis
      return this.fallbackComplexityAnalysis(prompt);
    }
  }

  private parseComplexityResponse(response: string): ComplexityResult {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          level: parsed.level,
          score: parsed.score,
          estimatedSteps: parsed.estimatedSteps,
          reasoning: parsed.reasoning,
          suggestedTools: parsed.suggestedTools || []
        };
      }
    } catch (error) {
      console.warn('Failed to parse AI complexity response:', error);
    }
    
    return this.fallbackComplexityAnalysis('');
  }

  private fallbackComplexityAnalysis(prompt: string): ComplexityResult {
    const lowerPrompt = prompt.toLowerCase();
    
    // Pattern-based scoring
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

    // Action verbs complexity
    const actionVerbs = (prompt.match(/\b(create|implement|build|design|architect)\b/gi) || []).length;
    score += actionVerbs * 15;

    let level: 'simple' | 'medium' | 'complex' = 'simple';
    let estimatedSteps = 1;

    if (score > 70) {
      level = 'complex';
      estimatedSteps = 10;
    } else if (score > 30) {
      level = 'medium';
      estimatedSteps = 5;
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

  private generateCacheKey(prompt: string, context?: Record<string, any>): string {
    const content = `${prompt}${context ? JSON.stringify(context) : ''}`;
    return Buffer.from(content).toString('base64').substring(0, 32);
  }
}

// ==================== TASK CONTEXT MANAGER ====================

class TaskContextManager {
  private async getRedis() {
    const redisClient = getRedisClient();
    if (redisClient instanceof Promise) {
      return await redisClient;
    }
    return redisClient;
  }

  async saveContext(taskId: string, context: TaskExecutionContext): Promise<void> {
    const redis = await this.getRedis();
    const dbContext = {
      ...context,
      createdAt: context.createdAt.toISOString(),
      updatedAt: context.updatedAt.toISOString(),
      metadata: {
        ...context.metadata,
        startTime: context.metadata.startTime.toISOString(),
        stateTransitions: context.metadata.stateTransitions.map(st => ({
          ...st,
          timestamp: st.timestamp.toISOString()
        }))
      }
    };

    // Save to Redis (1 hour TTL)
    try {
      await redis.setEx(
        `task:context:${taskId}`,
        3600,
        JSON.stringify(dbContext)
      );
    } catch (error) {
      console.warn('Failed to save context to Redis:', error);
    }

    // Update database
    await db.workflowExecution.update({
      where: { id: taskId },
      data: {
        trigger_data: JSON.stringify(dbContext)
      }
    });
  }

  async loadContext(taskId: string): Promise<TaskExecutionContext> {
    const redis = await this.getRedis();
    // Try Redis first (fast path)
    try {
      const cached = await redis.get(`task:context:${taskId}`);
      if (cached) {
        return this.deserializeContext(JSON.parse(cached));
      }
    } catch (error) {
      console.warn('Redis unavailable, falling back to database');
    }

    // Fallback to database
    const execution = await db.workflowExecution.findUnique({
      where: { id: taskId }
    });

    if (!execution?.trigger_data) {
      throw new Error(`Task context not found for taskId: ${taskId}`);
    }

    const parsedData = typeof execution.trigger_data === 'string' 
      ? JSON.parse(execution.trigger_data) 
      : execution.trigger_data;
    return this.deserializeContext(parsedData as any);
  }

  async updateContext(taskId: string, updates: Partial<TaskExecutionContext>): Promise<void> {
    const currentContext = await this.loadContext(taskId);
    const updatedContext = { ...currentContext, ...updates, updatedAt: new Date() };
    await this.saveContext(taskId, updatedContext);
  }

  async clearContext(taskId: string): Promise<void> {
    const redis = await this.getRedis();
    try {
      await redis.del(`task:context:${taskId}`);
    } catch (error) {
      console.warn('Failed to clear Redis context:', error);
    }
  }

  private deserializeContext(data: any): TaskExecutionContext {
    return {
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      complexity: {
        ...data.complexity,
        level: data.complexity.level,
        score: data.complexity.score,
        estimatedSteps: data.complexity.estimatedSteps,
        reasoning: data.complexity.reasoning,
        suggestedTools: data.complexity.suggestedTools
      },
      metadata: {
        ...data.metadata,
        startTime: new Date(data.metadata.startTime),
        stateTransitions: data.metadata.stateTransitions.map((st: any) => ({
          ...st,
          timestamp: new Date(st.timestamp)
        }))
      }
    };
  }
}

// ==================== MAIN ORCHESTRATOR CLASS ====================

export class AutonomousAgentOrchestrator {
  private complexityAnalyzer = new TaskComplexityAnalyzer();
  private contextManager = new TaskContextManager();
  private redis = getRedisClient();

  // ==================== TASK INITIALIZATION ====================
  
  async initializeTask(userId: string, agentId: string, prompt: string): Promise<string> {
    const taskId = this.generateTaskId();
    
    const initialContext: TaskExecutionContext = {
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
        startTime: new Date(),
        stateTransitions: [],
        toolsUsed: [],
        totalCost: 0,
        totalDuration: 0
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Create database record
    await db.workflowExecution.create({
      data: {
        id: taskId,
        workflow_id: agentId,
        trigger_type: 'autonomous_task',
        status: 'running',
        trigger_data: JSON.stringify(initialContext),
        started_at: new Date()
      }
    });

    // Save initial context
    await this.contextManager.saveContext(taskId, initialContext);

    // Log initialization
    await this.logExecution(taskId, 'task_initialized', {
      userId,
      agentId,
      promptLength: prompt.length
    }, {});

    console.log(`[Orchestrator] Initialized task ${taskId} for user ${userId}`);

    return taskId;
  }

  // ==================== STATE HANDLERS ====================

  async handleAnalyzeState(taskId: string): Promise<void> {
    const context = await this.contextManager.loadContext(taskId);
    
    console.log(`[Orchestrator] Analyzing task ${taskId}: "${context.originalPrompt}"`);
    
    const complexity = await this.complexityAnalyzer.detectComplexity(
      context.originalPrompt
    );

    const analysis: TaskAnalysis = {
      complexity,
      requiredTools: complexity.suggestedTools,
      estimatedDuration: complexity.estimatedSteps * 30, // 30 seconds per step estimate
      risks: [],
      dependencies: []
    };

    // Update context with analysis results
    await this.contextManager.updateContext(taskId, {
      complexity,
      analysisResults: analysis
    });

    // Log analysis
    await this.logExecution(taskId, 'complexity_analyzed', {
      originalPrompt: context.originalPrompt
    }, {
      complexity: analysis.complexity,
      estimatedDuration: analysis.estimatedDuration
    });

    // Transition to planning state
    await this.transitionState(taskId, TaskExecutionState.PLANNING);
  }

  async handlePlanningState(taskId: string): Promise<void> {
    const context = await this.contextManager.loadContext(taskId);
    
    console.log(`[Orchestrator] Planning task ${taskId} (complexity: ${context.complexity.level})`);

    // For now, we'll create a simple plan based on complexity
    // In a full implementation, this would delegate to a separate planner
    const executionPlan = this.generateExecutionPlan(context);

    await this.contextManager.updateContext(taskId, {
      executionPlan
    });

    // Log planning
    await this.logExecution(taskId, 'plan_generated', {
      complexityLevel: context.complexity.level
    }, {
      planSteps: executionPlan.steps?.length || 0
    });

    // Transition to awaiting approval
    await this.transitionState(taskId, TaskExecutionState.AWAITING_APPROVAL);
  }

  async handleExecutingState(taskId: string): Promise<void> {
    const context = await this.contextManager.loadContext(taskId);
    
    console.log(`[Orchestrator] Executing task ${taskId}`);

    if (!context.executionPlan) {
      throw new Error('No execution plan available');
    }

    const results: MCPToolExecutionResult[] = [];
    
    try {
      // Execute plan steps
      for (const step of context.executionPlan.steps || []) {
        const toolResults = await this.executeToolChain(taskId, step.tools);
        results.push(...toolResults);
        
        // Update context with partial results
        await this.contextManager.updateContext(taskId, {
          executionResults: [...(context.executionResults || []), ...toolResults]
        });
      }

      // Update final execution results
      await this.contextManager.updateContext(taskId, {
        executionResults: results
      });

      // Log execution completion
      await this.logExecution(taskId, 'execution_completed', {
        stepsExecuted: context.executionPlan.steps?.length || 0
      }, {
        totalResults: results.length,
        successfulResults: results.filter(r => r.success).length
      });

      // Transition to verifying state
      await this.transitionState(taskId, TaskExecutionState.VERIFYING);

    } catch (error) {
      console.error(`[Orchestrator] Execution failed for task ${taskId}:`, error);
      
      await this.logExecution(taskId, 'execution_failed', {
        error: error instanceof Error ? error.message : String(error)
      }, {});
      
      await this.transitionState(taskId, TaskExecutionState.FAILED);
    }
  }

  async handleVerifyingState(taskId: string): Promise<void> {
    const context = await this.contextManager.loadContext(taskId);
    
    console.log(`[Orchestrator] Verifying task ${taskId}`);

    // Simple verification - check if any tools failed
    const executionResults = context.executionResults || [];
    const failedResults = executionResults.filter(r => !r.success);
    
    if (failedResults.length > 0) {
      const errorMessage = failedResults.map(r => r.error).join('; ');
      
      await this.logExecution(taskId, 'verification_failed', {
        failedTools: failedResults.length
      }, {
        errors: errorMessage
      });

      await this.transitionState(taskId, TaskExecutionState.FAILED);
    } else {
      // Success!
      await this.logExecution(taskId, 'verification_passed', {
        successfulTools: executionResults.length
      }, {
        totalCost: executionResults.reduce((sum, r) => sum + r.cost, 0)
      });

      await this.transitionState(taskId, TaskExecutionState.COMPLETED);
    }
  }

  // ==================== CORE EXECUTION METHODS ====================

  async executeWorkflow(taskId: string): Promise<void> {
    console.log(`[Orchestrator] Starting workflow execution for task ${taskId}`);

    try {
      while (true) {
        const context = await this.contextManager.loadContext(taskId);
        const currentState = context.currentState;

        // Check for terminal states
        if ([TaskExecutionState.COMPLETED, TaskExecutionState.FAILED, TaskExecutionState.CANCELLED].includes(currentState)) {
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
            
          case TaskExecutionState.PAUSED:
            // Exit loop and wait for resume
            console.log(`[Orchestrator] Task ${taskId} paused`);
            return;
        }

        // Small delay to prevent tight loops
        await new Promise(resolve => setTimeout(resolve, 100));
      }

    } catch (error) {
      console.error(`[Orchestrator] Workflow execution failed for task ${taskId}:`, error);
      
      await this.logExecution(taskId, 'workflow_error', {
        error: error instanceof Error ? error.message : String(error)
      }, {});
      
      await this.transitionState(taskId, TaskExecutionState.FAILED);
    }
  }

  // ==================== TOOL EXECUTION ====================

  async executeToolChain(taskId: string, tools: MCPToolRoute[]): Promise<MCPToolExecutionResult[]> {
    const results: MCPToolExecutionResult[] = [];
    
    for (const toolRoute of tools) {
      try {
        // Build query incorporating tool parameters
        const paramStr = toolRoute.parameters ? JSON.stringify(toolRoute.parameters) : '{}';
        const query = `Execute ${toolRoute.serverName}.${toolRoute.toolName} with parameters: ${paramStr}`;
        
        const request: MCPRouterRequest = {
          query,
          userId: taskId,
          context: {
            tool: toolRoute.toolName,
            server: toolRoute.serverName,
            parameters: toolRoute.parameters || {}
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

        // Log tool execution
        await this.logExecution(taskId, 'mcp_tool_execution', {
          toolRoute
        }, {
          success: result.success,
          cost: result.cost
        });

        // Update tools used in metadata
        const context = await this.contextManager.loadContext(taskId);
        const toolsUsed = [...new Set([...context.metadata.toolsUsed, `${toolRoute.serverName}.${toolRoute.toolName}`])];
        
        await this.contextManager.updateContext(taskId, {
          metadata: {
            ...context.metadata,
            toolsUsed,
            totalCost: context.metadata.totalCost + result.cost
          }
        });

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

        await this.logExecution(taskId, 'mcp_tool_error', {
          toolRoute,
          error: result.error
        }, {});
      }
    }

    return results;
  }

  // ==================== STATE MANAGEMENT ====================

  async transitionState(taskId: string, newState: TaskExecutionState): Promise<void> {
    const context = await this.contextManager.loadContext(taskId);
    const oldState = context.currentState;

    if (!isValidTransition(oldState, newState)) {
      throw new Error(`Invalid state transition: ${oldState} → ${newState}`);
    }

    const transition: StateTransition = {
      from: oldState,
      to: newState,
      timestamp: new Date(),
      reason: `Automatic transition`
    };

    // Update context
    const updatedMetadata = {
      ...context.metadata,
      stateTransitions: [...context.metadata.stateTransitions, transition]
    };

    await this.contextManager.updateContext(taskId, {
      currentState: newState,
      metadata: updatedMetadata,
      updatedAt: new Date()
    });

    // Update database status
    let dbStatus: string;
    switch (newState) {
      case TaskExecutionState.COMPLETED:
        dbStatus = 'completed';
        break;
      case TaskExecutionState.FAILED:
        dbStatus = 'failed';
        break;
      case TaskExecutionState.CANCELLED:
        dbStatus = 'cancelled';
        break;
      default:
        dbStatus = 'running';
    }

    await db.workflowExecution.update({
      where: { id: taskId },
      data: {
        status: dbStatus,
        ...(newState === TaskExecutionState.COMPLETED || newState === TaskExecutionState.FAILED || newState === TaskExecutionState.CANCELLED
          ? { completed_at: new Date() }
          : {})
      }
    });

    // Log state transition
    await this.logExecution(taskId, 'state_transition', {
      fromState: oldState,
      toState: newState
    }, {
      transitionReason: transition.reason
    });

    console.log(`[Orchestrator] Task ${taskId} transitioned: ${oldState} → ${newState}`);
  }

  // ==================== HELPER METHODS ====================

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateExecutionPlan(context: TaskExecutionContext): any {
    // Simple plan generation based on complexity
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
        steps.push({
          id: 'step_2', 
          description: 'Process and analyze results',
          tools: [{
            serverName: 'fetch',
            toolName: 'fetch_and_extract',
            parameters: { url: 'https://example.com' }, // Placeholder
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
          description: 'Data extraction and processing',
          tools: [{
            serverName: 'fetch',
            toolName: 'fetch_and_extract',
            parameters: { url: 'https://example.com' },
            priority: 1
          }]
        });
        steps.push({
          id: 'step_3',
          description: 'Advanced processing',
          tools: [{
            serverName: 'playwright',
            toolName: 'navigate',
            parameters: { url: 'https://example.com' },
            priority: 1
          }]
        });
        break;
    }

    return { steps };
  }

  private async logExecution(
    taskId: string,
    actionType: string,
    inputData: Record<string, any>,
    outputData: Record<string, any>
  ): Promise<void> {
    await db.workflowExecutionLog.create({
      data: {
        execution_id: taskId,
        action_type: actionType,
        input_data: inputData,
        output_data: outputData,
        created_at: new Date()
      }
    });
  }

  // ==================== PUBLIC INTERFACE ====================

  async getTaskContext(taskId: string): Promise<TaskExecutionContext> {
    return this.contextManager.loadContext(taskId);
  }

  async getTaskStatus(taskId: string): Promise<{ 
    state: TaskExecutionState; 
    progress: number;
    estimatedTimeRemaining: number;
  }> {
    const context = await this.contextManager.loadContext(taskId);
    
    const totalSteps = context.complexity.estimatedSteps;
    const completedSteps = context.executionResults?.length || 0;
    const progress = totalSteps > 0 ? Math.min(completedSteps / totalSteps, 1) : 0;
    
    const elapsed = Date.now() - context.metadata.startTime.getTime();
    const estimatedTotal = context.complexity.estimatedSteps * 30000; // 30 seconds per step
    const estimatedTimeRemaining = Math.max(0, estimatedTotal - elapsed);

    return {
      state: context.currentState,
      progress,
      estimatedTimeRemaining
    };
  }

  async approveTask(taskId: string): Promise<void> {
    const context = await this.contextManager.loadContext(taskId);
    
    if (context.currentState !== TaskExecutionState.AWAITING_APPROVAL) {
      throw new Error('Task is not awaiting approval');
    }

    await this.logExecution(taskId, 'task_approved', {}, {});
    await this.transitionState(taskId, TaskExecutionState.EXECUTING);
    
    // Resume workflow execution
    setImmediate(() => this.executeWorkflow(taskId));
  }

  async cancelTask(taskId: string): Promise<void> {
    const context = await this.contextManager.loadContext(taskId);
    
    if ([TaskExecutionState.COMPLETED, TaskExecutionState.FAILED, TaskExecutionState.CANCELLED].includes(context.currentState)) {
      throw new Error('Cannot cancel task in terminal state');
    }

    await this.logExecution(taskId, 'task_cancelled', {}, {});
    await this.transitionState(taskId, TaskExecutionState.CANCELLED);
    await this.contextManager.clearContext(taskId);
  }

  async pauseTask(taskId: string): Promise<void> {
    const context = await this.contextManager.loadContext(taskId);
    
    if (context.currentState !== TaskExecutionState.EXECUTING) {
      throw new Error('Can only pause executing tasks');
    }

    await this.logExecution(taskId, 'task_paused', {}, {});
    await this.transitionState(taskId, TaskExecutionState.PAUSED);
  }

  async resumeTask(taskId: string): Promise<void> {
    const context = await this.contextManager.loadContext(taskId);
    
    if (context.currentState !== TaskExecutionState.PAUSED) {
      throw new Error('Task is not paused');
    }

    await this.logExecution(taskId, 'task_resumed', {}, {});
    await this.transitionState(taskId, TaskExecutionState.EXECUTING);
    
    // Resume workflow execution
    setImmediate(() => this.executeWorkflow(taskId));
  }

  async retryTask(taskId: string): Promise<void> {
    const context = await this.contextManager.loadContext(taskId);
    
    if (context.currentState !== TaskExecutionState.FAILED) {
      throw new Error('Can only retry failed tasks');
    }

    // Reset to executing state and clear previous results
    await this.contextManager.updateContext(taskId, {
      executionResults: [],
      verificationResults: undefined
    });

    await this.logExecution(taskId, 'task_retry', {}, {});
    await this.transitionState(taskId, TaskExecutionState.EXECUTING);
    
    // Resume workflow execution
    setImmediate(() => this.executeWorkflow(taskId));
  }
}

// ==================== EXPORTED FUNCTIONS ====================

export async function createAutonomousTask(
  userId: string, 
  agentId: string, 
  prompt: string
): Promise<string> {
  const orchestrator = new AutonomousAgentOrchestrator();
  const taskId = await orchestrator.initializeTask(userId, agentId, prompt);
  
  // Start the workflow execution asynchronously
  setImmediate(() => orchestrator.executeWorkflow(taskId));
  
  return taskId;
}

export async function getTaskStatus(taskId: string): Promise<TaskExecutionContext> {
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

export async function pauseTask(taskId: string): Promise<void> {
  const orchestrator = new AutonomousAgentOrchestrator();
  return orchestrator.pauseTask(taskId);
}

export async function resumeTask(taskId: string): Promise<void> {
  const orchestrator = new AutonomousAgentOrchestrator();
  return orchestrator.resumeTask(taskId);
}

export async function retryTask(taskId: string): Promise<void> {
  const orchestrator = new AutonomousAgentOrchestrator();
  return orchestrator.retryTask(taskId);
}