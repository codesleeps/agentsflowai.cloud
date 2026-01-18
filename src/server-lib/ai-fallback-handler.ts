import { logModelUsage } from "./ai-usage-tracker";
import { AIModelUsage } from "@prisma/client";
import { APIKeyExpiredError } from "../lib/api-errors";
import { db } from "@/server-lib/prisma";
import { AI_AGENT_CONFIGS } from "@/shared/models/ai-agents";

// Type definitions for the fallback handler
interface GenerationRequest {
  prompt: string;
  enableWebSearch?: boolean;
  enableDeepResearch?: boolean;
  reasoningEffort?: "low" | "medium" | "high";
  modelProvider?: "openai" | "google";
  userId: string;
  agentId?: string; // Optional agent ID to look up specific configs
}

interface GenerationResult {
  text: string;
  fallbackUsed: boolean;
  provider: string;
}

interface AgentConfig {
  agentId: string;
  primaryProvider: "ollama" | "google" | "anthropic" | "openai";
  primaryModel: string;
  fallbackChain: Array<{
    provider: "ollama" | "google" | "anthropic" | "openai";
    model: string;
    priority: number;
  }>;
}

// Extracted from agents route - handle Anthropic provider
export async function handleAnthropicProvider(
  prompt: string,
  enableWebSearch: boolean,
  enableDeepResearch: boolean,
  reasoningEffort: "low" | "medium" | "high",
  agentConfig: AgentConfig,
  userId: string,
): Promise<{ text: string; provider: string }> {
  try {
    const response = await fetch(
      `${process.env.ANTHROPIC_API_BASE_URL}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: agentConfig.primaryModel,
          max_tokens: 4096,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          top_p: 0.9,
          web_search: enableWebSearch,
          deep_research: enableDeepResearch,
          reasoning_effort: reasoningEffort,
        }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || response.statusText;
      
      // Check for expired API key
      if (errorMessage.toLowerCase().includes('expired') || 
          (response.status === 401 && errorMessage.toLowerCase().includes('authentication'))) {
        throw new APIKeyExpiredError('Anthropic', 'https://console.anthropic.com/', 'ANTHROPIC_API_KEY');
      }
      
      throw new Error(
        `Anthropic API error: ${response.status} ${errorMessage}`,
      );
    }

    const data = await response.json();
    const text = data.content[0]?.text || "";

    await logModelUsage({
      user_id: userId,
      model: agentConfig.primaryModel,
      provider: "anthropic",
      prompt_tokens: data.usage?.input_tokens || 0,
      completion_tokens: data.usage?.output_tokens || 0,
      cost_usd: 0, // Will be calculated by logModelUsage
      latency_ms: 0, // Not available in this context
      status: "success",
      agent_id: agentConfig.agentId,
      error_message: undefined,
    });

    return { text, provider: "anthropic" };
  } catch (error) {
    console.error("Anthropic provider failed:", error);
    throw error;
  }
}

// Extracted from agents route - handle Google provider
export async function handleGoogleProvider(
  prompt: string,
  enableWebSearch: boolean,
  enableDeepResearch: boolean,
  reasoningEffort: "low" | "medium" | "high",
  agentConfig: AgentConfig,
  userId: string,
): Promise<{ text: string; provider: string }> {
  const functionStartTime = Date.now();
  console.log(`[Google Provider] Starting request - Provider: Google, API key configured: ${!!process.env.GOOGLE_API_KEY}`);

  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.error('[Google Provider] Missing API key. Checked: GOOGLE_API_KEY');
      throw new Error("GOOGLE_API_KEY is not defined");
    }

    const requestStartTime = Date.now();
    const response = await fetch(
      `${process.env.GOOGLE_AI_API_BASE_URL}/v1/models/${agentConfig.primaryModel}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 4096,
            responseMimeType: "text/plain",
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE",
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE",
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE",
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE",
            },
          ],
        }),
        signal: AbortSignal.timeout(30000), // 30 second timeout
      },
    );

    const requestDuration = Date.now() - requestStartTime;

    if (!response.ok) {
      let errorType = 'unknown';
      let errorDetails = `${response.status} ${response.statusText}`;

      if (response.status === 401) {
        errorType = 'auth_error';
        errorDetails = 'Authentication failed - invalid API key';
      } else if (response.status === 403) {
        errorType = 'auth_error';
        errorDetails = 'Forbidden - API key lacks permissions';
      } else if (response.status === 429) {
        errorType = 'rate_limit';
        errorDetails = 'Rate limit exceeded - too many requests';
      } else if (response.status >= 500) {
        errorType = 'api_error';
        errorDetails = `Google server error: ${response.status}`;
      }

      console.error(`[Google Provider] Model ${agentConfig.primaryModel} failed (${response.status}) after ${requestDuration}ms: ${errorType} - ${errorDetails}`);
      throw new Error(`Google API error (${response.status}): ${errorDetails}`);
    }

    const data = await response.json();
    const text = data.candidates[0]?.content?.parts[0]?.text || "";
    const totalDuration = Date.now() - functionStartTime;

    console.log(`[Google Provider] Model ${agentConfig.primaryModel} succeeded after ${totalDuration}ms: ${text.length} chars`);

    await logModelUsage({
      user_id: userId,
      model: agentConfig.primaryModel,
      provider: "google",
      prompt_tokens: data.usageMetadata?.promptTokenCount || 0,
      completion_tokens: data.usageMetadata?.candidatesTokenCount || 0,
      cost_usd: 0, // Will be calculated by logModelUsage
      latency_ms: totalDuration,
      status: "success",
      agent_id: agentConfig.agentId,
      error_message: undefined,
    });

    return { text, provider: "google" };
  } catch (error) {
    const totalDuration = Date.now() - functionStartTime;
    const errorInstance = error instanceof Error ? error : new Error(String(error));

    let errorType = 'unknown';
    let errorMessage = errorInstance.message;

    if (errorInstance.name === 'TimeoutError' || errorMessage.includes('timeout')) {
      errorType = 'timeout';
      errorMessage = 'Request timed out after 30s';
      console.error(`[Google Provider] Model ${agentConfig.primaryModel} failed: ${errorType} - ${errorMessage}`);
    } else if (errorMessage.includes('API key') || errorMessage.includes('authentication')) {
      errorType = 'auth_error';
      console.error(`[Google Provider] Model ${agentConfig.primaryModel} failed: ${errorType} - ${errorMessage}`);
    } else {
      errorType = 'api_error';
      console.error(`[Google Provider] Model ${agentConfig.primaryModel} failed: ${errorType} - ${errorMessage}`);
    }

    await logModelUsage({
      user_id: userId,
      model: agentConfig.primaryModel,
      provider: "google",
      prompt_tokens: 0,
      completion_tokens: 0,
      cost_usd: 0,
      latency_ms: totalDuration,
      status: "failed",
      agent_id: agentConfig.agentId,
      error_message: errorInstance.message,
    });

    throw errorInstance;
  }
}

