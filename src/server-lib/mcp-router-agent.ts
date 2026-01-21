import { z } from 'zod';
import {
  MCPRouterRequest,
  MCPRouterResponse,
  MCPIntentClassification,
  MCPIntentType,
  MCPToolRoute,
  MCPOrchestrationPipeline,
  MCPOrchestrationStep,
  MCPToolExecutionResult,
  MCPRouterConfig,
  MCPRouterRequestSchema,
  MCPIntentClassificationSchema
} from '../shared/models/mcp-types';
import { executeMCPTool } from '../lib/mcp/tools/shared';
import { trackMCPUsage } from '../lib/mcp/tools/trackUsage';
import { MCPError } from '../lib/mcp/errors';
import { executeSimpleGeneration } from './ai-fallback-handler';

// Router Agent Configuration
const ROUTER_AGENT_CONFIG = {
  agentId: 'mcp-router-agent',
  primaryProvider: 'openrouter',
  primaryModel: 'z-ai/glm-4.5-air',
  fallbackChain: [
    { provider: 'openrouter', model: 'deepseek/deepseek-chat', priority: 1 },
    { provider: 'anthropic', model: 'claude-sonnet-4-5-20250929', priority: 2 },
    { provider: 'ollama', model: 'mistral', priority: 3 }
  ]
};

// Static Routing Rules
const ROUTING_RULES: Record<MCPIntentType, MCPToolRoute[]> = {
  [MCPIntentType.DOCUMENTATION_SEARCH]: [
    { serverName: 'context7', toolName: 'search', priority: 1 },
    { serverName: 'fetch', toolName: 'fetch_and_extract', priority: 2 }
  ],
  [MCPIntentType.WEB_SCRAPING]: [
    { serverName: 'fetch', toolName: 'fetch_and_extract', priority: 1 },
    { serverName: 'playwright', toolName: 'navigate', priority: 2 }
  ],
  [MCPIntentType.BROWSER_AUTOMATION]: [
    { serverName: 'playwright', toolName: 'navigate', priority: 1 },
    { serverName: 'fetch', toolName: 'fetch_url', priority: 2 }
  ],
  [MCPIntentType.HYBRID_RESEARCH]: [
    { serverName: 'context7', toolName: 'search', priority: 1 },
    { serverName: 'fetch', toolName: 'fetch_and_extract', priority: 2 },
    { serverName: 'playwright', toolName: 'navigate', priority: 3 }
  ],
  [MCPIntentType.GENERAL_QUERY]: [
    { serverName: 'context7', toolName: 'search', priority: 1 }
  ]
};

// Orchestration Pipelines
const ORCHESTRATION_PIPELINES: Record<string, MCPOrchestrationPipeline> = {
  'tech-research': {
    name: 'Technology Research',
    steps: [
      { tool: 'context7.search', input: 'query', output: 'docs' },
      { tool: 'fetch.fetch_and_extract', input: 'docs[0].url', output: 'examples' },
      { tool: 'playwright.navigate', input: 'examples[0].demoUrl', output: 'screenshot' }
    ]
  }
};

// Default Router Configuration
const DEFAULT_ROUTER_CONFIG: MCPRouterConfig = {
  maxToolsPerRequest: 3,
  classificationTimeout: 5000,
  enableOrchestration: true,
  fallbackToPatternMatching: true,
  cacheClassifications: true,
  confidenceThreshold: 0.7,
  defaultTimeout: 30000
};

