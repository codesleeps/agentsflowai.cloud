/**
 * AI-Powered Agent Planning System
 * 
 * Generates comprehensive technical specifications before task execution.
 * Analyzes user prompts, identifies affected files, assesses risks, and creates
 * detailed implementation plans enriched with framework best practices.
 */

import { executeSimpleGeneration } from "./ai-fallback-handler";
import { getRedisClient } from "./redis-cache";
import { db } from "./prisma";
import { QuickMCP } from "@/lib/mcp/agent-integration";
import { AI_AGENT_CONFIGS, AIAgent } from "@/shared/models/ai-agents";
import { 
  MCPToolRoute, 
  MCPToolExecutionResult 
} from "@/shared/models/mcp-types";

// ==================== CORE PLANNING TYPES ====================

export interface AffectedFile {
  path: string;
  changeType: 'create' | 'modify' | 'delete';
  reason: string;
  estimatedLines?: number;
}

export interface PlanStep {
  id: string;
  description: string;
  toolsNeeded: MCPToolRoute[];
  estimatedDuration: number; // minutes
  dependencies: string[]; // IDs of prerequisite steps
  riskLevel: 'low' | 'medium' | 'high';
  validationCriteria: string[];
}

export interface DependencyInfo {
  external: {
    packageName: string;
    version: string;
    purpose: string;
    installationCommand: string;
  }[];
  internal: {
    moduleName: string;
    filePath: string;
    purpose: string;
  }[];
}

export interface RiskAssessment {
  level: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  mitigationStrategy: string;
  impact: string;
}

export interface AcceptanceCriteria {
  id: string;
  description: string;
  testMethod: string;
  successIndicators: string[];
}

export interface TechnicalPlan {
  taskId: string;
  summary: {
    title: string;
    description: string;
    complexity: 'simple' | 'medium' | 'complex';
    estimatedTotalDuration: number; // minutes
    affectedFilesCount: number;
  };
  affectedFiles: AffectedFile[];
  implementationSteps: PlanStep[];
  dependencies: DependencyInfo;
  risks: RiskAssessment[];
  acceptanceCriteria: AcceptanceCriteria[];
  bestPractices: string[];
  agentSpecificGuidelines: string[];
  createdAt: Date;
  createdBy: string;
}

export interface PlanValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  completenessScore: number; // 0-100
  suggestions: string[];
}

export interface TaskAnalysis {
  prompt: string;
  agentId: string;
  context?: Record<string, any>;
  affectedFiles: AffectedFile[];
  technicalRequirements: string[];
  complexity: 'simple' | 'medium' | 'complex';
  estimatedScope: number; // arbitrary units
  dependencies: string[];
  risks: string[];
}

// ==================== TASK ANALYSIS ENGINE ====================

class TaskAnalyzer {
  private async getRedis() {
    const redisClient = getRedisClient();
    if (redisClient instanceof Promise) {
      return await redisClient;
    }
    return redisClient;
  }

  async analyzeTask(prompt: string, agentId: string, context?: Record<string, any>): Promise<TaskAnalysis> {
    const systemPrompt = `You are a technical task analyzer. Analyze the following user request and identify technical requirements.

Return ONLY valid JSON with this exact structure:
{
  "affectedFiles": [
    {
      "path": "relative/file/path.ext",
      "changeType": "create|modify|delete",
      "reason": "why this file needs changes",
      "estimatedLines": 50
    }
  ],
  "technicalRequirements": ["requirement1", "requirement2"],
  "complexity": "simple|medium|complex",
  "estimatedScope": 10,
  "dependencies": ["dependency1", "dependency2"],
  "risks": ["risk1", "risk2"]
}`;

    const userPrompt = `Analyze this task request: "${prompt}"
${context ? `Context: ${JSON.stringify(context)}` : ''}
Agent: ${agentId}`;

    try {
      const aiResponse = await executeSimpleGeneration({
        prompt: `${systemPrompt}\n\n${userPrompt}`,
        enableWebSearch: false,
        enableDeepResearch: false,
        reasoningEffort: 'medium',
        modelProvider: 'openai',
        userId: 'planner-analyzer'
      });

      const parsed = this.parseAnalysisResponse(aiResponse.text);
      return {
        prompt,
        agentId,
        context,
        ...parsed
      };
    } catch (error) {
      console.error('Task analysis failed:', error);
      // Fallback analysis
      return this.fallbackAnalysis(prompt, agentId);
    }
  }

