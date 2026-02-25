/**
 * Multi-Agent Workflow System
 * Enables multiple AI agents to collaborate on complex tasks
 * Supports parallel execution, agent teams, and workflow chaining
 */

import { generateAgentResponse } from "@/client-lib/ai-agents-client";
import { AIProvider } from "@/lib/provider-config";

// ==================== TYPES ====================

export interface Agent {
  id: string;
  name: string;
  role: string;
  systemPrompt: string;
  provider?: AIProvider;
  model?: string;
  temperature?: number;
}

export interface WorkflowStep {
  id: string;
  name: string;
  agentId: string;
  prompt: string;
  dependsOn?: string[]; // Step IDs this step depends on
  parallel?: boolean; // Can run in parallel with other steps
  outputKey: string; // Key to store output in context
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  agents: Agent[];
  steps: WorkflowStep[];
  maxConcurrency?: number;
  timeout?: number; // milliseconds
}

export interface WorkflowContext {
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  stepResults: Record<string, StepResult>;
  metadata: {
    startTime: Date;
    endTime?: Date;
    totalTokens: number;
    totalCost: number;
  };
}

export interface StepResult {
  stepId: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  output?: string;
  error?: string;
  tokensUsed?: number;
  cost?: number;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
}

export interface WorkflowExecutionResult {
  workflowId: string;
  status: "completed" | "failed" | "partial";
  context: WorkflowContext;
  results: StepResult[];
  summary: string;
}

// ==================== PREDEFINED AGENT TEAMS ====================

export const AGENT_TEAMS = {
  contentCreation: [
    {
      id: "researcher",
      name: "Research Agent",
      role: "researcher",
      systemPrompt: "You are a research specialist. Your job is to gather information, find relevant sources, and provide comprehensive background on topics. Be thorough and cite sources when possible.",
    },
    {
      id: "writer",
      name: "Content Writer",
      role: "writer",
      systemPrompt: "You are an expert content writer. You create engaging, well-structured content based on research. Focus on clarity, flow, and audience engagement.",
    },
    {
      id: "editor",
      name: "Editor",
      role: "editor",
      systemPrompt: "You are a professional editor. You review content for grammar, style, clarity, and effectiveness. Provide constructive feedback and improvements.",
    },
    {
      id: "seo",
      name: "SEO Specialist",
      role: "seo",
      systemPrompt: "You are an SEO expert. You optimize content for search engines while maintaining readability. Focus on keywords, meta descriptions, and structure.",
    },
  ],
  codeReview: [
    {
      id: "analyzer",
      name: "Code Analyzer",
      role: "analyzer",
      systemPrompt: "You analyze code for bugs, security issues, and performance problems. Be thorough and specific in your findings.",
    },
    {
      id: "refactorer",
      name: "Refactoring Expert",
      role: "refactorer",
      systemPrompt: "You suggest code improvements for readability, maintainability, and best practices. Provide specific refactoring suggestions.",
    },
    {
      id: "documenter",
      name: "Documentation Writer",
      role: "documenter",
      systemPrompt: "You write clear, comprehensive documentation for code. Include examples, API references, and usage instructions.",
    },
  ],
  marketingCampaign: [
    {
      id: "strategist",
      name: "Marketing Strategist",
      role: "strategist",
      systemPrompt: "You develop marketing strategies based on target audience, goals, and market research. Focus on positioning and messaging.",
    },
    {
      id: "copywriter",
      name: "Copywriter",
      role: "copywriter",
      systemPrompt: "You write compelling marketing copy for various channels. Focus on persuasion, clarity, and brand voice.",
    },
    {
      id: "designer",
      name: "Creative Director",
      role: "designer",
      systemPrompt: "You provide creative direction for visual elements, layout suggestions, and brand consistency. Describe visual concepts clearly.",
    },
    {
      id: "analyst",
      name: "Campaign Analyst",
      role: "analyst",
      systemPrompt: "You analyze campaign performance metrics and provide optimization recommendations. Focus on data-driven insights.",
    },
  ],
};

// ==================== WORKFLOW ENGINE ====================

export class MultiAgentWorkflowEngine {
  private workflows: Map<string, Workflow> = new Map();
  private activeExecutions: Map<string, AbortController> = new Map();

  /**
   * Register a workflow
   */
  registerWorkflow(workflow: Workflow): void {
    this.workflows.set(workflow.id, workflow);
  }

