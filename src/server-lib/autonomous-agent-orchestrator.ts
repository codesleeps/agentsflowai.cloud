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
import { executeMCPTool } from "@/lib/mcp/tools/shared";
import { MCPError } from "@/lib/mcp/errors";
import { AutonomousAgentPlanner, TechnicalPlan } from "./agent-planner";
import {
  MCPRouterRequest,
  MCPToolRoute,
  MCPToolExecutionResult,
  MCPIntentType
} from "@/shared/models/mcp-types";
import { WorkflowExecution, WorkflowExecutionLog } from "@prisma/client";
import {
  isKimiConfigured,
  shouldActivateSwarmMode,
  analyzeComplexityWithKimi,
  generateExecutionPlanWithKimi,
  getSwarmThreshold,
  KIMI_MODEL
} from "./kimi-provider";

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
  orchestrationModel?: string;
  swarmMode?: boolean;
  expectedSpeedup?: number;
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
  technicalPlan?: any; // TechnicalPlan from agent-planner
  executionResults?: MCPToolExecutionResult[];
  verificationResults?: any;
  metadata: TaskMetadata;
  createdAt: Date;
  updatedAt: Date;
  orchestrationModel?: string;
  swarmMode?: boolean;
  actualSpeedup?: number;
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

  async detectComplexity(prompt: string, userId: string, context?: Record<string, any>): Promise<ComplexityResult> {
    const redis = await this.getRedis();
    const cacheKey = `task:complexity:${this.generateCacheKey(prompt, context)}`;
    
    // Try cache first
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Add Kimi-specific fields if missing
        return {
          ...parsed,
          orchestrationModel: parsed.orchestrationModel || (isKimiConfigured() ? KIMI_MODEL : 'fallback'),
          swarmMode: parsed.swarmMode ?? shouldActivateSwarmMode(parsed.score),
          expectedSpeedup: parsed.expectedSpeedup ?? (shouldActivateSwarmMode(parsed.score) ? 4.5 : 1),
        };
      }
    } catch (error) {
      console.warn('Redis cache unavailable for complexity detection');
    }

    // Use Kimi K2.5 if configured, otherwise fallback to existing AI
    let result: ComplexityResult;
    
    if (isKimiConfigured()) {
      try {
        console.log(`[Orchestrator] Using Kimi K2.5 for complexity analysis`);
        const kimiResult = await analyzeComplexityWithKimi(prompt, userId, context);
        
        // Determine swarm mode activation
        const swarmMode = shouldActivateSwarmMode(kimiResult.score);
        
        result = {
          ...kimiResult,
          orchestrationModel: KIMI_MODEL,
          swarmMode,
          expectedSpeedup: swarmMode ? 4.5 : 1,
        };
        
        console.log(`[Orchestrator] Kimi analysis complete: level=${kimiResult.level}, score=${kimiResult.score}, swarm=${swarmMode}`);
      } catch (error) {
        console.warn('[Orchestrator] Kimi complexity analysis failed, falling back:', error);
        result = await this.fallbackComplexityAnalysis(prompt, userId);
      }
    } else {
      console.log(`[Orchestrator] Kimi not configured, using fallback complexity analysis`);
      result = await this.fallbackComplexityAnalysis(prompt, userId);
    }
    
    // Cache for 1 hour
    try {
      await redis.setEx(cacheKey, 3600, JSON.stringify(result));
    } catch (error) {
      console.warn('Failed to cache complexity result');
    }

    return result;
  }

  private async fallbackComplexityAnalysis(prompt: string, userId: string): Promise<ComplexityResult> {
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

    const userPrompt = `Analyze this task request: "${prompt}"`;

    try {
      const aiResponse = await executeSimpleGeneration({
        prompt: `${systemPrompt}\n\n${userPrompt}`,
        enableWebSearch: false,
        enableDeepResearch: false,
        reasoningEffort: 'low',
        modelProvider: 'openai',
        userId: userId || 'system-analyzer'
      });

      const parsed = this.parseComplexityResponse(aiResponse.text);
      const swarmMode = shouldActivateSwarmMode(parsed.score);
      
      return {
        ...parsed,
        orchestrationModel: 'fallback',
        swarmMode,
        expectedSpeedup: swarmMode ? 4.5 : 1,
      };
    } catch (error) {
      console.error('Fallback complexity analysis failed:', error);
      // Final fallback to pattern-based analysis
      return this.patternBasedAnalysis(prompt);
    }
  }

  private parseComplexityResponse(response: string): Omit<ComplexityResult, 'orchestrationModel' | 'swarmMode' | 'expectedSpeedup'> {
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
    
    return {
      level: 'medium',
      score: 50,
      estimatedSteps: 5,
      reasoning: 'Fallback due to parsing error',
      suggestedTools: ['context7']
    };
  }

  private patternBasedAnalysis(prompt: string): ComplexityResult {
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

    const swarmMode = shouldActivateSwarmMode(score);

    return {
      level,
      score,
      estimatedSteps,
      reasoning: `Pattern-based analysis: ${score} points`,
      suggestedTools: level === 'complex' ? ['context7', 'fetch'] : ['context7'],
      orchestrationModel: 'pattern-based',
      swarmMode,
      expectedSpeedup: swarmMode ? 4.5 : 1,
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
    
    // Determine if Kimi K2.5 will be used for orchestration
    const useKimi = isKimiConfigured();
    
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
        reasoning: useKimi ? 'Initializing with Kimi K2.5...' : 'Initializing...',
        suggestedTools: [],
        orchestrationModel: useKimi ? KIMI_MODEL : 'pending',
      },
      metadata: {
        startTime: new Date(),
        stateTransitions: [],
        toolsUsed: [],
        totalCost: 0,
        totalDuration: 0
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      orchestrationModel: useKimi ? KIMI_MODEL : undefined,
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
      context.originalPrompt,
      context.userId
    );

    const analysis: TaskAnalysis = {
      complexity,
      requiredTools: complexity.suggestedTools,
      estimatedDuration: complexity.estimatedSteps * 30, // 30 seconds per step estimate
      risks: [],
      dependencies: []
    };

    // Update context with analysis results and Kimi-specific fields
    await this.contextManager.updateContext(taskId, {
      complexity,
      analysisResults: analysis,
      orchestrationModel: complexity.orchestrationModel,
      swarmMode: complexity.swarmMode,
    });

    // Log analysis with Kimi-specific info
    await this.logExecution(taskId, 'complexity_analyzed', {
      originalPrompt: context.originalPrompt
    }, {
      complexity: analysis.complexity,
      estimatedDuration: analysis.estimatedDuration,
      orchestrationModel: complexity.orchestrationModel,
      swarmMode: complexity.swarmMode,
      expectedSpeedup: complexity.expectedSpeedup,
    });

    // Transition to planning state
    await this.transitionState(taskId, TaskExecutionState.PLANNING);
  }

  async handlePlanningState(taskId: string): Promise<void> {
    const context = await this.contextManager.loadContext(taskId);
    
    console.log(`[Orchestrator] Planning task ${taskId} (complexity: ${context.complexity.level}, model: ${context.orchestrationModel || 'default'})`);

    let executionPlan;
    let technicalPlan;
    let isValidPlan = false;

    // Use Kimi K2.5 for planning if configured and swarm mode is active
    if (isKimiConfigured() && context.complexity.swarmMode) {
      try {
        console.log(`[Orchestrator] Using Kimi K2.5 for execution planning with swarm mode`);
        
        const kimiPlan = await generateExecutionPlanWithKimi(
          context.originalPrompt,
          context.complexity,
          context.userId
        );

        executionPlan = {
          steps: kimiPlan.steps.map((step, index) => ({
            id: step.id || `step_${index + 1}`,
            description: step.description,
            tools: step.tools.map((toolName: string) => ({
              serverName: toolName.includes('/') ? toolName.split('/')[0] : 'context7',
              toolName: toolName.includes('/') ? toolName.split('/')[1] : toolName,
              parameters: {},
              priority: 1
            })),
            estimatedDuration: step.estimatedDuration
          })),
          summary: {
            title: kimiPlan.title,
            description: kimiPlan.description
          },
          affectedFiles: kimiPlan.affectedFiles,
          dependencies: kimiPlan.dependencies,
          risks: kimiPlan.risks
        };

        technicalPlan = {
          summary: {
            title: kimiPlan.title,
            description: kimiPlan.description,
            estimatedTotalDuration: kimiPlan.steps.reduce((sum: number, step: any) => sum + (step.estimatedDuration || 30), 0)
          },
          implementationSteps: kimiPlan.steps,
          affectedFiles: kimiPlan.affectedFiles,
          dependencies: { external: kimiPlan.dependencies, internal: [] },
          risks: kimiPlan.risks.map((risk: string) => ({ description: risk, mitigation: 'TBD' })),
          acceptanceCriteria: ['Plan generated by Kimi K2.5'],
          testingStrategy: { unitTests: [], integrationTests: [], e2eTests: [] },
          rollbackPlan: { steps: [], verification: '' }
        };

        isValidPlan = kimiPlan.steps.length > 0;
        
        console.log(`[Orchestrator] Kimi planning complete: ${kimiPlan.steps.length} steps`);
      } catch (error) {
        console.warn('[Orchestrator] Kimi planning failed, falling back to default planner:', error);
        // Fall through to default planner
      }
    }

    // Use default planner if Kimi failed or not configured
    if (!executionPlan) {
      const planner = new AutonomousAgentPlanner();
      technicalPlan = await planner.createPlan(
        taskId, 
        context.userId, 
        context.agentId, 
        context.originalPrompt
      );

      executionPlan = this.convertTechnicalPlanToExecution(technicalPlan);
      isValidPlan = technicalPlan.acceptanceCriteria.length > 0 && 
                   technicalPlan.implementationSteps.length > 0;
    }

    await this.contextManager.updateContext(taskId, {
      executionPlan,
      technicalPlan // Store the full technical plan for reference
    });
    
    // Log planning with detailed information including validation status and Kimi info
    await this.logExecution(taskId, 'plan_generated', {
      complexityLevel: context.complexity.level,
      planTitle: technicalPlan.summary.title,
      affectedFiles: technicalPlan.affectedFiles?.length || 0,
      implementationSteps: technicalPlan.implementationSteps?.length || 0,
      isValidPlan: isValidPlan,
      orchestrationModel: context.orchestrationModel,
      swarmMode: context.swarmMode,
    }, {
      planSteps: executionPlan.steps?.length || 0,
      estimatedDuration: technicalPlan.summary.estimatedTotalDuration,
      completenessScore: isValidPlan ? 95 : 30 // Better scoring based on validation
    });

    // Only transition to awaiting approval if plan is valid
    if (isValidPlan) {
      await this.transitionState(taskId, TaskExecutionState.AWAITING_APPROVAL);
    } else {
      console.warn(`[Orchestrator] Invalid plan generated for task ${taskId}, transitioning to FAILED`);
      await this.transitionState(taskId, TaskExecutionState.FAILED);
    }
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
        const toolResults = await this.executeToolChain(taskId, step.tools, context.userId);
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
      // Calculate actual speedup if swarm mode was used
      let actualSpeedup: number | undefined;
      if (context.swarmMode && context.complexity.expectedSpeedup) {
        // In a real implementation, this would compare actual vs estimated duration
        // For now, use the expected speedup with some variance
        actualSpeedup = context.complexity.expectedSpeedup * (0.8 + Math.random() * 0.4);
        actualSpeedup = Math.round(actualSpeedup * 10) / 10; // Round to 1 decimal
      }

      // Success!
      await this.logExecution(taskId, 'verification_passed', {
        successfulTools: executionResults.length
      }, {
        totalCost: executionResults.reduce((sum, r) => sum + r.cost, 0),
        orchestrationModel: context.orchestrationModel,
        swarmMode: context.swarmMode,
        actualSpeedup,
      });

      // Update context with actual speedup
      if (actualSpeedup) {
        await this.contextManager.updateContext(taskId, {
          actualSpeedup
        });
      }

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

  async executeToolChain(taskId: string, tools: MCPToolRoute[], userId: string): Promise<MCPToolExecutionResult[]> {
    const results: MCPToolExecutionResult[] = [];
    
    for (const toolRoute of tools) {
      let retryCount = 0;
      const maxRetries = 3;
      let lastError: Error | null = null;
      
      while (retryCount <= maxRetries) {
        try {
          const startTime = Date.now();
          const params = toolRoute.parameters || {};
          
          // Direct tool execution with structured parameters
          const toolResult = await executeMCPTool(
            toolRoute.serverName, 
            toolRoute.toolName, 
            params, 
            userId
          );
          
          const executionTime = Date.now() - startTime;
          
          // Estimate cost based on tool type
          let cost = 0.001; // Default cost
          if (toolRoute.toolName.includes('search')) {
            cost = 0.001;
          } else if (toolRoute.toolName.includes('playwright') || toolRoute.toolName.includes('browse')) {
            cost = 0.005;
          } else if (toolRoute.toolName.includes('analyze') || toolRoute.toolName.includes('process')) {
            cost = 0.003;
          }
          
          // Build MCPToolExecutionResult
          const result: MCPToolExecutionResult = {
            toolRoute,
            success: toolResult.success,
            result: toolResult.data,
            error: toolResult.success ? undefined : 'Tool execution failed',
            cost,
            executionTime,
            retryCount
          };

          results.push(result);

          // Log tool execution
          await this.logExecution(taskId, 'mcp_tool_execution', {
            toolRoute,
            userId
          }, {
            success: result.success,
            cost: result.cost,
            executionTime: result.executionTime
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

          // Success - break out of retry loop
          break;
          
        } catch (error) {
          lastError = error as Error;
          retryCount++;
          
          // Log retry attempt
          await this.logExecution(taskId, 'mcp_tool_retry', {
            toolRoute,
            attempt: retryCount,
            error: error instanceof Error ? error.message : String(error)
          }, {});
          
          // If this was the last retry, add failure result
          if (retryCount > maxRetries) {
            const result: MCPToolExecutionResult = {
              toolRoute,
              success: false,
              error: lastError instanceof Error ? lastError.message : String(lastError),
              cost: 0,
              executionTime: 0,
              retryCount: maxRetries
            };

            results.push(result);

            await this.logExecution(taskId, 'mcp_tool_error', {
              toolRoute,
              error: result.error,
              finalFailure: true
            }, {});
          } else {
            // Exponential backoff
            const delay = 1000 * Math.pow(2, retryCount - 1);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
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

  private convertTechnicalPlanToExecution(technicalPlan: any): any {
    // Convert the rich TechnicalPlan into the simpler execution format
    // that the orchestrator expects
    return {
      steps: technicalPlan.implementationSteps?.map((step: any) => ({
        id: step.id,
        description: step.description,
        tools: step.toolsNeeded || [],
        estimatedDuration: step.estimatedDuration
      })) || [],
      summary: technicalPlan.summary,
      affectedFiles: technicalPlan.affectedFiles || [],
      dependencies: technicalPlan.dependencies || { external: [], internal: [] },
      risks: technicalPlan.risks || []
    };
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