  private parseAnalysisResponse(response: string): Omit<TaskAnalysis, 'prompt' | 'agentId' | 'context'> {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          affectedFiles: parsed.affectedFiles || [],
          technicalRequirements: parsed.technicalRequirements || [],
          complexity: parsed.complexity || 'medium',
          estimatedScope: parsed.estimatedScope || 5,
          dependencies: parsed.dependencies || [],
          risks: parsed.risks || []
        };
      }
    } catch (error) {
      console.warn('Failed to parse AI analysis response:', error);
    }
    
    return this.defaultAnalysis();
  }

  private fallbackAnalysis(prompt: string, agentId: string): TaskAnalysis {
    // Simple pattern-based analysis
    const lowerPrompt = prompt.toLowerCase();
    
    let complexity: 'simple' | 'medium' | 'complex' = 'medium';
    if (lowerPrompt.includes('simple') || lowerPrompt.includes('basic')) {
      complexity = 'simple';
    } else if (lowerPrompt.includes('complex') || lowerPrompt.includes('advanced')) {
      complexity = 'complex';
    }

    return {
      prompt,
      agentId,
      affectedFiles: [],
      technicalRequirements: [],
      complexity,
      estimatedScope: complexity === 'simple' ? 3 : complexity === 'complex' ? 15 : 8,
      dependencies: [],
      risks: []
    };
  }

  private defaultAnalysis(): Omit<TaskAnalysis, 'prompt' | 'agentId' | 'context'> {
    return {
      affectedFiles: [],
      technicalRequirements: [],
      complexity: 'medium',
      estimatedScope: 5,
      dependencies: [],
      risks: []
    };
  }
}

// ==================== PLAN GENERATOR ====================

class PlanGenerator {
  private async getRedis() {
    const redisClient = getRedisClient();
    if (redisClient instanceof Promise) {
      return await redisClient;
    }
    return redisClient;
  }

  async generatePlan(taskAnalysis: TaskAnalysis, agentConfig: AIAgent): Promise<TechnicalPlan> {
    // Check for cached template based on task pattern
    const taskPattern = this.identifyTaskPattern(taskAnalysis);
    const cachedTemplate = await getCachedPlanTemplate(taskPattern);
    
    if (cachedTemplate) {
      console.log(`[Planner] Using cached template for pattern: ${taskPattern}`);
      // Customize cached template for this specific task
      return this.customizeTemplate(cachedTemplate, taskAnalysis);
    }
    
    // Generate base plan structure
    const basePlan = await this.createBasePlan(taskAnalysis, agentConfig);
    
    // Enrich with best practices
    const enrichedPlan = await this.enrichWithBestPractices(basePlan, agentConfig.id);
    
    // Generate detailed steps
    const detailedPlan = await this.generateImplementationSteps(enrichedPlan, taskAnalysis);
    
    // Assess risks and dependencies
    const finalPlan = await this.assessRisksAndDependencies(detailedPlan, taskAnalysis);
    
    // Cache this plan as a template for similar tasks
    await cachePlanTemplate(taskPattern, finalPlan);
    
    return finalPlan;
  }

  private identifyTaskPattern(analysis: TaskAnalysis): string {
    // Create a pattern based on task characteristics
    const complexity = analysis.complexity;
    const fileCount = analysis.affectedFiles.length;
    const hasExternalDeps = analysis.dependencies.length > 0;
    
    return `${complexity}-${fileCount > 5 ? 'many-files' : 'few-files'}-${hasExternalDeps ? 'with-deps' : 'no-deps'}`;
  }

  private customizeTemplate(template: TechnicalPlan, analysis: TaskAnalysis): TechnicalPlan {
    // Customize a cached template for the specific task
    return {
      ...template,
      taskId: '', // Will be set by orchestrator
      summary: {
        ...template.summary,
        title: `Plan: ${analysis.prompt.substring(0, 50)}${analysis.prompt.length > 50 ? '...' : ''}`,
        description: analysis.prompt
      },
      affectedFiles: analysis.affectedFiles,
      createdAt: new Date(),
      createdBy: analysis.agentId
    };
  }

  private async createBasePlan(taskAnalysis: TaskAnalysis, agentConfig: AIAgent): Promise<TechnicalPlan> {
    const title = `Plan: ${taskAnalysis.prompt.substring(0, 50)}${taskAnalysis.prompt.length > 50 ? '...' : ''}`;
    
    return {
      taskId: '', // Will be set by orchestrator
      summary: {
        title,
        description: taskAnalysis.prompt,
        complexity: taskAnalysis.complexity,
        estimatedTotalDuration: taskAnalysis.estimatedScope * 30, // 30 min per scope unit
        affectedFilesCount: taskAnalysis.affectedFiles.length
      },
      affectedFiles: taskAnalysis.affectedFiles,
      implementationSteps: [],
      dependencies: {
        external: [],
        internal: []
      },
      risks: [],
      acceptanceCriteria: [],
      bestPractices: [],
      agentSpecificGuidelines: agentConfig.capabilities,
      createdAt: new Date(),
      createdBy: agentConfig.id
    };
  }

  async enrichWithBestPractices(plan: TechnicalPlan, agentId: string): Promise<TechnicalPlan> {
    const redis = await this.getRedis();
    const cacheKey = `plan:docs:${agentId}:${this.hashString(plan.summary.title)}`;
    
    try {
      // Try cache first
      const cached = await redis.get(cacheKey);
      if (cached) {
        const bestPractices = JSON.parse(cached);
        return {
          ...plan,
          bestPractices: [...plan.bestPractices, ...bestPractices]
        };
      }
    } catch (error) {
      console.warn('Redis cache unavailable for best practices');
    }

    // Fetch fresh documentation
    const bestPractices = await this.fetchBestPractices(agentId);
    
    // Cache for 1 hour
    try {
      await redis.setEx(cacheKey, 3600, JSON.stringify(bestPractices));
    } catch (error) {
      console.warn('Failed to cache best practices');
    }

    return {
      ...plan,
      bestPractices: [...plan.bestPractices, ...bestPractices]
    };
  }