  /**
   * Get a registered workflow
   */
  getWorkflow(id: string): Workflow | undefined {
    return this.workflows.get(id);
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(
    workflowId: string,
    inputs: Record<string, unknown>,
    options: {
      onStepStart?: (stepId: string) => void;
      onStepComplete?: (stepId: string, result: StepResult) => void;
      onStepError?: (stepId: string, error: Error) => void;
    } = {}
  ): Promise<WorkflowExecutionResult> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const abortController = new AbortController();
    const executionId = `${workflowId}-${Date.now()}`;
    this.activeExecutions.set(executionId, abortController);

    const context: WorkflowContext = {
      inputs,
      outputs: {},
      stepResults: {},
      metadata: {
        startTime: new Date(),
        totalTokens: 0,
        totalCost: 0,
      },
    };

    try {
      // Build dependency graph
      const dependencyGraph = this.buildDependencyGraph(workflow.steps);
      const executionOrder = this.topologicalSort(dependencyGraph);

      // Execute steps
      for (const stepId of executionOrder) {
        if (abortController.signal.aborted) {
          throw new Error("Workflow cancelled");
        }

        const step = workflow.steps.find((s) => s.id === stepId);
        if (!step) continue;

        // Check if dependencies are met
        const canExecute = this.canExecuteStep(step, context);
        if (!canExecute) {
          context.stepResults[stepId] = {
            stepId,
            status: "skipped",
            error: "Dependencies not met",
          };
          continue;
        }

        // Execute step
        options.onStepStart?.(stepId);
        const result = await this.executeStep(step, workflow.agents, context);
        context.stepResults[stepId] = result;

        if (result.status === "completed" && result.output) {
          context.outputs[step.outputKey] = result.output;
          options.onStepComplete?.(stepId, result);
        } else if (result.status === "failed") {
          options.onStepError?.(stepId, new Error(result.error || "Unknown error"));
        }

        // Update metadata
        if (result.tokensUsed) {
          context.metadata.totalTokens += result.tokensUsed;
        }
        if (result.cost) {
          context.metadata.totalCost += result.cost;
        }
      }

      context.metadata.endTime = new Date();

      // Generate summary
      const summary = await this.generateSummary(workflow, context);

      const status = this.determineWorkflowStatus(context);

      return {
        workflowId,
        status,
        context,
        results: Object.values(context.stepResults),
        summary,
      };
    } finally {
      this.activeExecutions.delete(executionId);
    }
  }

  /**
   * Cancel a running workflow
   */
  cancelWorkflow(executionId: string): boolean {
    const controller = this.activeExecutions.get(executionId);
    if (controller) {
      controller.abort();
      this.activeExecutions.delete(executionId);
      return true;
    }
    return false;
  }

  /**
   * Build dependency graph for steps
   */
  private buildDependencyGraph(steps: WorkflowStep[]): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>();

    // Initialize all steps
    for (const step of steps) {
      graph.set(step.id, new Set());
    }

    // Add dependencies
    for (const step of steps) {
      if (step.dependsOn) {
        for (const depId of step.dependsOn) {
          graph.get(step.id)?.add(depId);
        }
      }
    }

    return graph;
  }

  /**
   * Topological sort for execution order
   */
  private topologicalSort(graph: Map<string, Set<string>>): string[] {
    const visited = new Set<string>();
    const temp = new Set<string>();
    const result: string[] = [];

    const visit = (node: string) => {
      if (temp.has(node)) {
        throw new Error("Circular dependency detected");
      }
      if (visited.has(node)) return;

      temp.add(node);
      const deps = graph.get(node) || new Set();
      for (const dep of deps) {
        visit(dep);
      }
      temp.delete(node);
      visited.add(node);
      result.push(node);
    };

    for (const node of graph.keys()) {
      visit(node);
    }

    return result;
  }

  /**
   * Check if a step can be executed
   */
  private canExecuteStep(step: WorkflowStep, context: WorkflowContext): boolean {
    if (!step.dependsOn || step.dependsOn.length === 0) {
      return true;
    }

    return step.dependsOn.every((depId) => {
      const depResult = context.stepResults[depId];
      return depResult?.status === "completed";
    });
  }

  /**
   * Execute a single step
   */
  private async executeStep(
    step: WorkflowStep,
    agents: Agent[],
    context: WorkflowContext
  ): Promise<StepResult> {
    const startTime = new Date();
    const agent = agents.find((a) => a.id === step.agentId);

    if (!agent) {
      return {
        stepId: step.id,
        status: "failed",
        error: `Agent ${step.agentId} not found`,
        startTime,
        endTime: new Date(),
        duration: 0,
      };
    }

    try {
      // Build prompt with context from dependencies
      const enrichedPrompt = this.enrichPromptWithContext(step.prompt, context);

      // Call the agent
      const response = await generateAgentResponse(
        agent.id,
        enrichedPrompt,
        [{ role: "system", content: agent.systemPrompt }]
      );

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      return {
        stepId: step.id,
        status: "completed",
        output: response.response,
        tokensUsed: response.tokensUsed,
        startTime,
        endTime,
        duration,
      };
    } catch (error) {
      const endTime = new Date();
      return {
        stepId: step.id,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
      };
    }
  }

  /**
   * Enrich prompt with context from previous steps
   */
  private enrichPromptWithContext(prompt: string, context: WorkflowContext): string {
    let enriched = prompt;

    // Replace template variables with actual values
    for (const [key, value] of Object.entries(context.inputs)) {
      enriched = enriched.replace(new RegExp(`{{${key}}}`, "g"), String(value));
    }

    for (const [key, value] of Object.entries(context.outputs)) {
      enriched = enriched.replace(new RegExp(`{{${key}}}`, "g"), String(value));
    }

    return enriched;
  }

  /**
   * Determine overall workflow status
   */
  private determineWorkflowStatus(context: WorkflowContext): "completed" | "failed" | "partial" {
    const results = Object.values(context.stepResults);
    const allCompleted = results.every((r) => r.status === "completed");
    const anyFailed = results.some((r) => r.status === "failed");
    const anyCompleted = results.some((r) => r.status === "completed");

    if (allCompleted) return "completed";
    if (anyFailed && anyCompleted) return "partial";
    if (anyFailed) return "failed";
    return "partial";
  }

  /**
   * Generate workflow summary
   */
  private async generateSummary(
    workflow: Workflow,
    context: WorkflowContext
  ): Promise<string> {
    const completed = Object.values(context.stepResults).filter(
      (r) => r.status === "completed"
    ).length;
    const total = workflow.steps.length;
    const duration = context.metadata.endTime
      ? context.metadata.endTime.getTime() - context.metadata.startTime.getTime()
      : 0;

    return `Workflow "${workflow.name}" completed with ${completed}/${total} steps successful. ` +
      `Duration: ${(duration / 1000).toFixed(2)}s. ` +
      `Total tokens: ${context.metadata.totalTokens.toLocaleString()}. ` +
      `Estimated cost: $${context.metadata.totalCost.toFixed(4)}.`;
  }
}