// Classification Cache (simple in-memory cache)
const classificationCache = new Map<string, { result: MCPIntentClassification; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Intent Classification Logic
async function classifyIntent(query: string): Promise<MCPIntentClassification> {
  // Check cache first
  if (DEFAULT_ROUTER_CONFIG.cacheClassifications) {
    const cached = classificationCache.get(query);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return cached.result;
    }
  }

  const systemPrompt = `You are an intent classifier for MCP tool routing. Analyze user queries and classify them into one of these categories:

DOCUMENTATION_SEARCH: Searching for technical documentation, API references, guides, tutorials, or help documentation
WEB_SCRAPING: Extracting data from websites, scraping content, downloading web pages, or fetching specific information from URLs
BROWSER_AUTOMATION: UI testing, taking screenshots, clicking elements, navigating web applications, or browser-based interactions
HYBRID_RESEARCH: Multi-step research workflows combining documentation search with web scraping or browser automation
GENERAL_QUERY: Fallback for unclear or general-purpose queries

Return a JSON response with this exact structure:
{
  "intent": "DOCUMENTATION_SEARCH|WEB_SCRAPING|BROWSER_AUTOMATION|HYBRID_RESEARCH|GENERAL_QUERY",
  "confidence": 0.0-1.0,
  "suggestedParameters": { "key": "value" },
  "reasoning": "brief explanation"
}

Examples:
- "How do I use React hooks?" → DOCUMENTATION_SEARCH, confidence: 0.9
- "Extract all product prices from amazon.com" → WEB_SCRAPING, confidence: 0.95
- "Take a screenshot of the login page" → BROWSER_AUTOMATION, confidence: 0.9
- "Research React best practices and find examples" → HYBRID_RESEARCH, confidence: 0.85`;

  const userPrompt = `Classify this query: "${query}"`;

  try {
    // Try primary AI provider first
    const generationRequest = {
      prompt: `${systemPrompt}\n\n${userPrompt}`,
      enableWebSearch: false,
      enableDeepResearch: false,
      reasoningEffort: 'low' as const,
      modelProvider: 'openai' as const,
      userId: 'mcp-router-agent'
    };

    const aiResponse = await executeSimpleGeneration(generationRequest);

    const classification = parseAIClassificationResponse(aiResponse.text);
    if (classification) {
      // Cache the result
      if (DEFAULT_ROUTER_CONFIG.cacheClassifications) {
        classificationCache.set(query, { result: classification, timestamp: Date.now() });
      }
      return classification;
    }
  } catch (error) {
    console.warn('Primary AI classification failed:', error);
  }

  // Fallback to pattern matching
  return classifyIntentWithPatterns(query);
}

function parseAIClassificationResponse(response: string): MCPIntentClassification | null {
  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    const validation = MCPIntentClassificationSchema.safeParse(parsed);

    if (validation.success) {
      return validation.data as MCPIntentClassification;
    } else {
      console.warn('AI response validation failed:', validation.error);
      return null;
    }
  } catch (error) {
    console.warn('Failed to parse AI classification response:', error);
    return null;
  }
}

function classifyIntentWithPatterns(query: string): MCPIntentClassification {
  const lowerQuery = query.toLowerCase();

  // Pattern-based classification
  const patterns = {
    [MCPIntentType.DOCUMENTATION_SEARCH]: /search|docs?|documentation|api reference|guide|tutorial|help|how to|what is/i,
    [MCPIntentType.WEB_SCRAPING]: /scrape|fetch|extract|download|website|url|data from|content from/i,
    [MCPIntentType.BROWSER_AUTOMATION]: /test|screenshot|click|navigate|browser|ui|page|login|form/i,
    [MCPIntentType.HYBRID_RESEARCH]: /research|analyze|investigate|study|examine|find.*and|compare/i
  };

  let bestMatch: MCPIntentType = MCPIntentType.GENERAL_QUERY;
  let highestScore = 0;

  for (const [intent, pattern] of Object.entries(patterns)) {
    const matches = (lowerQuery.match(pattern) || []).length;
    const score = matches / (lowerQuery.split(' ').length || 1); // Normalize by query length

    if (score > highestScore) {
      highestScore = score;
      bestMatch = intent as MCPIntentType;
    }
  }

  return {
    intent: bestMatch,
    confidence: Math.min(highestScore * 2, 0.8), // Cap at 0.8 for pattern matching
    reasoning: `Pattern-based classification with score: ${highestScore}`
  };
}

// Routing Rules Engine
function selectToolsForIntent(
  intent: MCPIntentType,
  availableTools: string[] = []
): MCPToolRoute[] {
  const routes = ROUTING_RULES[intent] || ROUTING_RULES[MCPIntentType.GENERAL_QUERY];

  // Filter by available tools if specified
  const filteredRoutes = availableTools.length > 0
    ? routes.filter(route => availableTools.includes(`${route.serverName}.${route.toolName}`))
    : routes;

  // Sort by priority and limit to max tools
  return filteredRoutes
    .sort((a, b) => a.priority - b.priority)
    .slice(0, DEFAULT_ROUTER_CONFIG.maxToolsPerRequest);
}