  private async fetchBestPractices(agentId: string): Promise<string[]> {
    const queries = this.getFrameworkQueries(agentId);
    const practices: string[] = [];

    for (const query of queries) {
      try {
        const result = await QuickMCP.searchDocs(query);
        if (result?.executionResults?.some(r => r.success)) {
          const content = result.executionResults.find(r => r.success)?.result;
          if (content) {
            practices.push(...this.extractGuidelines(content));
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch docs for query: ${query}`, error);
      }
    }

    return [...new Set(practices)]; // Remove duplicates
  }

  private getFrameworkQueries(agentId: string): string[] {
    switch (agentId) {
      case 'web-dev-agent':
        return [
          'React 19 Server Components best practices',
          'Next.js 15 App Router patterns',
          'TypeScript React component patterns',
          'Tailwind CSS component design'
        ];
      case 'content-agent':
        return [
          'SEO content writing best practices',
          'Content marketing strategies',
          'Copywriting techniques'
        ];
      default:
        return ['General development best practices'];
    }
  }

  private extractGuidelines(content: any): string[] {
    // Simple extraction - in practice, this would be more sophisticated
    if (typeof content === 'string') {
      return content.split('\n')
        .filter(line => line.trim().startsWith('-') || line.trim().startsWith('*'))
        .map(line => line.replace(/^[-*]\s*/, '').trim())
        .filter(line => line.length > 10);
    }
    return [];
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  async generateImplementationSteps(plan: TechnicalPlan, analysis: TaskAnalysis): Promise<TechnicalPlan> {
    // Generate steps based on affected files and complexity
    const steps: PlanStep[] = [];
    
    // Setup step
    steps.push({
      id: 'setup',
      description: 'Environment setup and dependency installation',
      toolsNeeded: [],
      estimatedDuration: 15,
      dependencies: [],
      riskLevel: 'low',
      validationCriteria: ['Dependencies installed', 'Environment configured']
    });

    // File modification steps
    analysis.affectedFiles.forEach((file, index) => {
      steps.push({
        id: `modify-${index}`,
        description: `${file.changeType.charAt(0).toUpperCase() + file.changeType.slice(1)} ${file.path}`,
        toolsNeeded: [{
          serverName: 'filesystem',
          toolName: 'write_file',
          parameters: { path: file.path },
          priority: 1
        }],
        estimatedDuration: file.estimatedLines ? Math.ceil(file.estimatedLines / 10) * 15 : 30,
        dependencies: ['setup'],
        riskLevel: file.changeType === 'delete' ? 'high' : 'medium',
        validationCriteria: [`File ${file.path} ${file.changeType}d successfully`]
      });
    });

    // Manual verification step (no automated testing tool available)
    steps.push({
      id: 'test',
      description: 'Verify implementation manually',
      toolsNeeded: [], // No automated testing tool available
      estimatedDuration: 20,
      dependencies: steps.filter(s => s.id !== 'test').map(s => s.id),
      riskLevel: 'medium',
      validationCriteria: ['Manual verification completed', 'Functionality confirmed working']
    });

    return {
      ...plan,
      implementationSteps: steps
    };
  }

  async assessRisksAndDependencies(plan: TechnicalPlan, analysis: TaskAnalysis): Promise<TechnicalPlan> {
    const risks: RiskAssessment[] = [];
    const dependencies: DependencyInfo = {
      external: [],
      internal: []
    };

    // Assess based on complexity
    if (analysis.complexity === 'complex') {
      risks.push({
        level: 'high',
        description: 'High complexity task with multiple interdependent components',
        mitigationStrategy: 'Break into smaller, manageable sub-tasks',
        impact: 'Potential delays and integration issues'
      });
    }

    // Assess based on file changes
    const deleteOperations = analysis.affectedFiles.filter(f => f.changeType === 'delete');
    if (deleteOperations.length > 0) {
      risks.push({
        level: 'high',
        description: `Deleting ${deleteOperations.length} files may break existing functionality`,
        mitigationStrategy: 'Create backups and implement feature flags',
        impact: 'Possible breaking changes to existing features'
      });
    }

    // Add common dependencies for web dev tasks
    if (analysis.agentId === 'web-dev-agent') {
      dependencies.external.push({
        packageName: 'react',
        version: '^19.0.0',
        purpose: 'Core UI library',
        installationCommand: 'npm install react@latest'
      });
      
      dependencies.external.push({
        packageName: 'next',
        version: '^15.0.0',
        purpose: 'React framework',
        installationCommand: 'npm install next@latest'
      });
    }

    return {
      ...plan,
      risks: [...plan.risks, ...risks],
      dependencies: {
        external: [...plan.dependencies.external, ...dependencies.external],
        internal: [...plan.dependencies.internal, ...dependencies.internal]
      }
    };
  }
}

// ==================== PLAN VALIDATOR ====================

class PlanValidator {
  validatePlan(plan: TechnicalPlan): PlanValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 100;

    // Check completeness
    const completeness = this.checkCompleteness(plan);
    errors.push(...completeness.errors);
    warnings.push(...completeness.warnings);
    score -= completeness.errors.length * 10;
    score -= completeness.warnings.length * 5;

    // Validate step sequencing
    const sequencing = this.validateStepSequencing(plan.implementationSteps);
    errors.push(...sequencing.errors);
    warnings.push(...sequencing.warnings);
    score -= sequencing.errors.length * 15;

    // Check file paths
    const filePaths = this.checkFilePathValidity(plan.affectedFiles);
    errors.push(...filePaths.errors);
    warnings.push(...filePaths.warnings);
    score -= filePaths.errors.length * 10;

    // Assess risk coverage
    const riskCoverage = this.assessRiskCoverage(plan.risks);
    errors.push(...riskCoverage.errors);
    warnings.push(...riskCoverage.warnings);
    score -= riskCoverage.errors.length * 20;

    // Validate acceptance criteria
    const criteria = this.validateAcceptanceCriteria(plan.acceptanceCriteria);
    errors.push(...criteria.errors);
    warnings.push(...criteria.warnings);
    score -= criteria.errors.length * 10;

    // Ensure minimum score doesn't go below 0
    score = Math.max(0, score);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      completenessScore: score,
      suggestions: this.generateSuggestions(plan, errors, warnings)
    };
  }

  private checkCompleteness(plan: TechnicalPlan): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!plan.summary.title) errors.push('Plan must have a title');
    if (!plan.summary.description) errors.push('Plan must have a description');
    if (plan.implementationSteps.length === 0) errors.push('Plan must have at least one implementation step');
    if (plan.affectedFiles.length === 0) warnings.push('No affected files identified');

    plan.implementationSteps.forEach(step => {
      if (!step.description) errors.push(`Step ${step.id} missing description`);
      if (step.estimatedDuration <= 0) errors.push(`Step ${step.id} has invalid duration`);
      if (!step.validationCriteria || step.validationCriteria.length === 0) {
        warnings.push(`Step ${step.id} missing validation criteria`);
      }
    });

    return { errors, warnings };
  }

  private validateStepSequencing(steps: PlanStep[]): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for circular dependencies
    const dependencies = new Map<string, Set<string>>();
    steps.forEach(step => {
      dependencies.set(step.id, new Set(step.dependencies));
    });

    // Simple cycle detection
    for (const [stepId, deps] of dependencies) {
      for (const dep of deps) {
        if (dependencies.has(dep) && dependencies.get(dep)?.has(stepId)) {
          errors.push(`Circular dependency detected between steps ${stepId} and ${dep}`);
        }
      }
    }

    // Check for missing dependencies
    const stepIds = new Set(steps.map(s => s.id));
    steps.forEach(step => {
      step.dependencies.forEach(dep => {
        if (!stepIds.has(dep)) {
          errors.push(`Step ${step.id} depends on non-existent step ${dep}`);
        }
      });
    });

    return { errors, warnings };
  }

  private checkFilePathValidity(files: AffectedFile[]): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    files.forEach(file => {
      if (!file.path) {
        errors.push('File path cannot be empty');
        return;
      }

      // Basic path validation
      if (file.path.includes('..')) {
        errors.push(`Invalid file path (contains ..): ${file.path}`);
      }

      if (!file.path.startsWith('/')) {
        warnings.push(`File path should be absolute or properly relative: ${file.path}`);
      }

      // Check change type validity
      if (!['create', 'modify', 'delete'].includes(file.changeType)) {
        errors.push(`Invalid change type for ${file.path}: ${file.changeType}`);
      }
    });

    return { errors, warnings };
  }

  private assessRiskCoverage(risks: RiskAssessment[]): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const highRisks = risks.filter(r => r.level === 'high' || r.level === 'critical');
    highRisks.forEach(risk => {
      if (!risk.mitigationStrategy) {
        errors.push(`High-risk item missing mitigation strategy: ${risk.description}`);
      }
    });

    if (risks.length === 0) {
      warnings.push('No risks identified - consider if this is realistic');
    }

    return { errors, warnings };
  }

  private validateAcceptanceCriteria(criteria: AcceptanceCriteria[]): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (criteria.length === 0) {
      errors.push('Plan must have acceptance criteria');
    }

    criteria.forEach(criterion => {
      if (!criterion.description) errors.push('Acceptance criterion missing description');
      if (!criterion.testMethod) warnings.push('Acceptance criterion missing test method');
      if (!criterion.successIndicators || criterion.successIndicators.length === 0) {
        warnings.push('Acceptance criterion missing success indicators');
      }
    });

    return { errors, warnings };
  }

  private generateSuggestions(plan: TechnicalPlan, errors: string[], warnings: string[]): string[] {
    const suggestions: string[] = [];

    if (plan.implementationSteps.length < 3) {
      suggestions.push('Consider breaking the task into more granular steps');
    }

    if (plan.risks.filter(r => r.level === 'high').length > plan.implementationSteps.length / 2) {
      suggestions.push('High number of high-risk items - consider simplifying the approach');
    }

    if (errors.length > 0) {
      suggestions.push('Address validation errors before proceeding');
    }

    if (warnings.length > 3) {
      suggestions.push('Review warnings to improve plan quality');
    }

    return suggestions;
  }
}

// ==================== AGENT CONTEXT INTEGRATOR ====================

class AgentContextIntegrator {
  getAgentSystemPrompt(agentId: string): string {
    const agent = AI_AGENT_CONFIGS[agentId];
    return agent?.systemPrompt || '';
  }

  extractCapabilities(agentConfig: AIAgent): string[] {
    return agentConfig.capabilities || [];
  }

  tailorPlanToAgent(plan: TechnicalPlan, agentConfig: AIAgent): TechnicalPlan {
    // Keep ALL steps but mark unsupported tools with warnings
    const agentCapabilities = new Set(agentConfig.capabilities);
    
    const stepsWithWarnings = plan.implementationSteps.map(step => {
      // Check if any tools in this step are unsupported
      const unsupportedTools = step.toolsNeeded.filter(tool => {
        const toolDescription = `${tool.serverName}.${tool.toolName}`;
        return !agentCapabilities.has(toolDescription) && 
               !agentCapabilities.has('Generate React/Next.js components') &&
               !agentCapabilities.has('Write code to file');
      });
      
      // Add warning metadata if there are unsupported tools
      if (unsupportedTools.length > 0) {
        return {
          ...step,
          warnings: [`Unsupported tools: ${unsupportedTools.map(t => `${t.serverName}.${t.toolName}`).join(', ')}`],
          metadata: {
            ...(step as any).metadata,
            unsupportedTools: unsupportedTools.map(t => `${t.serverName}.${t.toolName}`)
          }
        };
      }
      
      return step;
    });

    return {
      ...plan,
      implementationSteps: stepsWithWarnings,
      agentSpecificGuidelines: agentConfig.capabilities
    };
  }

  injectAgentGuidelines(plan: TechnicalPlan, systemPrompt: string): TechnicalPlan {
    // Extract key guidelines from system prompt
    const guidelines: string[] = [];
    
    if (systemPrompt.includes('Server Components')) {
      guidelines.push('Use Server Components by default, Client Components when interactivity is required');
    }
    
    if (systemPrompt.includes('Server Actions')) {
      guidelines.push('Implement Server Actions for data mutations and form submissions');
    }
    
    if (systemPrompt.includes('Accessibility')) {
      guidelines.push('Ensure all components follow WCAG accessibility guidelines');
    }
    
    if (systemPrompt.includes('Performance')) {
      guidelines.push('Optimize bundle size with code splitting and lazy loading');
    }

    return {
      ...plan,
      agentSpecificGuidelines: [...plan.agentSpecificGuidelines, ...guidelines]
    };
  }
}

// ==================== MAIN PLANNER ORCHESTRATOR ====================

export class AutonomousAgentPlanner {
  private taskAnalyzer = new TaskAnalyzer();
  private planGenerator = new PlanGenerator();
  private planValidator = new PlanValidator();
  private agentIntegrator = new AgentContextIntegrator();

  async createPlan(
    taskId: string, 
    userId: string, 
    agentId: string, 
    prompt: string
  ): Promise<TechnicalPlan> {
    console.log(`[Planner] Creating plan for task ${taskId} with agent ${agentId}`);

    try {
      // 1. Load agent configuration with caching
      let agentConfig = await getCachedAgentConfig(agentId);
      if (!agentConfig) {
        agentConfig = AI_AGENT_CONFIGS[agentId];
        if (!agentConfig) {
          throw new Error(`Agent ${agentId} not found`);
        }
        // Cache the agent config for future use
        await cacheAgentConfig(agentId, agentConfig);
      }

      // 2. Analyze task
      const taskAnalysis = await this.taskAnalyzer.analyzeTask(prompt, agentId);

      // 3. Generate initial plan
      let plan = await this.planGenerator.generatePlan(taskAnalysis, agentConfig);

      // 4. Enrich with agent-specific guidelines
      plan = this.agentIntegrator.tailorPlanToAgent(plan, agentConfig);
      plan = this.agentIntegrator.injectAgentGuidelines(plan, agentConfig.systemPrompt);

      // 5. Validate plan
      let validationResult = this.planValidator.validatePlan(plan);
      
      if (!validationResult.isValid) {
        console.warn(`[Planner] Plan validation failed for task ${taskId}:`, validationResult.errors);
        // Attempt to fix common issues
        plan = await this.attemptPlanFixes(plan, validationResult);
        
        // Re-validate after fixes
        validationResult = this.planValidator.validatePlan(plan);
        
        // If still invalid, fall back to simpler approach
        if (!validationResult.isValid) {
          console.error(`[Planner] Plan still invalid after fixes for task ${taskId}:`, validationResult.errors);
          throw new Error(`Plan validation failed: ${validationResult.errors.join('; ')}`);
        }
      }

      // 6. Finalize plan
      plan.taskId = taskId;
      
      // 7. Log planning results
      await this.logPlanningResults(taskId, plan, validationResult);

      console.log(`[Planner] Plan created successfully for task ${taskId}`);
      return plan;

    } catch (error) {
      console.error(`[Planner] Failed to create plan for task ${taskId}:`, error);
      
      // Fallback to simple plan generation
      return this.generateFallbackPlan(taskId, userId, agentId, prompt);
    }
  }

  private async attemptPlanFixes(plan: TechnicalPlan, validation: PlanValidationResult): Promise<TechnicalPlan> {
    // Add missing acceptance criteria if needed
    if (validation.errors.some(e => e.includes('acceptance criteria'))) {
      plan.acceptanceCriteria = [
        {
          id: 'basic-functionality',
          description: 'Basic functionality works as expected',
          testMethod: 'Manual testing',
          successIndicators: ['No errors in console', 'Expected output produced']
        }
      ];
    }

    // Add validation criteria to steps if missing
    plan.implementationSteps = plan.implementationSteps.map(step => ({
      ...step,
      validationCriteria: step.validationCriteria.length > 0 
        ? step.validationCriteria 
        : [`Step ${step.id} completed successfully`]
    }));

    return plan;
  }

  private async generateFallbackPlan(
    taskId: string, 
    userId: string, 
    agentId: string, 
    prompt: string
  ): Promise<TechnicalPlan> {
    console.log(`[Planner] Generating fallback plan for task ${taskId}`);
    
    return {
      taskId,
      summary: {
        title: `Fallback Plan: ${prompt.substring(0, 30)}...`,
        description: prompt,
        complexity: 'medium',
        estimatedTotalDuration: 60,
        affectedFilesCount: 1
      },
      affectedFiles: [{
        path: '/src/app/page.tsx',
        changeType: 'modify',
        reason: 'General implementation task',
        estimatedLines: 50
      }],
      implementationSteps: [
        {
          id: 'analyze',
          description: 'Analyze requirements and plan approach',
          toolsNeeded: [],
          estimatedDuration: 15,
          dependencies: [],
          riskLevel: 'low',
          validationCriteria: ['Requirements understood']
        },
        {
          id: 'implement',
          description: 'Implement the requested functionality',
          toolsNeeded: [{
            serverName: 'filesystem',
            toolName: 'write_file',
            parameters: { path: '/src/app/page.tsx' },
            priority: 1
          }],
          estimatedDuration: 30,
          dependencies: ['analyze'],
          riskLevel: 'medium',
          validationCriteria: ['Implementation complete']
        },
        {
          id: 'test',
          description: 'Test and verify the implementation',
          toolsNeeded: [], // No automated testing tool available, manual verification
          estimatedDuration: 15,
          dependencies: ['implement'],
          riskLevel: 'low',
          validationCriteria: ['Manual testing completed', 'No errors observed']
        }
      ],
      dependencies: {
        external: [],
        internal: []
      },
      risks: [{
        level: 'low',
        description: 'Fallback plan with minimal risk assessment',
        mitigationStrategy: 'Proceed with caution and manual verification',
        impact: 'Limited automated risk mitigation'
      }],
      acceptanceCriteria: [{
        id: 'completion',
        description: 'Task completed according to user request',
        testMethod: 'Manual verification',
        successIndicators: ['User request fulfilled']
      }],
      bestPractices: ['Follow established coding standards'],
      agentSpecificGuidelines: ['Use appropriate tools for the task'],
      createdAt: new Date(),
      createdBy: agentId
    };
  }

  private async logPlanningResults(
    taskId: string, 
    plan: TechnicalPlan, 
    validation: PlanValidationResult
  ): Promise<void> {
    try {
      await db.workflowExecutionLog.create({
        data: {
          id: `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          execution_id: taskId,
          action_type: 'plan_generated',
          status: validation.isValid ? 'completed' : 'failed',
          input_data: JSON.stringify({
            prompt: plan.summary.description,
            complexity: plan.summary.complexity,
            affectedFiles: plan.affectedFiles.length
          }),
          output_data: JSON.stringify({
            planSummary: plan.summary.title,
            stepsCount: plan.implementationSteps.length,
            validationScore: validation.completenessScore,
            isValid: validation.isValid,
            errors: validation.errors,
            warnings: validation.warnings
          }),
          error_message: validation.isValid ? undefined : validation.errors.join('; '),
          duration_ms: 5000, // Approximate planning time
          created_at: new Date()
        }
      });
    } catch (error) {
      console.warn('Failed to log planning results:', error);
    }
  }