// Extracted from agents route - handle Ollama provider
export async function handleOllamaProvider(
  prompt: string,
  enableWebSearch: boolean,
  enableDeepResearch: boolean,
  reasoningEffort: "low" | "medium" | "high",
  agentConfig: AgentConfig,
  userId: string,
): Promise<{ text: string; provider: string }> {
  const functionStartTime = Date.now();
  const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

  console.log(`[Ollama Provider] Attempting model: ${agentConfig.primaryModel} at ${OLLAMA_BASE_URL}`);

  const requestPayload = {
    model: agentConfig.primaryModel,
    prompt,
    stream: false,
    options: {
      temperature: 0.7,
      top_k: 40,
      top_p: 0.95,
      num_ctx: 4096,
    },
  };
  console.log(`[Ollama Provider] Request payload: model=${requestPayload.model}, promptLength=${requestPayload.prompt.length}`);

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestPayload),
      signal: AbortSignal.timeout(30000), // Increased timeout from default to 30s for local Ollama
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.error(`[Ollama Provider] Model ${agentConfig.primaryModel} failed: model_not_found - Model "${agentConfig.primaryModel}" not found. Available models can be listed with 'ollama list'`);
        throw new Error(`Ollama model "${agentConfig.primaryModel}" not found. Please pull it using 'ollama pull ${agentConfig.primaryModel}' or list available models with 'ollama list'`);
      }

      const errorType = response.status >= 500 ? 'api_error' : 'unknown';
      const errorMessage = `Ollama API returned ${response.status}`;
      console.error(`[Ollama Provider] Model ${agentConfig.primaryModel} failed: ${errorType} - ${errorMessage}`);
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.response || "";
    const totalDuration = Date.now() - functionStartTime;
    const responseLength = text.length;

    console.log(`[Ollama Provider] Model ${agentConfig.primaryModel} succeeded after ${totalDuration}ms: ${responseLength} chars, ${data.eval_count || 0} tokens`);

    await logModelUsage({
      user_id: userId,
      model: agentConfig.primaryModel,
      provider: "ollama",
      prompt_tokens: data.prompt_eval_count || 0,
      completion_tokens: data.eval_count || 0,
      cost_usd: 0, // Will be calculated by logModelUsage
      latency_ms: totalDuration,
      status: "success",
      agent_id: agentConfig.agentId,
      error_message: undefined,
    });

    return { text, provider: "ollama" };
  } catch (error) {
    const totalDuration = Date.now() - functionStartTime;
    const errorInstance = error instanceof Error ? error : new Error(String(error));

    let errorType = 'unknown';
    let errorMessage = errorInstance.message;

    if (errorInstance.name === 'TimeoutError' || errorMessage.includes('timeout')) {
      errorType = 'timeout';
      errorMessage = `Request timed out after 30s - model may be loading for first time`;
      console.error(`[Ollama Provider] Model ${agentConfig.primaryModel} failed: ${errorType} - ${errorMessage}`);
    } else if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('Connection refused')) {
      errorType = 'network_error';
      errorMessage = `Connection refused - is Ollama running at ${OLLAMA_BASE_URL}?`;
      console.error(`[Ollama Provider] Model ${agentConfig.primaryModel} failed: ${errorType} - ${errorMessage}`);
    } else if (errorMessage.includes('model') && errorMessage.includes('not found')) {
      errorType = 'model_not_found';
      console.error(`[Ollama Provider] Model ${agentConfig.primaryModel} failed: ${errorType} - ${errorMessage}`);
    } else {
      errorType = 'api_error';
      console.error(`[Ollama Provider] Model ${agentConfig.primaryModel} failed: ${errorType} - ${errorMessage}`);
    }

    await logModelUsage({
      user_id: userId,
      model: agentConfig.primaryModel,
      provider: "ollama",
      prompt_tokens: 0,
      completion_tokens: 0,
      cost_usd: 0,
      latency_ms: totalDuration,
      status: "failed",
      agent_id: agentConfig.agentId,
      error_message: errorInstance.message,
    });

    throw errorInstance;
  }
}