// Multi-Tool Orchestration
async function executeOrchestrationPipeline(
  pipeline: MCPOrchestrationPipeline,
  initialData: Record<string, any>,
  intent: MCPIntentType,
  config: MCPRouterConfig = DEFAULT_ROUTER_CONFIG
): Promise<MCPToolExecutionResult[]> {
  const results: MCPToolExecutionResult[] = [];
  const context: Record<string, any> = { ...initialData };

  for (const step of pipeline.steps) {
    const startTime = Date.now();

    try {
      // Parse input from context
      const inputValue = resolveDataPath(step.input, context);

      // Parse tool specification
      const [serverName, toolName] = step.tool.split('.');

      const toolRoute: MCPToolRoute = {
        serverName,
        toolName,
        parameters: { input: inputValue },
        priority: 1
      };

      // Execute tool
      const toolResult = await executeMCPTool(
        toolRoute.serverName,
        toolRoute.toolName,
        toolRoute.parameters,
        'mcp-router-agent',
        step.timeout || config.defaultTimeout
      );

      const executionTime = Date.now() - startTime;
      trackMCPUsage(toolRoute.serverName, toolRoute.toolName, executionTime, true);
      const cost = estimateExecutionCost(intent, [toolRoute]);

      const executionResult: MCPToolExecutionResult = {
        toolRoute,
        success: toolResult.success,
        result: toolResult.success ? toolResult.data : null,
        error: toolResult.success ? undefined : 'Tool execution failed',
        cost,
        executionTime,
        retryCount: 0
      };

      results.push(executionResult);

      // Store output in context
      context[step.output] = toolResult.data;

    } catch (error) {
      const executionTime = Date.now() - startTime;

      const executionResult: MCPToolExecutionResult = {
        toolRoute: {
          serverName: step.tool.split('.')[0],
          toolName: step.tool.split('.')[1],
          priority: 1
        },
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        cost: 0,
        executionTime,
        retryCount: 0
      };

      results.push(executionResult);

      // Continue with partial results unless it's a critical failure
      console.warn(`Pipeline step failed: ${step.tool}`, error);
    }
  }

  return results;
}

function resolveDataPath(path: string, context: Record<string, any>): any {
  // Simple dot notation and array access resolution
  try {
    return path.split('.').reduce((obj, key) => {
      if (key.includes('[')) {
        const [arrayKey, indexStr] = key.split('[');
        const index = parseInt(indexStr.replace(']', ''));
        return obj[arrayKey][index];
      }
      return obj[key];
    }, context);
  } catch {
    // Return the path as-is if resolution fails
    return path;
  }
}