  async getPlan(taskId: string): Promise<TechnicalPlan | null> {
    try {
      const execution = await db.workflowExecution.findUnique({
        where: { id: taskId }
      });

      if (!execution?.trigger_data) {
        return null;
      }

      const data = typeof execution.trigger_data === 'string' 
        ? JSON.parse(execution.trigger_data) 
        : execution.trigger_data;

      // Return the full technical plan when present
      if (data.technicalPlan) {
        return data.technicalPlan as TechnicalPlan;
      }

      // If only executionPlan exists, map it to TechnicalPlan shape or return null
      if (data.executionPlan && data.executionPlan.summary) {
        // Convert simplified execution plan to full TechnicalPlan format
        return this.convertExecutionPlanToTechnicalPlan(data.executionPlan);
      }

      return null;
    } catch (error) {
      console.error(`Failed to retrieve plan for task ${taskId}:`, error);
      return null;
    }
  }

  private convertExecutionPlanToTechnicalPlan(executionPlan: any): TechnicalPlan | null {
    try {
      // Create a minimal TechnicalPlan from executionPlan data
      return {
        taskId: '', // Will be set by caller
        summary: {
          title: executionPlan.summary?.title || 'Converted Plan',
          description: executionPlan.summary?.description || 'Converted from execution plan',
          complexity: executionPlan.summary?.complexity || 'medium',
          estimatedTotalDuration: executionPlan.summary?.estimatedTotalDuration || 60,
          affectedFilesCount: executionPlan.affectedFiles?.length || 0
        },
        affectedFiles: executionPlan.affectedFiles || [],
        implementationSteps: executionPlan.steps?.map((step: any, index: number) => ({
          id: step.id || `step_${index}`,
          description: step.description || 'Implementation step',
          toolsNeeded: step.tools || [],
          estimatedDuration: step.estimatedDuration || 30,
          dependencies: [],
          riskLevel: 'medium',
          validationCriteria: ['Step completed']
        })) || [],
        dependencies: {
          external: [],
          internal: []
        },
        risks: [],
        acceptanceCriteria: [{
          id: 'basic-completion',
          description: 'Task completed according to plan',
          testMethod: 'Manual verification',
          successIndicators: ['All steps executed']
        }],
        bestPractices: [],
        agentSpecificGuidelines: [],
        createdAt: new Date(),
        createdBy: 'system'
      };
    } catch (error) {
      console.warn('Failed to convert execution plan to technical plan:', error);
      return null;
    }
  }
}