// Extracted from agents route - generate fallback response
function generateFallbackResponse(
  prompt: string,
  agentId: string,
  error: Error,
  conversationHistory: Array<{ role: string; content: string }> = [],
): string {
  const timestamp = new Date().toLocaleString();
  const errorDetails = error.message || "Unknown error";

  // Analyze prompt for context
  const promptLower = prompt.toLowerCase();
  const isPricingRelated =
    /price|cost|pricing|plan|subscription|fee|bill/i.test(promptLower);
  const isTechnicalRelated =
    /api|integration|code|developer|technical|setup|install/i.test(promptLower);
  const isServiceRelated =
    /service|feature|capability|support|help|documentation/i.test(promptLower);

  // Generate context-aware fallback message
  let contextMessage = "";

  if (isPricingRelated) {
    contextMessage = `
Based on your question about pricing, here's what I can tell you:
- We offer multiple service tiers to fit different needs and budgets
- Our pricing is transparent with no hidden fees
- We provide detailed documentation on our pricing structure
- You can contact our sales team for personalized quotes`;
  } else if (isTechnicalRelated) {
    contextMessage = `
Based on your technical question, here's what I can tell you:
- Our platform supports multiple integration methods
- We provide comprehensive API documentation
- Our technical team is available for complex implementation questions
- We offer developer resources and code examples`;
  } else if (isServiceRelated) {
    contextMessage = `
Based on your question about our services, here's what I can tell you:
- We offer a range of AI-powered services for lead generation and management
- Our platform includes multi-model AI support with automatic fallback
- We provide 24/7 support and comprehensive documentation
- Our services are designed to scale with your business needs`;
  } else {
    contextMessage = `
Based on your question, here's what I can tell you:
- Our AI system supports multiple providers with automatic fallback
- We prioritize reliability and uptime for all our services
- Our platform is designed to handle complex queries and conversations
- We continuously monitor and improve our AI capabilities`;
  }

  return `I'm currently experiencing connectivity issues with my AI providers, but I'm here to help! 

**Current Status:** ${errorDetails}
**Time:** ${timestamp}
**Agent:** ${agentId}

${contextMessage}

**What's happening:**
- All our AI agents support multi-model fallback for reliability
- We use Anthropic Claude, Google Gemini, and local Ollama models
- Your question has been logged and I'll provide a detailed response once reconnected

**In the meantime, you can:**
• Try asking a different question
• Check our documentation at [docs.agentsflow.ai](https://docs.agentsflow.ai)
• Contact our support team directly
• Review our service offerings and pricing

**Your original question:**
"${prompt}"

What else can I help you with?`;
}

