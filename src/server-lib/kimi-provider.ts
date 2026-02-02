/**
 * Kimi K2.5 Provider Integration
 * 
 * Handles API communication with Moonshot AI's Kimi K2.5 model for
 * autonomous agent orchestration, including complexity analysis,
 * execution planning, and swarm mode activation.
 */

import { logModelUsage } from "./ai-usage-tracker";
import { getEnv } from "@/lib/env-validation";

// Kimi K2.5 model identifier
export const KIMI_MODEL = "moonshotai/kimi-k2.5:free";

// Moonshot AI API configuration
const MOONSHOT_API_BASE_URL = "https://api.moonshot.cn/v1";

export interface KimiGenerationRequest {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  userId: string;
  agentId?: string;
}

export interface KimiGenerationResult {
  text: string;
  provider: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface KimiError {
  type: 'rate_limit' | 'auth_error' | 'timeout' | 'service_unavailable' | 'unknown';
  message: string;
  retryAfter?: number;
  requestId?: string;
}

/**
 * Check if Kimi K2.5 is configured and available
 */
export function isKimiConfigured(): boolean {
  const env = getEnv();
  return !!env.MOONSHOT_API_KEY;
}

/**
 * Get the swarm threshold from environment configuration
 */
export function getSwarmThreshold(): number {
  const env = getEnv();
  return env.KIMI_SWARM_THRESHOLD ?? 70;
}

/**
 * Check if swarm mode should be activated based on complexity score
 */
export function shouldActivateSwarmMode(complexityScore: number): boolean {
  const threshold = getSwarmThreshold();
  return complexityScore > threshold;
}

/**
 * Generate text using Kimi K2.5 via Moonshot AI API
 */
export async function generateWithKimi(
  request: KimiGenerationRequest
): Promise<KimiGenerationResult> {
  const env = getEnv();
  const apiKey = env.MOONSHOT_API_KEY;

  if (!apiKey) {
    throw new Error('MOONSHOT_API_KEY not configured');
  }

  const startTime = Date.now();
  const model = KIMI_MODEL;

  try {
    const messages = [];
    
    if (request.systemPrompt) {
      messages.push({
        role: 'system',
        content: request.systemPrompt
      });
    }
    
    messages.push({
      role: 'user',
      content: request.prompt
    });

    const response = await fetch(`${MOONSHOT_API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 4096,
      }),
      signal: AbortSignal.timeout(60000), // 60 second timeout
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || response.statusText;
      
      // Classify error type
      let errorType: KimiError['type'] = 'unknown';
      let retryAfter: number | undefined;

      if (response.status === 429) {
        errorType = 'rate_limit';
        retryAfter = parseInt(response.headers.get('retry-after') || '60', 10);
        throw new Error(`Kimi K2.5 rate limit exceeded. Please try again in ${retryAfter} seconds.`);
      } else if (response.status === 401 || response.status === 403) {
        errorType = 'auth_error';
        throw new Error(`Moonshot AI authentication failed. Please check your API key.`);
      } else if (response.status >= 500) {
        errorType = 'service_unavailable';
        throw new Error(`Moonshot AI service unavailable. Please try again later.`);
      } else if (response.status === 408 || errorMessage.toLowerCase().includes('timeout')) {
        errorType = 'timeout';
        throw new Error(`Kimi K2.5 timeout: Task complexity too high for current limits.`);
      }

      throw new Error(`Kimi K2.5 API Error: ${errorMessage}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    const usage = data.usage;

    // Log usage
    await logModelUsage({
      user_id: request.userId,
      model,
      provider: 'moonshot',
      prompt_tokens: usage?.prompt_tokens || 0,
      completion_tokens: usage?.completion_tokens || 0,
      cost_usd: 0, // Will be calculated by logModelUsage
      latency_ms: latencyMs,
      status: 'success',
      agent_id: request.agentId,
      error_message: undefined,
    });

    return {
      text,
      provider: 'moonshot',
      model,
      usage: usage ? {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      } : undefined,
    };

  } catch (error) {
    const latencyMs = Date.now() - startTime;

    // Log failure
    await logModelUsage({
      user_id: request.userId,
      model,
      provider: 'moonshot',
      prompt_tokens: 0,
      completion_tokens: 0,
      cost_usd: 0,
      latency_ms: latencyMs,
      status: 'failed',
      agent_id: request.agentId,
      error_message: error instanceof Error ? error.message : 'Unknown error',
    });

    // Re-throw with Kimi-specific error message
    if (error instanceof Error) {
      // If already formatted with Kimi prefix, re-throw as-is
      if (error.message.includes('Kimi K2.5') || error.message.includes('Moonshot AI')) {
        throw error;
      }
      
      // Otherwise wrap in generic Kimi error
      throw new Error(`Kimi K2.5 API Error: ${error.message}`);
    }
    
    throw new Error('Kimi K2.5 API Error: Unknown error occurred');
  }
}

/**
 * Analyze task complexity using Kimi K2.5
 */
export async function analyzeComplexityWithKimi(
  prompt: string,
  userId: string,
  context?: Record<string, any>
): Promise<{
  level: 'simple' | 'medium' | 'complex';
  score: number;
  estimatedSteps: number;
  reasoning: string;
  suggestedTools: string[];
}> {
  const systemPrompt = `You are an advanced task complexity analyzer powered by Kimi K2.5. 
Analyze the following user request and classify its complexity with precision.

Classification criteria:
- Simple (0-30): Single-file changes, basic queries, straightforward operations
- Medium (31-70): Multi-file changes, feature additions, moderate refactoring  
- Complex (71-100): Full feature development, architectural changes, multi-system integration

Consider:
1. Number of files/systems involved
2. Technical depth required
3. Integration complexity
4. Testing requirements
5. Potential risks and dependencies

Return ONLY valid JSON with this exact structure:
{
  "level": "simple|medium|complex",
  "score": number (0-100),
  "estimatedSteps": number,
  "reasoning": "detailed explanation of complexity factors",
  "suggestedTools": ["tool1", "tool2"]
}`;

  const userPrompt = `Analyze this task request: "${prompt}"
${context ? `Context: ${JSON.stringify(context)}` : ''}`;

  const result = await generateWithKimi({
    prompt: userPrompt,
    systemPrompt,
    temperature: 0.3,
    maxTokens: 2048,
    userId,
    agentId: 'complexity-analyzer',
  });

  // Parse the JSON response
  try {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        level: parsed.level,
        score: parsed.score,
        estimatedSteps: parsed.estimatedSteps,
        reasoning: parsed.reasoning,
        suggestedTools: parsed.suggestedTools || [],
      };
    }
  } catch (error) {
    console.warn('Failed to parse Kimi complexity response:', error);
  }