// ==================== UTILITY FUNCTIONS ====================

export function formatPlanForDisplay(plan: TechnicalPlan): string {
  let output = `# ${plan.summary.title}\n\n`;
  output += `**Description:** ${plan.summary.description}\n\n`;
  output += `**Complexity:** ${plan.summary.complexity}\n`;
  output += `**Estimated Duration:** ${plan.summary.estimatedTotalDuration} minutes\n`;
  output += `**Files Affected:** ${plan.summary.affectedFilesCount}\n\n`;

  // Affected Files
  output += `## 📁 Affected Files\n\n`;
  plan.affectedFiles.forEach(file => {
    output += `- **${file.path}** (${file.changeType})\n`;
    output += `  Reason: ${file.reason}\n`;
    if (file.estimatedLines) {
      output += `  Estimated lines: ~${file.estimatedLines}\n`;
    }
    output += `\n`;
  });

  // Implementation Steps
  output += `## 🔧 Implementation Steps\n\n`;
  plan.implementationSteps.forEach((step, index) => {
    output += `${index + 1}. **${step.description}**\n`;
    output += `   ⏱️ Estimated: ${step.estimatedDuration} minutes\n`;
    output += `   ⚠️ Risk Level: ${step.riskLevel}\n`;
    if (step.toolsNeeded.length > 0) {
      output += `   🛠️ Tools: ${step.toolsNeeded.map(t => `${t.serverName}.${t.toolName}`).join(', ')}\n`;
    }
    output += `   ✅ Validation: ${step.validationCriteria.join(', ')}\n\n`;
  });

  // Dependencies
  if (plan.dependencies.external.length > 0 || plan.dependencies.internal.length > 0) {
    output += `## 📦 Dependencies\n\n`;
    if (plan.dependencies.external.length > 0) {
      output += `**External:**\n`;
      plan.dependencies.external.forEach(dep => {
        output += `- \`${dep.packageName}@${dep.version}\` - ${dep.purpose}\n`;
        output += `  Command: \`${dep.installationCommand}\`\n`;
      });
      output += `\n`;
    }
    if (plan.dependencies.internal.length > 0) {
      output += `**Internal:**\n`;
      plan.dependencies.internal.forEach(dep => {
        output += `- ${dep.moduleName} (${dep.filePath}) - ${dep.purpose}\n`;
      });
      output += `\n`;
    }
  }

  // Risks
  if (plan.risks.length > 0) {
    output += `## ⚠️ Risk Assessment\n\n`;
    plan.risks.forEach(risk => {
      output += `- **${risk.level.toUpperCase()}**: ${risk.description}\n`;
      output += `  Impact: ${risk.impact}\n`;
      output += `  Mitigation: ${risk.mitigationStrategy}\n\n`;
    });
  }

  // Best Practices
  if (plan.bestPractices.length > 0) {
    output += `## ✨ Best Practices\n\n`;
    plan.bestPractices.forEach(practice => {
      output += `- ${practice}\n`;
    });
    output += `\n`;
  }

  // Acceptance Criteria
  output += `## ✅ Acceptance Criteria\n\n`;
  plan.acceptanceCriteria.forEach(criteria => {
    output += `- **${criteria.description}**\n`;
    output += `  Test Method: ${criteria.testMethod}\n`;
    output += `  Success Indicators: ${criteria.successIndicators.join(', ')}\n\n`;
  });

  return output;
}