// ==================== PREDEFINED WORKFLOWS ====================

export const PREDEFINED_WORKFLOWS: Workflow[] = [
  {
    id: "content-creation-pipeline",
    name: "Content Creation Pipeline",
    description: "Research, write, edit, and optimize content",
    agents: AGENT_TEAMS.contentCreation,
    steps: [
      {
        id: "research",
        name: "Research Topic",
        agentId: "researcher",
        prompt: "Research the topic: {{topic}}. Provide comprehensive background, key points, and sources.",
        outputKey: "research",
      },
      {
        id: "write",
        name: "Write Content",
        agentId: "writer",
        prompt: "Based on this research: {{research}}, write a {{contentType}} about {{topic}}. Target audience: {{audience}}",
        dependsOn: ["research"],
        outputKey: "draft",
      },
      {
        id: "edit",
        name: "Edit Content",
        agentId: "editor",
        prompt: "Edit this content for clarity and style: {{draft}}",
        dependsOn: ["write"],
        outputKey: "edited",
      },
      {
        id: "optimize",
        name: "SEO Optimization",
        agentId: "seo",
        prompt: "Optimize this content for SEO with keywords: {{keywords}}. Content: {{edited}}",
        dependsOn: ["edit"],
        outputKey: "final",
      },
    ],
  },
  {
    id: "code-review-pipeline",
    name: "Code Review Pipeline",
    description: "Analyze, refactor, and document code",
    agents: AGENT_TEAMS.codeReview,
    steps: [
      {
        id: "analyze",
        name: "Analyze Code",
        agentId: "analyzer",
        prompt: "Analyze this code for bugs, security issues, and performance: {{code}}",
        outputKey: "analysis",
      },
      {
        id: "refactor",
        name: "Suggest Refactoring",
        agentId: "refactorer",
        prompt: "Based on this analysis: {{analysis}}, suggest refactoring for: {{code}}",
        dependsOn: ["analyze"],
        outputKey: "refactoring",
      },
      {
        id: "document",
        name: "Write Documentation",
        agentId: "documenter",
        prompt: "Write documentation for this code: {{code}}. Include: {{analysis}} and improvements: {{refactoring}}",
        dependsOn: ["analyze", "refactor"],
        outputKey: "documentation",
      },
    ],
  },
  {
    id: "marketing-campaign-pipeline",
    name: "Marketing Campaign Pipeline",
    description: "Create a complete marketing campaign",
    agents: AGENT_TEAMS.marketingCampaign,
    steps: [
      {
        id: "strategy",
        name: "Develop Strategy",
        agentId: "strategist",
        prompt: "Develop a marketing strategy for {{product}} targeting {{audience}} with goal: {{goal}}",
        outputKey: "strategy",
      },
      {
        id: "copy",
        name: "Write Copy",
        agentId: "copywriter",
        prompt: "Write marketing copy based on this strategy: {{strategy}}. Channels: {{channels}}",
        dependsOn: ["strategy"],
        outputKey: "copy",
      },
      {
        id: "creative",
        name: "Creative Direction",
        agentId: "designer",
        prompt: "Provide creative direction for this campaign. Strategy: {{strategy}}, Copy: {{copy}}",
        dependsOn: ["strategy", "copy"],
        outputKey: "creative",
      },
      {
        id: "measure",
        name: "Define Metrics",
        agentId: "analyst",
        prompt: "Define KPIs and measurement plan for this campaign. Strategy: {{strategy}}",
        dependsOn: ["strategy"],
        outputKey: "metrics",
      },
    ],
  },
];

// Singleton instance
export const workflowEngine = new MultiAgentWorkflowEngine();

// Register predefined workflows
for (const workflow of PREDEFINED_WORKFLOWS) {
  workflowEngine.registerWorkflow(workflow);
}