  // Fallback to medium complexity if parsing fails
  return {
    level: 'medium',
    score: 50,
    estimatedSteps: 5,
    reasoning: 'Fallback analysis due to parsing error',
    suggestedTools: ['context7'],
  };
}

/**
 * Generate execution plan using Kimi K2.5
 */
export async function generateExecutionPlanWithKimi(
  prompt: string,
  complexity: {
    level: string;
    score: number;
    estimatedSteps: number;
  },
  userId: string
): Promise<{
  title: string;
  description: string;
  steps: Array<{
    id: string;
    description: string;
    tools: string[];
    estimatedDuration: number;
  }>;
  affectedFiles: string[];
  dependencies: string[];
  risks: string[];
}> {
  const systemPrompt = `You are an expert execution planner powered by Kimi K2.5.
Create a detailed execution plan for the given task.

The task has been analyzed as:
- Complexity Level: ${complexity.level}
- Complexity Score: ${complexity.score}/100
- Estimated Steps: ${complexity.estimatedSteps}

Return ONLY valid JSON with this exact structure:
{
  "title": "Brief task title",
  "description": "Detailed description of what will be accomplished",
  "steps": [
    {
      "id": "step_1",
      "description": "What this step does",
      "tools": ["tool_name"],
      "estimatedDuration": 30
    }
  ],
  "affectedFiles": ["file1.ts", "file2.ts"],
  "dependencies": ["dependency1", "dependency2"],
  "risks": ["potential risk 1", "potential risk 2"]
}`;

  const result = await generateWithKimi({
    prompt: `Create an execution plan for: "${prompt}"`,
    systemPrompt,
    temperature: 0.4,
    maxTokens: 4096,
    userId,
    agentId: 'execution-planner',
  });

  // Parse the JSON response
  try {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        title: parsed.title || 'Execution Plan',
        description: parsed.description || '',
        steps: parsed.steps || [],
        affectedFiles: parsed.affectedFiles || [],
        dependencies: parsed.dependencies || [],
        risks: parsed.risks || [],
      };
    }
  } catch (error) {
    console.warn('Failed to parse Kimi execution plan:', error);
  }

  // Fallback plan if parsing fails
  return {
    title: 'Fallback Execution Plan',
    description: 'Basic plan due to parsing error',
    steps: Array.from({ length: complexity.estimatedSteps }, (_, i) => ({
      id: `step_${i + 1}`,
      description: `Execute step ${i + 1}`,
      tools: ['context7'],
      estimatedDuration: 30,
    })),
    affectedFiles: [],
    dependencies: [],
    risks: ['Plan generation encountered an error'],
  };
}

/**
 * Validate Moonshot API key
 */
export async function validateMoonshotApiKey(): Promise<{
  valid: boolean;
  message: string;
}> {
  const env = getEnv();
  const apiKey = env.MOONSHOT_API_KEY;

  if (!apiKey) {
    return {
      valid: false,
      message: 'MOONSHOT_API_KEY not configured',
    };
  }

  try {
    // Use the models endpoint for lightweight validation
    const response = await fetch(`${MOONSHOT_API_BASE_URL}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      return {
        valid: true,
        message: 'Kimi K2.5 integration active',
      };
    }

    if (response.status === 401 || response.status === 403) {
      return {
        valid: false,
        message: 'Invalid MOONSHOT_API_KEY - Authentication failed',
      };
    }

    return {
      valid: false,
      message: `Moonshot AI API returned status ${response.status}`,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        valid: false,
        message: 'Moonshot AI API unreachable - Check network connectivity',
      };
    }

    return {
      valid: false,
      message: `Moonshot AI validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