export function generatePlanSummary(plan: TechnicalPlan): string {
  return `Plan for "${plan.summary.title}" - ${plan.summary.complexity} complexity, ${plan.summary.estimatedTotalDuration}min, ${plan.summary.affectedFilesCount} files`;
}

export async function createTechnicalPlan(
  taskId: string,
  userId: string,
  agentId: string,
  prompt: string
): Promise<TechnicalPlan> {
  const planner = new AutonomousAgentPlanner();
  return await planner.createPlan(taskId, userId, agentId, prompt);
}

export function validatePlan(plan: TechnicalPlan): PlanValidationResult {
  const validator = new PlanValidator();
  return validator.validatePlan(plan);
}

export async function enrichPlanWithDocs(plan: TechnicalPlan, queries: string[]): Promise<TechnicalPlan> {
  const generator = new PlanGenerator();
  // This would typically fetch docs for specific queries and integrate them
  // For now, we'll just return the plan as-is
  return plan;
}

// ==================== PLAN DIAGRAM AND EXPORT UTILITIES ====================

export function createPlanDiagram(plan: TechnicalPlan): string {
  let diagram = '```mermaid\n';
  diagram += 'graph TD\n';
  
  // Add nodes for each step
  plan.implementationSteps.forEach(step => {
    const nodeId = step.id.replace(/[^a-zA-Z0-9]/g, '_');
    diagram += `    ${nodeId}["${step.description}"]\n`;
  });
  
  // Add edges for dependencies
  plan.implementationSteps.forEach(step => {
    const nodeId = step.id.replace(/[^a-zA-Z0-9]/g, '_');
    step.dependencies.forEach(depId => {
      const depNodeId = depId.replace(/[^a-zA-Z0-9]/g, '_');
      diagram += `    ${depNodeId} --> ${nodeId}\n`;
    });
  });
  
  diagram += '```\n';
  return diagram;
}