// Helper to get effective configuration for an agent
async function getEffectiveAgentConfig(
  userId: string, 
  agentId: string, 
  defaultProvider: "openai" | "google" = "openai"
): Promise<AgentConfig> {
  // 1. Get default config from static definitions
  const staticConfig = AI_AGENT_CONFIGS[agentId];
  
  // Base config structure
  let config: AgentConfig = {
    agentId,
    primaryProvider: (staticConfig?.defaultProvider as any) || defaultProvider,
    primaryModel: staticConfig?.model || "gpt-4o-mini",
    fallbackChain: staticConfig?.supportedProviders.map(p => ({
      provider: p.provider as any,
      model: p.model,
      priority: p.priority
    })) || []
  };

  // 2. Check for user overrides in DB
  try {
    const userPrefs = await db.aIModelConfig.findMany({
      where: { userId, agentId, isEnabled: true },
      orderBy: { priority: 'asc' }
    });

    if (userPrefs.length > 0) {
      // Use user preferences
      const primary = userPrefs[0];
      config.primaryProvider = primary.provider as any;
      config.primaryModel = primary.model;
      
      config.fallbackChain = userPrefs.map(p => ({
        provider: p.provider as any,
        model: p.model,
        priority: p.priority
      }));
    }
  } catch (error) {
    console.warn(`Failed to fetch user AI preferences for ${agentId}:`, error);
    // Fallback to static config on DB error
  }

  return config;
}

// Simplified version of executeWithFallback for text generation
export async function executeSimpleGeneration(
  request: GenerationRequest,
): Promise<GenerationResult> {
  const {
    prompt,
    enableWebSearch = false,
    enableDeepResearch = false,
    reasoningEffort = "low",
    modelProvider = "openai",
    userId,
    agentId,
  } = request;

  // Determine target agent ID
  const targetAgentId = agentId || (modelProvider === "google" ? "gemini-agent" : "fast-chat-agent");

  // Get effective configuration (merging defaults with user prefs)
  const agentConfig = await getEffectiveAgentConfig(userId, targetAgentId, modelProvider);

  const providers = [
    { provider: agentConfig.primaryProvider, model: agentConfig.primaryModel },
    ...agentConfig.fallbackChain.map((item) => ({
      provider: item.provider,
      model: item.model,
    })),
  ];

  // Remove duplicates
  const uniqueProviders = providers.filter((v, i, a) => 
    a.findIndex(t => (t.provider === v.provider && t.model === v.model)) === i
  );

  let lastError: Error | null = null;

  for (const { provider, model } of uniqueProviders) {
    try {
      let result: { text: string; provider: string };

      switch (provider) {
        case "anthropic":
          result = await handleAnthropicProvider(
            prompt,
            enableWebSearch,
            enableDeepResearch,
            reasoningEffort,
            agentConfig,
            userId,
          );
          break;
        case "google":
          result = await handleGoogleProvider(
            prompt,
            enableWebSearch,
            enableDeepResearch,
            reasoningEffort,
            agentConfig,
            userId,
          );
          break;
        case "ollama":
          result = await handleOllamaProvider(
            prompt,
            enableWebSearch,
            enableDeepResearch,
            reasoningEffort,
            agentConfig,
            userId,
          );
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }

      return {
        text: result.text,
        fallbackUsed: provider !== agentConfig.primaryProvider,
        provider: result.provider,
      };
    } catch (error) {
      lastError = error as Error;
      console.error(`Provider ${provider} failed:`, error);

      // Log the failure
      await logModelUsage({
        user_id: userId,
        model,
        provider,
        prompt_tokens: 0,
        completion_tokens: 0,
        cost_usd: 0,
        latency_ms: 0,
        status: "failed",
        agent_id: agentConfig.agentId,
        error_message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // All providers failed, return static fallback
  const fallbackText = generateFallbackResponse(
    prompt,
    agentConfig.agentId,
    lastError!,
  );

  await logModelUsage({
    user_id: userId,
    model: "static-fallback",
    provider: "static",
    prompt_tokens: 0,
    completion_tokens: 0,
    cost_usd: 0,
    latency_ms: 0,
    status: "failed",
    agent_id: agentConfig.agentId,
    error_message: lastError?.message || "All providers failed",
  });

  return {
    text: fallbackText,
    fallbackUsed: true,
    provider: "static-fallback",
  };
}