// Router Execution Function
export async function routeMCPRequest(request: MCPRouterRequest): Promise<MCPRouterResponse> {
  const startTime = Date.now();

  try {
    // Validate request
    const validation = MCPRouterRequestSchema.safeParse(request);
    if (!validation.success) {
      throw new MCPError(`Invalid request: ${validation.error.message}`, 'VALIDATION_ERROR');
    }

    const config = { ...DEFAULT_ROUTER_CONFIG, ...request.preferences };

    // Classify intent
    const intent = await classifyIntent(request.query);

    // Determine if orchestration is needed
    const needsOrchestration = config.enableOrchestration &&
      (intent.intent === MCPIntentType.HYBRID_RESEARCH ||
       (intent.intent === MCPIntentType.DOCUMENTATION_SEARCH && intent.confidence > 0.8));

    let executionResults: MCPToolExecutionResult[] = [];
    let selectedTools: MCPToolRoute[] = [];
    let totalCost = 0;

    if (needsOrchestration) {
      // Use orchestration pipeline
      const pipeline = ORCHESTRATION_PIPELINES['tech-research']; // Default pipeline
      if (pipeline) {
        executionResults = await executeOrchestrationPipeline(pipeline, {
          query: request.query,
          userId: request.userId,
          ...request.context
        }, intent.intent, config);

        selectedTools = pipeline.steps.map(step => ({
          serverName: step.tool.split('.')[0],
          toolName: step.tool.split('.')[1],
          priority: 1
        }));

        totalCost = executionResults.reduce((sum, result) => sum + result.cost, 0);
      }
    } else {
      // Single or parallel tool execution
      const availableTools = await getAvailableTools();
      selectedTools = selectToolsForIntent(intent.intent, availableTools);

      // Execute tools
      for (const toolRoute of selectedTools) {
        const startTime = Date.now();

        try {
          const toolResult = await executeMCPTool(
            toolRoute.serverName,
            toolRoute.toolName,
            { query: request.query, ...toolRoute.parameters },
            request.userId,
            config.defaultTimeout
          );

          const executionTime = Date.now() - startTime;
          trackMCPUsage(toolRoute.serverName, toolRoute.toolName, executionTime, toolResult.success);
          const cost = estimateExecutionCost(intent.intent, [toolRoute]);

          executionResults.push({
            toolRoute,
            success: toolResult.success,
            result: toolResult.success ? toolResult.data : null,
            error: toolResult.success ? undefined : 'Tool execution failed',
            cost,
            executionTime,
            retryCount: 0
          });

          totalCost += cost;

        } catch (error) {
          const executionTime = Date.now() - startTime;

          executionResults.push({
            toolRoute,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            cost: 0,
            executionTime,
            retryCount: 0
          });
        }
      }
    }

    const executionTime = Date.now() - startTime;

    return {
      intent,
      selectedTools,
      executionResults,
      confidence: intent.confidence,
      fallbackUsed: intent.confidence < config.confidenceThreshold,
      totalCost,
      executionTime
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;

    return {
      intent: { intent: MCPIntentType.GENERAL_QUERY, confidence: 0 },
      selectedTools: [],
      executionResults: [],
      confidence: 0,
      fallbackUsed: true,
      totalCost: 0,
      executionTime,
      error: error instanceof Error ? error.message : 'Unknown routing error'
    };
  }
}

// Configuration and Utilities
export { DEFAULT_ROUTER_CONFIG as MCPRouterConfig };

export async function getAvailableTools(): Promise<string[]> {
  // This would check health of MCP servers
  // For now, return all configured tools
  const allTools: string[] = [];
  for (const routes of Object.values(ROUTING_RULES)) {
    for (const route of routes) {
      allTools.push(`${route.serverName}.${route.toolName}`);
    }
  }
  return [...new Set(allTools)]; // Remove duplicates
}

export function estimateExecutionCost(intent: MCPIntentType, tools: MCPToolRoute[]): number {
  // Simple cost estimation based on tool types
  // In a real implementation, this would use historical data or pricing APIs
  const baseCosts = {
    'context7.search': 0.001,
    'fetch.fetch_and_extract': 0.002,
    'playwright.navigate': 0.005
  };

  return tools.reduce((total, tool) => {
    const key = `${tool.serverName}.${tool.toolName}`;
    return total + (baseCosts[key as keyof typeof baseCosts] || 0.001);
  }, 0);
}

export function validateRouterRequest(request: MCPRouterRequest): boolean {
  return MCPRouterRequestSchema.safeParse(request).success;
}

export function formatRouterResponse(results: MCPToolExecutionResult[]): any {
  // Format and normalize response structure
  return {
    results: results.map(result => ({
      tool: `${result.toolRoute.serverName}.${result.toolRoute.toolName}`,
      success: result.success,
      data: result.result,
      error: result.error,
      cost: result.cost,
      executionTime: result.executionTime
    })),
    summary: {
      totalResults: results.length,
      successfulResults: results.filter(r => r.success).length,
      totalCost: results.reduce((sum, r) => sum + r.cost, 0),
      totalExecutionTime: results.reduce((sum, r) => sum + r.executionTime, 0)
    }
  };
}

export function clearClassificationCache(): void {
  classificationCache.clear();
}

// Export additional functions for testing and external use
export { classifyIntent, selectToolsForIntent, executeOrchestrationPipeline };