export function exportPlanAsJSON(plan: TechnicalPlan): string {
  return JSON.stringify({
    plan: {
      summary: plan.summary,
      affectedFiles: plan.affectedFiles,
      implementationSteps: plan.implementationSteps.map(step => ({
        id: step.id,
        description: step.description,
        toolsNeeded: step.toolsNeeded,
        estimatedDuration: step.estimatedDuration,
        dependencies: step.dependencies,
        riskLevel: step.riskLevel,
        validationCriteria: step.validationCriteria,
        warnings: (step as any).warnings || []
      })),
      dependencies: plan.dependencies,
      risks: plan.risks,
      acceptanceCriteria: plan.acceptanceCriteria,
      bestPractices: plan.bestPractices,
      agentSpecificGuidelines: plan.agentSpecificGuidelines
    }
  }, null, 2);
}

// ==================== CACHING IMPLEMENTATION ====================

async function getCachedAgentConfig(agentId: string): Promise<AIAgent | null> {
  const redis = await getRedisClient();
  const cacheKey = `plan:agent_config:${agentId}`;
  
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn('Redis cache unavailable for agent config');
  }
  
  return null;
}

async function cacheAgentConfig(agentId: string, config: AIAgent): Promise<void> {
  const redis = await getRedisClient();
  const cacheKey = `plan:agent_config:${agentId}`;
  
  try {
    await redis.setEx(cacheKey, 3600, JSON.stringify(config)); // 1 hour TTL
  } catch (error) {
    console.warn('Failed to cache agent config');
  }
}

async function getCachedPlanTemplate(pattern: string): Promise<TechnicalPlan | null> {
  const redis = await getRedisClient();
  const cacheKey = `plan:template:${pattern}`;
  
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn('Redis cache unavailable for plan template');
  }
  
  return null;
}

async function cachePlanTemplate(pattern: string, template: TechnicalPlan): Promise<void> {
  const redis = await getRedisClient();
  const cacheKey = `plan:template:${pattern}`;
  
  try {
    await redis.setEx(cacheKey, 7200, JSON.stringify(template)); // 2 hours TTL
  } catch (error) {
    console.warn('Failed to cache plan template');
  }
}

// ==================== EXPORTED FUNCTIONS ====================

export function formatPlanForApproval(plan: TechnicalPlan): string {
  return formatPlanForDisplay(plan);
}

// Export caching functions for external use
export { getCachedAgentConfig, cacheAgentConfig, getCachedPlanTemplate, cachePlanTemplate };