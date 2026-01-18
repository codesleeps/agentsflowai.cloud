import { NextRequest, NextResponse } from "next/server";
import { AI_AGENTS } from "@/shared/models/ai-agents";
import {
  AIAgentRequestSchema,
  validateAndSanitize,
} from "@/lib/validation-schemas";
import { requireAuth } from "@/lib/auth-helpers";
import { handleApiError, APIKeyExpiredError } from "@/lib/api-errors";
import * as cheerio from "cheerio";
import axios from "axios";
import { logModelUsage } from "@/server-lib/ai-usage-tracker";
import { AIMessage } from "@/shared/models/types";
import { AIAgent } from "../../../../shared/models/ai-agents";
import { checkOllamaHealth, isModelAvailable, suggestModelPull, getAvailableOllamaModels, getOllamaTimeoutWithFirstLoad, markModelAsLoaded, isFirstLoad, warmupOllamaModels, queueOllamaRequest, getQueueStatus, getMaxConcurrentRequests, getMaxRequestsPerMinute } from "@/server-lib/ollama-utils";
import { getCachedAIResponse, setCachedAIResponse, generateCacheKey } from "@/server-lib/redis-cache";
import { registerShutdownHandlers } from "@/lib/graceful-shutdown";
import { logActivity } from "@/lib/activity-log";

// Register graceful shutdown handlers at module load (only in production)
registerShutdownHandlers();

// Structured error response types
interface ProviderError {
  provider: string;
  model: string;
  error: string;
  errorType: 'timeout' | 'api_error' | 'network_error' | 'auth_error' | 'rate_limit' | 'model_not_found' | 'api_key_expired' | 'unknown';
  duration: number;
  timestamp: Date;
}

// Structured fallback error with suggested action and documentation
interface FallbackErrorDetail {
  provider: string;
  model: string;
  error: string;
  errorType: 'timeout' | 'api_error' | 'network_error' | 'auth_error' | 'rate_limit' | 'model_not_found' | 'api_key_expired' | 'unknown';
  suggestedAction: string;
  documentationUrl: string;
  retryGuidance?: {
    shouldRetry: boolean;
    initialWaitMs: number;
    backoffMultiplier: number;
    maxRetries: number;
  };
}

// Retry guidance by error type
function getRetryGuidance(errorType: string): { shouldRetry: boolean; initialWaitMs: number; backoffMultiplier: number; maxRetries: number } {
  const retryConfigs: Record<string, { shouldRetry: boolean; initialWaitMs: number; backoffMultiplier: number; maxRetries: number }> = {
    timeout: {
      shouldRetry: true,
      initialWaitMs: 30000, // 30 seconds
      backoffMultiplier: 2,
      maxRetries: 3,
    },
    rate_limit: {
      shouldRetry: true,
      initialWaitMs: 60000, // 60 seconds for rate limits
      backoffMultiplier: 2,
      maxRetries: 3,
    },
    api_error: {
      shouldRetry: true,
      initialWaitMs: 15000, // 15 seconds for server errors
      backoffMultiplier: 2,
      maxRetries: 2,
    },
    network_error: {
      shouldRetry: true,
      initialWaitMs: 10000, // 10 seconds for network issues
      backoffMultiplier: 1.5,
      maxRetries: 2,
    },
    auth_error: {
      shouldRetry: false, // Don't retry auth errors without fixing credentials
      initialWaitMs: 0,
      backoffMultiplier: 0,
      maxRetries: 0,
    },
    api_key_expired: {
      shouldRetry: false, // Don't retry until key is renewed
      initialWaitMs: 0,
      backoffMultiplier: 0,
      maxRetries: 0,
    },
    model_not_found: {
      shouldRetry: false, // Don't retry, model needs to be changed
      initialWaitMs: 0,
      backoffMultiplier: 0,
      maxRetries: 0,
    },
    unknown: {
      shouldRetry: true,
      initialWaitMs: 20000,
      backoffMultiplier: 1.5,
      maxRetries: 2,
    },
  };
  
  return retryConfigs[errorType] || retryConfigs.unknown;
}

// Get documentation URL by provider and error type
function getDocumentationUrl(provider: string, errorType: string): string {
  const docsUrls: Record<string, Record<string, string>> = {
    google: {
      general: 'https://ai.google.dev/docs',
      timeout: 'https://ai.google.dev/docs/troubleshooting#timeouts',
      rate_limit: 'https://ai.google.dev/quotas',
      auth_error: 'https://ai.google.dev/api-keys',
      api_key_expired: 'https://makersuite.google.com/app/apikey',
    },
    openrouter: {
      general: 'https://openrouter.ai/docs',
      timeout: 'https://openrouter.ai/docs/troubleshooting',
      rate_limit: 'https://openrouter.ai/docs/guides/rate-limits',
      auth_error: 'https://openrouter.ai/docs/authentication',
      api_key_expired: 'https://openrouter.ai/keys',
    },
    openai: {
      general: 'https://platform.openai.com/docs',
      timeout: 'https://platform.openai.com/docs/api-reference/error-codes',
      rate_limit: 'https://platform.openai.com/docs/guides/rate-limits',
      auth_error: 'https://platform.openai.com/docs/api-reference/authentication',
      api_key_expired: 'https://platform.openai.com/api-keys',
    },
    ollama: {
      general: 'https://ollama.com/docs',
      timeout: 'https://ollama.com/docs/troubleshooting#timeouts',
      network_error: 'https://ollama.com/docs/troubleshooting#connection',
      model_not_found: 'https://ollama.com/docs/models',
    },
  };
  
  const providerDocs = docsUrls[provider.toLowerCase()] || {};
  return providerDocs[errorType] || providerDocs['general'] || 'https://docs.agentsflowai.cloud/troubleshooting';
}

// Get suggested action by error type
function getSuggestedAction(provider: string, errorType: string, error: string): string {
  const actions: Record<string, string> = {
    timeout: `The ${provider} service took too long to respond. Implement exponential backoff: wait 30s, then retry. If using local models, check system resources.`,
    rate_limit: `You've exceeded ${provider}'s rate limit. Implement exponential backoff: wait 60s, double wait on each retry. Consider upgrading your plan for higher limits.`,
    api_error: `${provider} server error. Wait 15s and retry with exponential backoff. If persistent, check ${provider} status page.`,
    network_error: `Network connectivity issue with ${provider}. Check internet connection, firewall, and ${provider} service status.`,
    auth_error: `Authentication failed for ${provider}. Verify API key is correctly set in environment variables.`,
    api_key_expired: `API key for ${provider} has expired or been revoked. Renew at your provider dashboard and update the API key in .env file.`,
    model_not_found: `Model not available on ${provider}. Check model availability or try a different model from the supported list.`,
    unknown: `Unexpected error with ${provider}. Check logs and documentation for troubleshooting steps.`,
  };
  
  return actions[errorType] || actions.unknown;
}

// Create detailed fallback error for a provider
function createFallbackErrorDetail(entry: { provider: string; model: string; error: string; duration: number; timestamp: Date }): FallbackErrorDetail {
  const errorType = classifyErrorType(entry.error);
  const retryGuidance = getRetryGuidance(errorType);
  
  return {
    provider: entry.provider,
    model: entry.model,
    error: entry.error,
    errorType,
    suggestedAction: getSuggestedAction(entry.provider, errorType, entry.error),
    documentationUrl: getDocumentationUrl(entry.provider, errorType),
    retryGuidance: retryGuidance.shouldRetry ? retryGuidance : undefined,
  };
}

interface AIAgentResponse {
  response: string;
  model: string;
  agentId: string;
  agentName: string;
  tokensUsed: number;
  generationTime: number;
  fallbackUsed: boolean;
  usedProvider: string;
  note?: string;
  errorLog?: ProviderError[];
  errorDetails?: FallbackErrorDetail[];
  healthCheckUrl?: string;
  documentationUrl?: string;
}

// Module-level environment check (runs once on load)
async function verifyEnvironmentVariables() {
  const providers = {
    google: !!(process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY),
    openrouter: !!process.env.OPENROUTER_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
    ollama: !!process.env.OLLAMA_BASE_URL,
  };

  console.log('[AI Agents API] Environment initialized:', providers);

  const availableProviders = Object.entries(providers)
    .filter(([_, available]) => available)
    .map(([name]) => name);

  if (availableProviders.length === 0) {
    console.warn('[AI Agents API] WARNING: No AI providers configured!');
  } else {
    console.log('[AI Agents API] Available providers:', availableProviders.join(', '));
  }

  // Ollama-specific checks
  const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434 (default)';
  console.log('[AI Agents API] Ollama URL:', ollamaUrl);

  // Quick non-blocking health check for Ollama
  try {
    const ollamaHealthCheck = await Promise.race([
      checkOllamaHealth(),
      new Promise<{ available: boolean; models: string[]; error?: string }>((resolve) =>
        setTimeout(() => resolve({ available: false, models: [], error: 'timeout' }), 2000)
      )
    ]);

    if (ollamaHealthCheck.available) {
      console.log('[AI Agents API] Ollama status: reachable');
      
      // Check model availability
      const requiredModels = ['mistral:7b', 'gemma2:9b', 'codellama:7b'];
      const availableModels = ollamaHealthCheck.models || [];
      
      const availableRequiredModels = requiredModels.filter(m => availableModels.includes(m));
      const missingModels = requiredModels.filter(m => !availableModels.includes(m));
      
      console.log(`[AI Agents API] Ollama models available: ${availableRequiredModels.join(', ')} (${availableRequiredModels.length}/${requiredModels.length})`);
      
      if (missingModels.length > 0) {
        console.log(`[AI Agents API] Missing models: ${missingModels.join(', ')} - Run: docker-compose exec ollama ollama pull ${missingModels[0]}`);
        console.log('[AI Agents API] WARNING: Ollama is running but some required models are missing.');
      }
      
      // Warmup on startup (default behavior for top 3 models)
      const shouldWarmup = process.env.OLLAMA_WARMUP_ON_STARTUP !== 'false'; // Default to true unless explicitly set to false
      if (shouldWarmup && availableRequiredModels.length > 0) {
        console.log('[AI Agents API] Starting model warmup (default behavior)...');
        warmupOllamaModels(availableRequiredModels.slice(0, 3)) // Top 3 models by default
          .then(result => {
            console.log(`[AI Agents API] Model warmup completed: ${result.warmedModels.length} warmed, ${result.failedModels.length} failed in ${(result.totalTime / 1000).toFixed(1)}s`);
          })
          .catch(err => {
            console.log(`[AI Agents API] Model warmup error: ${err.message}`);
          });
      }
    } else {
      console.log('[AI Agents API] Ollama status: unreachable');
      console.log('[AI Agents API] Ollama not detected. Install from https://ollama.com or set OLLAMA_BASE_URL');
    }
  } catch (error) {
    console.log('[AI Agents API] Ollama status: unreachable');
    console.log('[AI Agents API] Ollama not detected. Install from https://ollama.com or set OLLAMA_BASE_URL');
  }
}

// Run verification on module load
verifyEnvironmentVariables();

// Helper function to parse provider error responses for expiration detection
async function parseProviderError(response: Response): Promise<{
  isExpired: boolean;
  message: string;
  reason?: string;
}> {
  try {
    const errorBody = await response.json();
    const errorMessage = errorBody.error?.message || errorBody.message || JSON.stringify(errorBody);
    const lowerMessage = errorMessage.toLowerCase();
    
    // Check for expiration indicators
    const isExpired = lowerMessage.includes('expired') || 
                     lowerMessage.includes('api_key_invalid') || 
                     lowerMessage.includes('renew');
    
    // Extract reason if available (Google API structure)
    const reason = errorBody.error?.details?.[0]?.reason || errorBody.error?.reason;
    
    return {
      isExpired: isExpired || reason === 'API_KEY_INVALID',
      message: errorMessage,
      reason
    };
  } catch (parseError) {
    // If parsing fails, return the status text
    return {
      isExpired: false,
      message: response.statusText,
    };
  }
}

// Helper function to calculate OpenAI API costs
function calculateOpenAICost(model: string, promptTokens: number, completionTokens: number): number {
  // Pricing as of 2024 (per 1M tokens)
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4o': { input: 5, output: 15 },
    'gpt-4o-mini': { input: 0.15, output: 0.6 },
    'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  };

  const modelPricing = pricing[model.toLowerCase()];
  if (!modelPricing) {
    console.warn(`[OpenAI Cost] Unknown model: ${model}, using GPT-3.5-turbo pricing`);
    return calculateOpenAICost('gpt-3.5-turbo', promptTokens, completionTokens);
  }

  const inputCost = (promptTokens / 1_000_000) * modelPricing.input;
  const outputCost = (completionTokens / 1_000_000) * modelPricing.output;
  return inputCost + outputCost;
}

// Helper to extract text from URL
async function fetchUrlContent(url: string): Promise<string | null> {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; AgentsFlowAI/1.0; +https://agentsflowai.cloud)",
      },
    });

    const $ = cheerio.load(response.data);

    // Remove scripts, styles, and other non-content elements
    $("script").remove();
    $("style").remove();
    $("nav").remove();
    $("footer").remove();
    $("header").remove();

    // extract text
    const text = $("body").text().replace(/\s+/g, " ").trim().slice(0, 15000); // Limit to ~15k chars
    return text;
  } catch (error) {
    console.error(`Failed to fetch URL ${url}:`, error);
    return null;
  }
}

// Get all agents
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(AI_AGENTS);
  } catch (error) {
    return handleApiError(error);
  }
}

// Generate response from a specific agent
export async function POST(request: NextRequest) {
  let startTime = Date.now();
  try {
    // Authenticate user
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Log environment variable status
    console.log(`[AI Agents] Environment check: GOOGLE_API_KEY=${!!process.env.GOOGLE_API_KEY}, GOOGLE_GENERATIVE_AI_API_KEY=${!!process.env.GOOGLE_GENERATIVE_AI_API_KEY}, OPENROUTER_API_KEY=${!!process.env.OPENROUTER_API_KEY}, OLLAMA_BASE_URL=${process.env.OLLAMA_BASE_URL || 'not set'}`);

    const body = await request.json();

    // Validate input using Zod schema
    const validatedData = validateAndSanitize(AIAgentRequestSchema, body);
    const { agentId, message } = validatedData;
    let { conversationHistory = [] } = validatedData;

    // Map conversation history to strictly typed AIMessage[]
    const enrichedHistory: AIMessage[] = conversationHistory.map(
      (msg: any, index: number) => ({
        role: msg.role,
        content: msg.content,
        id: msg.id || `hist-${Date.now()}-${index}`,
        agentId: msg.agentId || agentId,
        timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
      }),
    );

    // Helper to find URLs in message
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = message.match(urlRegex);

    let enrichedMessage = message;

    // If URL found, scrape it (limit to first URL for now)
    if (urls && urls.length > 0) {
      const urlToScrape = urls[0];
      console.log(`Detected URL: ${urlToScrape}, fetching content...`);
      const scrapedContent = await fetchUrlContent(urlToScrape);

      if (scrapedContent) {
        console.log(`Successfully scraped ${scrapedContent.length} chars.`);
        enrichedMessage = `${message}

[System Context: The user provided a URL. Here is the scraped content of ${urlToScrape} for your analysis:]

${scrapedContent}`;
      } else {
        enrichedMessage = `${message}\n\n[System Context: The user provided a URL (${urlToScrape}), but the system failed to scrape its content. Please ask the user to provide text directly or check the URL.]`;
      }
    }

    // Find the agent
    const agent = AI_AGENTS.find((a) => a.id === agentId);
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const response = await executeWithFallback(
      agent,
      enrichedMessage,
      enrichedHistory,
      user.id,
    );

    return NextResponse.json(response);
  } catch (error) {
    const authUser = await requireAuth(request).catch(() => null);
    const userId = authUser?.id || "unknown";
    logModelUsage({
      user_id: userId,
      agent_id: "error-handler",
      provider: "system",
      model: "error",
      prompt_tokens: 0,
      completion_tokens: 0,
      cost_usd: 0,
      latency_ms: Date.now() - startTime,
      status: "failed",
      error_message: error instanceof Error ? error.message : String(error),
    });
    return handleApiError(error);
  }
}

// Helper function to calculate Google model timeout
function getGoogleModelTimeout(modelName: string): number {
  if (modelName.toLowerCase().includes('flash')) {
    return 20000; // 20s for Flash models
  } else if (modelName.toLowerCase().includes('pro')) {
    return 40000; // 40s for Pro models
  }
  return 30000; // 30s default
}

export async function handleGoogleProvider(
  agent: AIAgent,
  message: string,
  conversationHistory: AIMessage[],
  systemPrompt: string,
) {
  const functionStartTime = Date.now();
  console.log('[Google Provider] Starting request - Provider: Google, API key configured:', !!(process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY));

  try {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      console.error('[Google Provider] Missing API key. Checked: GOOGLE_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY');
      throw new Error("GOOGLE_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY is not defined");
    }

    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);

    const modelNames = [
      agent.model,
      "gemini-2.5-flash",
      "gemini-2.5-pro",
      "gemini-2.0-flash",
    ];

    let lastError;

    for (const modelName of modelNames) {
      const attemptStartTime = Date.now();
      try {
        console.log(`[Google Provider] Attempting model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });

        // Build segments for generateContent
        const contents = (conversationHistory || []).map((msg: any) => ({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        }));

        // Google Generative AI requires the first message to be from 'user'
        while (contents.length > 0 && contents[0].role === 'model') {
          contents.shift();
        }

        // Add the current system prompt + message
        const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${message}` : message;
        contents.push({
          role: "user",
          parts: [{ text: fullPrompt }]
        });

        // Add timeout protection for Google API calls with model-specific timeouts
        const timeoutMs = getGoogleModelTimeout(modelName);
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Google API timeout after ${timeoutMs}ms`)), timeoutMs)
        );

        const result = await Promise.race([
          model.generateContent({
            contents,
            generationConfig: { maxOutputTokens: 2048 },
          }),
          timeoutPromise
        ]);

        const response = result.response;
        const responseText = response.text();

        if (!responseText) throw new Error("Empty response text");

        const attemptDuration = Date.now() - attemptStartTime;
        console.log(`[Google Provider] Model ${modelName} succeeded after ${attemptDuration}ms: ${responseText.length} chars`);

        return {
          response: responseText,
          tokensUsed: 0,
          modelUsed: modelName
        };
      } catch (error) {
        const attemptDuration = Date.now() - attemptStartTime;
        lastError = error;

        // Determine error type and check for expired API key
        let errorType = 'unknown';
        let errorMessage = error instanceof Error ? error.message : String(error);
        const lowerError = errorMessage.toLowerCase();

        // Check for expired API key first (priority check)
        if (lowerError.includes('expired') || lowerError.includes('api_key_invalid') || lowerError.includes('renew')) {
          errorType = 'api_key_expired';
          console.warn(`[Google Provider] Model ${modelName} failed after ${attemptDuration}ms: ${errorType} - API key expired`);
          throw new APIKeyExpiredError('Google', 'https://makersuite.google.com/app/apikey', 'GOOGLE_API_KEY');
        } else if (errorMessage.includes('timeout') || errorMessage.includes('TimeoutError')) {
          errorType = 'timeout';
        } else if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
          errorType = 'rate_limit';
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
          errorType = 'network_error';
        } else if (errorMessage.includes('API key') || errorMessage.includes('authentication')) {
          errorType = 'auth_error';
        } else if (errorMessage.includes('model') && errorMessage.includes('not found')) {
          errorType = 'model_not_found';
        } else {
          errorType = 'api_error';
        }

        console.warn(`[Google Provider] Model ${modelName} failed after ${attemptDuration}ms: ${errorType} - ${errorMessage}`);
        
        // Update lastError with enhanced message for expired keys
        if (errorType === 'api_key_expired') {
          lastError = new Error(errorMessage);
        }
        
        continue;
      }
    }

    const totalDuration = Date.now() - functionStartTime;
    throw new Error(`Google AI failed after trying all models (${totalDuration}ms). Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
  } catch (error) {
    const totalDuration = Date.now() - functionStartTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Determine error type for final error
    let errorType = 'unknown';
    if (errorMessage.includes('timeout') || errorMessage.includes('TimeoutError')) {
      errorType = 'timeout';
    } else if (errorMessage.includes('API key') || errorMessage.includes('authentication')) {
      errorType = 'auth_error';
    } else {
      errorType = 'api_error';
    }

    console.error(`[Google Provider] Provider failed after ${totalDuration}ms: ${errorType} - ${errorMessage}`);
    throw error;
  }
}

export async function handleOpenRouter(
  agent: AIAgent,
  message: string,
  conversationHistory: AIMessage[],
  systemPrompt: string
) {
  const OPENROUTER_TIMEOUT_MS = 30000;
  const functionStartTime = Date.now();
  console.log(`[OpenRouter Provider] Starting request with model: ${agent.model}`);

  const apiKey = process.env.OPENROUTER_API_KEY;
  console.log(`[OpenRouter Provider] API key configured: ${!!apiKey}`);
  if (!apiKey) {
    console.error('[OpenRouter Provider] OPENROUTER_API_KEY not found in environment');
    throw new Error("OPENROUTER_API_KEY is not defined");
  }

  // Validate model name format for OpenRouter
  if (!agent.model.includes('/')) {
    console.error(`[OpenRouter Provider] Invalid model format: ${agent.model}. Expected format: provider/model-name`);
    throw new Error(`Invalid OpenRouter model format: ${agent.model}`);
  }

  const messages = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: message },
  ];

  console.log(`[OpenRouter Provider] Request details: model=${agent.model}, messageCount=${messages.length}, timeout=${OPENROUTER_TIMEOUT_MS}ms`);

  const requestStartTime = Date.now();
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://agentsflowai.cloud",
        "X-Title": "AgentsFlowAI",
      },
      body: JSON.stringify({
        model: agent.model,
        messages,
      }),
      signal: AbortSignal.timeout(OPENROUTER_TIMEOUT_MS),
    });

    if (!response.ok) {
      const requestDuration = Date.now() - requestStartTime;
      
      // Parse error response to check for expiration
      const errorInfo = await parseProviderError(response.clone());
      
      // Parse specific OpenRouter error codes
      let errorType = 'unknown';
      let errorDetails = errorInfo.message;

      // Check for expired API key first
      if (errorInfo.isExpired || (response.status === 401 && errorInfo.message.toLowerCase().includes('expired'))) {
        console.error(`[OpenRouter Provider] Model ${agent.model} failed (${response.status}) after ${requestDuration}ms: api_key_expired - API key expired`);
        throw new APIKeyExpiredError('OpenRouter', 'https://openrouter.ai/keys', 'OPENROUTER_API_KEY');
      } else if (response.status === 401) {
        errorType = 'auth_error';
        errorDetails = 'Authentication failed - invalid API key';
      } else if (response.status === 403) {
        errorType = 'auth_error';
        errorDetails = 'Forbidden - API key lacks permissions';
      } else if (response.status === 429) {
        errorType = 'rate_limit';
        errorDetails = 'Rate limit exceeded - too many requests';
      } else if (response.status === 402) {
        errorType = 'rate_limit';
        errorDetails = 'Insufficient credits/quota exceeded';
      } else if (response.status === 404) {
        errorType = 'model_not_found';
        errorDetails = `Model ${agent.model} not found or not available`;
      } else if (response.status >= 500) {
        errorType = 'api_error';
        errorDetails = `OpenRouter server error: ${response.status}`;
      } else if (response.status === 400 && errorDetails.includes('model')) {
        errorType = 'model_not_found';
        errorDetails = `Model ${agent.model} is invalid or not available on your plan. Check OpenRouter's model list.`;
      }

      console.error(`[OpenRouter Provider] Model ${agent.model} failed (${response.status}) after ${requestDuration}ms: ${errorType} - ${errorDetails}`);
      throw new Error(`OpenRouter API error (${response.status}): ${errorDetails}`);
    }

    const data = await response.json();
    const requestDuration = Date.now() - requestStartTime;
    const totalDuration = Date.now() - functionStartTime;

    console.log(`[OpenRouter Provider] Model ${agent.model} succeeded after ${totalDuration}ms: ${data.usage?.total_tokens || 0} tokens used`);

    return {
      response: data.choices[0]?.message?.content || "",
      tokensUsed: data.usage?.total_tokens || 0,
    };
  } catch (error) {
    const requestDuration = Date.now() - requestStartTime;

    // Classify AbortError/timeout and network failures
    let errorType = 'unknown';
    let errorMessage = error instanceof Error ? error.message : String(error);

    if (error instanceof Error && error.name === 'AbortError') {
      errorType = 'timeout';
      errorMessage = `Request aborted due to timeout after ${OPENROUTER_TIMEOUT_MS}ms for model ${agent.model}`;
    } else if (errorMessage.includes('timeout') || errorMessage.includes('TimeoutError')) {
      errorType = 'timeout';
    } else if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ENOTFOUND')) {
      errorType = 'network_error';
    }

    console.error(`[OpenRouter Provider] Model ${agent.model} failed after ${requestDuration}ms: ${errorType} - ${errorMessage}`);
    throw error;
  }
}

export async function handleOpenAIProvider(
  agent: AIAgent,
  message: string,
  conversationHistory: AIMessage[],
  systemPrompt: string,
) {
  const functionStartTime = Date.now();
  console.log(`[OpenAI Provider] Starting request with model: ${agent.model}`);

  const apiKey = process.env.OPENAI_API_KEY;
  console.log(`[OpenAI Provider] API key configured: ${!!apiKey}`);
  if (!apiKey) {
    console.error('[OpenAI Provider] OPENAI_API_KEY not found in environment');
    throw new Error("OPENAI_API_KEY is not defined");
  }

  // Validate supported models
  const supportedModels = ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'];
  if (!supportedModels.includes(agent.model.toLowerCase())) {
    console.error(`[OpenAI Provider] Unsupported model: ${agent.model}. Supported: ${supportedModels.join(', ')}`);
    throw new Error(`Unsupported OpenAI model: ${agent.model}. Supported models: ${supportedModels.join(', ')}`);
  }

  // Set timeout: 60s for GPT-4 models, 30s for others
  const isGPT4Model = agent.model.toLowerCase().startsWith('gpt-4');
  const timeoutMs = isGPT4Model ? 60000 : 30000;

  // Import OpenAI SDK
  const { OpenAI } = await import('openai');
  const openai = new OpenAI({ apiKey });

  // Map conversation history to OpenAI message format
  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...conversationHistory.map((msg) => ({
      role: msg.role as "user" | "assistant" | "system",
      content: msg.content,
    })),
    { role: "user" as const, content: message },
  ];

  console.log(`[OpenAI Provider] Request details: model=${agent.model}, messageCount=${messages.length}, timeout=${timeoutMs}ms`);

  const requestStartTime = Date.now();
  try {
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const completion = await openai.chat.completions.create({
      model: agent.model,
      messages,
      max_tokens: 2048, // Consistent with other providers
    }, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const requestDuration = Date.now() - requestStartTime;
    const totalDuration = Date.now() - functionStartTime;

    const responseText = completion.choices[0]?.message?.content || "";
    const usage = completion.usage;

    if (!usage) {
      console.warn(`[OpenAI Provider] No usage data returned for model ${agent.model}`);
    }

    const promptTokens = usage?.prompt_tokens || 0;
    const completionTokens = usage?.completion_tokens || 0;
    const totalTokens = usage?.total_tokens || 0;
    const cost = calculateOpenAICost(agent.model, promptTokens, completionTokens);

    console.log(`[OpenAI Provider] Model ${agent.model} succeeded after ${totalDuration}ms: ${totalTokens} tokens (${promptTokens} prompt + ${completionTokens} completion), cost $${cost.toFixed(6)}`);

    return {
      response: responseText,
      tokensUsed: totalTokens,
      cost,
      promptTokens,
      completionTokens,
    };
  } catch (error) {
    const requestDuration = Date.now() - requestStartTime;
    const totalDuration = Date.now() - functionStartTime;

    // Handle AbortError/timeout
    if (error instanceof Error && error.name === 'AbortError') {
      const errorMessage = `Request aborted due to timeout after ${timeoutMs}ms`;
      console.error(`[OpenAI Provider] Model ${agent.model} failed after ${totalDuration}ms: timeout - ${errorMessage}`);
      throw new Error(errorMessage);
    }

    // Handle OpenAI API errors
    if (error instanceof Error && 'status' in error) {
      const apiError = error as any;
      const status = apiError.status;
      const errorData = apiError.error || {};
      const errorMessage = errorData.message || apiError.message || 'Unknown API error';

      // Check for expired API key first
      if (errorMessage.toLowerCase().includes('expired') ||
          errorMessage.toLowerCase().includes('api_key_invalid') ||
          (status === 401 && errorMessage.toLowerCase().includes('invalid'))) {
        console.error(`[OpenAI Provider] Model ${agent.model} failed (${status}) after ${requestDuration}ms: api_key_expired - API key expired`);
        throw new APIKeyExpiredError('OpenAI', 'https://platform.openai.com/api-keys', 'OPENAI_API_KEY');
      }

      // Classify other errors
      let errorType = 'unknown';
      if (status === 401) {
        errorType = 'auth_error';
      } else if (status === 403) {
        errorType = 'auth_error';
      } else if (status === 429) {
        errorType = 'rate_limit';
      } else if (status === 404) {
        errorType = 'model_not_found';
      } else if (status >= 500) {
        errorType = 'api_error';
      } else if (status === 400 && errorMessage.toLowerCase().includes('model')) {
        errorType = 'model_not_found';
      } else if (errorMessage.toLowerCase().includes('timeout') || errorMessage.toLowerCase().includes('timeouterror')) {
        errorType = 'timeout';
      } else if (errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('fetch')) {
        errorType = 'network_error';
      }

      console.error(`[OpenAI Provider] Model ${agent.model} failed (${status}) after ${requestDuration}ms: ${errorType} - ${errorMessage}`);
      throw new Error(`OpenAI API error (${status}): ${errorMessage}`);
    }

    // Handle network or other errors
    let errorType = 'unknown';
    let errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.toLowerCase().includes('timeout') || errorMessage.toLowerCase().includes('timeouterror')) {
      errorType = 'timeout';
    } else if (errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('fetch') || errorMessage.toLowerCase().includes('econnrefused')) {
      errorType = 'network_error';
    }

    console.error(`[OpenAI Provider] Model ${agent.model} failed after ${requestDuration}ms: ${errorType} - ${errorMessage}`);
    throw error;
  }
}

export async function handleOllamaProvider(agent: AIAgent, messages: AIMessage[]) {
  const functionStartTime = Date.now();
  const OLLAMA_BASE_URL =
    process.env.OLLAMA_BASE_URL || "http://localhost:11434";

  console.log(`[Ollama Provider] Attempting model: ${agent.model} at ${OLLAMA_BASE_URL}`);

  // Pre-flight checks
  console.log(`[Ollama Provider] Running pre-flight checks for model: ${agent.model}`);

  // 1. Check if Ollama service is running
  const healthCheck = await checkOllamaHealth();
  if (!healthCheck.available) {
    const errorMessage = `Ollama service not running at ${OLLAMA_BASE_URL}. Start with: ollama serve`;
    console.error(`[Ollama Provider] Pre-flight failed: ${errorMessage}`);
    throw new Error(errorMessage);
  }

  // 2. Check if model is available
  const modelAvailable = await isModelAvailable(agent.model);
  if (!modelAvailable) {
    const availableModelsResponse = await getAvailableOllamaModels();
    const availableModels = availableModelsResponse.models;
    const errorMessage = `Model '${agent.model}' not pulled. Run: ollama pull ${agent.model}. Available models: ${availableModels.join(', ') || 'none'}`;
    console.error(`[Ollama Provider] Pre-flight failed: ${errorMessage}`);
    throw new Error(errorMessage);
  }

  const isFirstLoadAttempt = isFirstLoad(agent.model);
  
  console.log(`[Ollama Provider] Pre-flight check passed: model=${agent.model}, size=${agent.ollamaModelSize || 'unknown'}, firstLoad=${isFirstLoadAttempt}`);

  const requestPayload = {
    model: agent.model,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
    stream: false,
    options: { temperature: 0.7, top_p: 0.9, num_predict: 2048 },
  };
  console.log(`[Ollama Provider] Request payload: model=${requestPayload.model}, messageCount=${requestPayload.messages.length}`);

  try {
    // Use the queue for request management
    const queueResult = await queueOllamaRequest(
      agent.model,
      requestPayload,
      agent.id,
      agent.ollamaModelSize
    );

    // Await the actual result from the queued promise
    const data = await queueResult.result;

    const totalDuration = Date.now() - functionStartTime;
    const responseLength = (data.message?.content || data.response || '').length;
    const waitTimeMs = queueResult.metadata.isDedupHit ? 0 : (Date.now() - queueResult.metadata.enqueueTime);

    console.log(`[Ollama Provider] Model ${agent.model} (size: ${agent.ollamaModelSize || 'unknown'}) succeeded after ${totalDuration}ms: ${responseLength} chars, ${data.eval_count || 0} tokens, queueWait=${waitTimeMs}ms, dedupHit=${queueResult.metadata.isDedupHit}`);

    // Log usage with queue metadata
    await logModelUsage({
      user_id: "ollama-queue",
      agent_id: agent.id,
      provider: "ollama",
      model: agent.model,
      prompt_tokens: 0,
      completion_tokens: data.eval_count || 0,
      cost_usd: 0,
      latency_ms: totalDuration,
      status: "success",
      error_message: undefined,
    });

    return {
      response: data.message?.content || data.response,
      tokensUsed: data.eval_count || 0,
      queueMetadata: queueResult.metadata,
    };
  } catch (error) {
    const totalDuration = Date.now() - functionStartTime;
    const errorInstance = error instanceof Error ? error : new Error(String(error));

    let errorType = 'unknown';
    let errorMessage = errorInstance.message;

    // Check for rate limit errors from queue
    if (errorMessage.includes('Rate limit exceeded')) {
      errorType = 'rate_limit';
      console.error(`[Ollama Provider] Model ${agent.model} failed: ${errorType} - ${errorMessage}`);
    } else if (errorInstance.name === 'AbortError' || errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
      errorType = 'timeout';
      const firstLoadMsg = isFirstLoadAttempt ? 'first load' : 'subsequent load';
      errorMessage = `Request timed out (model: ${agent.model}, size: ${agent.ollamaModelSize || 'unknown'}, ${firstLoadMsg}). Model may be loading for first time.`;
      console.error(`[Ollama Provider] Model ${agent.model} failed: ${errorType} - ${errorMessage}`);
    } else if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('Connection refused') || errorMessage.includes('Queue cleared')) {
      errorType = 'network_error';
      console.error(`[Ollama Provider] Model ${agent.model} failed: ${errorType} - ${errorMessage}`);
    } else if (errorMessage.includes('model') && (errorMessage.includes('not found') || errorMessage.includes('not pulled'))) {
      errorType = 'model_not_found';
      console.error(`[Ollama Provider] Model ${agent.model} failed: ${errorType} - ${errorMessage}`);
    } else {
      errorType = 'api_error';
      console.error(`[Ollama Provider] Model ${agent.model} failed: ${errorType} - ${errorMessage}`);
    }

    throw errorInstance;
  }
}

// Helper function to classify error type from error message
function classifyErrorType(errorMessage: string): 'timeout' | 'api_error' | 'network_error' | 'auth_error' | 'rate_limit' | 'model_not_found' | 'api_key_expired' | 'unknown' {
  const lowerError = errorMessage.toLowerCase();
  
  // Priority check for expired key detection before generic auth error
  if (lowerError.includes('expired') || lowerError.includes('renew') || lowerError.includes('api_key_invalid')) {
    return 'api_key_expired';
  } else if (lowerError.includes('timeout') || lowerError.includes('timeouterror') || lowerError.includes('aborted')) {
    return 'timeout';
  } else if (lowerError.includes('rate limit') || lowerError.includes('quota') || lowerError.includes('too many requests')) {
    return 'rate_limit';
  } else if (lowerError.includes('api key') || lowerError.includes('authentication') || lowerError.includes('unauthorized') || lowerError.includes('forbidden')) {
    return 'auth_error';
  } else if (lowerError.includes('model') && (lowerError.includes('not found') || lowerError.includes('not available'))) {
    return 'model_not_found';
  } else if (lowerError.includes('network') || lowerError.includes('fetch') || lowerError.includes('econnrefused') || lowerError.includes('connection refused')) {
    return 'network_error';
  } else if (lowerError.includes('api error') || lowerError.includes('server error')) {
    return 'api_error';
  }
  
  return 'unknown';
}

async function executeWithFallback(
  agent: AIAgent,
  message: string,
  conversationHistory: AIMessage[],
  userId: string,
) {
  const providers = agent.supportedProviders.sort(
    (a, b) => a.priority - b.priority,
  );
  let lastError: Error | null = null;
  const startTime = Date.now();

  const errorLog: Array<{provider: string, model: string, error: string, duration: number, timestamp: Date}> = [];

  const messages: AIMessage[] = [
    ...conversationHistory,
    {
      role: "user",
      content: message,
      agentId: agent.id,
      id: conversationHistory.length.toString(),
      timestamp: new Date(),
    },
  ];

  // Check Redis cache for ALL providers in priority order before invoking any
  // This allows fallback providers to reuse cached responses from higher-priority providers
  for (const providerConfig of providers) {
    const { provider, model } = providerConfig;
    const cacheKey = generateCacheKey(provider, model, messages);
    const cachedResponse = await getCachedAIResponse(cacheKey);
    
    if (cachedResponse) {
      console.log(`[Redis Cache] Cache HIT for ${provider}/${model}`);
      return {
        response: cachedResponse.response,
        model: cachedResponse.model,
        agentId: agent.id,
        agentName: agent.name,
        tokensUsed: cachedResponse.tokensUsed || 0,
        generationTime: 0,
        fallbackUsed: provider !== agent.defaultProvider,
        usedProvider: cachedResponse.provider,
        cached: true,
        timestamp: cachedResponse.timestamp,
      };
    }
  }

  for (const providerConfig of providers) {
    const { provider, model } = providerConfig;
    const providerAttemptStartTime = Date.now();

    try {
      let result;
      const systemPrompt = agent.systemPrompt;

      if (provider === "google") {
        result = await handleGoogleProvider(
          { ...agent, model },
          message,
          conversationHistory,
          systemPrompt,
        );
      } else if (provider === "ollama") {
        result = await handleOllamaProvider({ ...agent, model }, messages);
      } else if (provider === "openrouter") {
        result = await handleOpenRouter(
          { ...agent, model },
          message,
          conversationHistory,
          systemPrompt,
        );
      } else if (provider === "openai") {
        result = await handleOpenAIProvider(
          { ...agent, model },
          message,
          conversationHistory,
          systemPrompt,
        );
      } else {
        continue;
      }

      const latency = Date.now() - startTime;

      // Extract usage data based on provider
      const promptTokens = provider === 'openai' ? (result as any).promptTokens || 0 : 0;
      const completionTokens = provider === 'openai' ? (result as any).completionTokens || 0 : result.tokensUsed || 0;
      const cost = provider === 'openai' ? (result as any).cost || 0 : 0;

      await logModelUsage({
        user_id: userId,
        agent_id: agent.id,
        provider,
        model,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        cost_usd: cost,
        latency_ms: latency,
        status: "success",
      });

      // Include errorLog if there were prior failures before fallback succeeded
      const responsePayload: AIAgentResponse = {
        response: result.response,
        model,
        agentId: agent.id,
        agentName: agent.name,
        tokensUsed: result.tokensUsed,
        generationTime: latency,
        fallbackUsed: provider !== agent.defaultProvider,
        usedProvider: provider,
      };

      // Add errorLog to successful response if fallback was used and there were prior failures
      if (errorLog.length > 0 && provider !== agent.defaultProvider) {
        responsePayload.errorLog = errorLog.map(entry => ({
          provider: entry.provider,
          model: entry.model,
          error: entry.error,
          errorType: classifyErrorType(entry.error),
          duration: entry.duration,
          timestamp: entry.timestamp,
        }));
      }

      // Cache the successful response using the provider and model that succeeded
      const cacheKey = generateCacheKey(provider, model, messages);
      await setCachedAIResponse(cacheKey, {
        response: result.response,
        provider,
        model,
        tokensUsed: result.tokensUsed,
        timestamp: new Date().toISOString(),
      });

      return responsePayload;
    } catch (error) {
      const providerDuration = Date.now() - providerAttemptStartTime;
      lastError = error instanceof Error ? error : new Error(String(error));

      // Add to error log
      errorLog.push({
        provider,
        model,
        error: lastError.message,
        duration: providerDuration,
        timestamp: new Date()
      });

      const nextProvider = providers[providers.indexOf(providerConfig) + 1]?.provider || 'none';
      console.warn(`[Fallback Chain] Provider ${provider} (${model}) failed after ${providerDuration}ms: ${lastError.message}. Trying next provider (${nextProvider})`);

      await logModelUsage({
        user_id: userId,
        agent_id: agent.id,
        provider,
        model,
        prompt_tokens: 0,
        completion_tokens: 0,
        cost_usd: 0,
        latency_ms: Date.now() - startTime,
        status: "failed",
        error_message: lastError.message,
      });
    }
  }

  // If all providers fail, use static fallback
  const latency = Date.now() - startTime;

  console.error(`[Fallback Chain] All providers exhausted. Total attempts: ${errorLog.length}, Total time: ${latency}ms`);
  console.error(`[Fallback Chain] Error details:`, JSON.stringify(errorLog, null, 2));

  // Log critical system activity for admin notification
  await logActivity({
    userId: userId,
    type: "PROVIDER_ALL_FAILED",
    description: `All AI providers failed for agent ${agent.id}`,
    metadata: {
      agentId: agent.id,
      errorLog: errorLog.map(e => ({ provider: e.provider, error: e.error })),
      latency,
    },
    resourceType: "ai_agent",
    resourceId: agent.id,
  });

  await logModelUsage({
    user_id: userId,
    agent_id: agent.id,
    provider: "fallback",
    model: "static",
    prompt_tokens: 0,
    completion_tokens: 0,
    cost_usd: 0,
    latency_ms: latency,
    status: "fallback",
    error_message: lastError?.message || "All providers failed",
  });

  const primaryError = errorLog.length > 0 ? errorLog[0].error : (lastError?.message || "Unknown error");
  
  // Create structured error details for each provider failure
  const errorDetails = errorLog.map(entry => createFallbackErrorDetail(entry));
  
  // Build retry guidance summary from all errors
  const retryableErrors = errorDetails.filter(d => d.retryGuidance?.shouldRetry);
  let retryGuidanceSummary = '';
  if (retryableErrors.length > 0) {
    const initialWait = Math.max(...retryableErrors.map(d => d.retryGuidance!.initialWaitMs));
    const maxRetries = Math.max(...retryableErrors.map(d => d.retryGuidance!.maxRetries));
    retryGuidanceSummary = `\n\n**Retry Guidance:** Wait ${Math.round(initialWait/1000)}s before retrying, with exponential backoff. Maximum ${maxRetries} retries recommended.`;
  }
  
  return {
    response: generateFallbackResponse(agent.id, message, errorLog, retryGuidanceSummary),
    model: "fallback",
    agentId: agent.id,
    agentName: agent.name,
    note: `All ${errorLog.length} AI providers failed after ${latency}ms. Primary error: ${primaryError}`,
    errorLog: errorLog.map(entry => ({
      provider: entry.provider,
      model: entry.model,
      error: entry.error,
      errorType: classifyErrorType(entry.error),
      duration: entry.duration,
      timestamp: entry.timestamp,
    })),
    errorDetails, // Include structured error details with suggestedAction, documentationUrl, and retryGuidance
    healthCheckUrl: '/api/ai/health-check', // Include health check endpoint URL
    documentationUrl: 'https://docs.agentsflowai.cloud/troubleshooting', // Include main documentation URL
  };
}

function generateFallbackResponse(agentId: string, message: string, errorLog?: Array<{provider: string, model: string, error: string, duration: number, timestamp: Date}>, retryGuidanceSummary?: string): string {
  const lowercaseMessage = message.toLowerCase();

  // Generate diagnostic information from error log
  let diagnosticSection = '';
  let troubleshootingSteps = [];
  
  const configLink = `\n\n⚙️ **Configure API Keys**`;

  if (errorLog && errorLog.length > 0) {
    diagnosticSection = `\n\n## Diagnostic Information\n\n**Agent ID:** ${agentId}\n**Timestamp:** ${new Date().toISOString()}\n**Total Attempts:** ${errorLog.length}\n\n### Provider Errors:\n`;

    errorLog.forEach((entry, index) => {
      const duration = Math.round(entry.duration);
      diagnosticSection += `\n${index + 1}. **${entry.provider.toUpperCase()}** (${entry.model}) - ${duration}ms\n`;
      diagnosticSection += `   Error: ${entry.error}\n`;

      // Generate troubleshooting suggestions based on error type
      const errorType = classifyErrorType(entry.error);
      
      if (errorType === 'api_key_expired') {
        const providerUpper = entry.provider.toUpperCase();
        const renewalUrls = {
          google: 'https://makersuite.google.com/app/apikey',
          openrouter: 'https://openrouter.ai/keys',
          anthropic: 'https://console.anthropic.com/settings/keys'
        };
        const renewalUrl = renewalUrls[entry.provider as keyof typeof renewalUrls] || 'your provider dashboard';
        troubleshootingSteps.push(`🔑 **${providerUpper} API Key Expired**: Renew at ${renewalUrl} → Update \`${providerUpper}_API_KEY\` in your \`.env\` file → Restart application`);
      } else if (entry.error.includes('API key') || entry.error.includes('authentication') || entry.error.includes('auth_error')) {
        troubleshootingSteps.push(`🔑 **${entry.provider.toUpperCase()} API Key**: Check that \`${entry.provider.toUpperCase()}_API_KEY\` is set in your environment variables`);
      } else if (entry.error.includes('timeout')) {
        troubleshootingSteps.push(`⏱️ **${entry.provider.toUpperCase()} Timeout**: The ${entry.provider} service took too long to respond. Try again later or check service status`);
      } else if (entry.error.includes('rate limit') || entry.error.includes('quota')) {
        troubleshootingSteps.push(`🚦 **${entry.provider.toUpperCase()} Rate Limit**: You've exceeded the API quota. Wait before retrying or upgrade your plan`);
      } else if (entry.error.includes('Connection refused') || entry.error.includes('ECONNREFUSED')) {
        if (entry.provider === 'ollama') {
          troubleshootingSteps.push(`🔌 **Ollama Connection**: Ensure Ollama is running with \`ollama serve\` and accessible at the configured URL`);
        } else {
          troubleshootingSteps.push(`🌐 **Network Issue**: Check your internet connection and firewall settings`);
        }
      } else if (entry.error.includes('model not found')) {
        if (entry.provider === 'ollama') {
          troubleshootingSteps.push(`📦 **Ollama Model**: Pull the model with \`ollama pull ${entry.model}\` or list available models with \`ollama list\``);
        } else {
          troubleshootingSteps.push(`🔍 **Model Availability**: The requested model may not be available. Try a different model`);
        }
      }
    });

    if (troubleshootingSteps.length > 0) {
      diagnosticSection += `\n### Next Steps:\n`;
      troubleshootingSteps.forEach(step => {
        diagnosticSection += `\n- ${step}`;
      });
    }
  }

  // Append retry guidance if provided
  const retrySection = retryGuidanceSummary ? `\n${retryGuidanceSummary}` : '';

  switch (agentId) {
    case "web-dev-agent":
      if (
        lowercaseMessage.includes("react") ||
        lowercaseMessage.includes("component")
      ) {
        return `# Web Development Insight (Fallback Mode)

The AI providers are currently unavailable. Here's a basic component structure while we resolve the connectivity issues:

\`\`\`tsx
export function Component() {
  return (
    <div className="p-4 bg-muted rounded-lg border">
      <h3 className="font-semibold mb-2">Component Structure</h3>
      <p className="text-sm text-muted-foreground">
        Basic layout for ${message.includes('button') ? 'a button' : 'a component'}
      </p>
    </div>
  );
}
\`\`\`
${diagnosticSection}

**Quick Recovery:**
1. Check API keys in your \`.env\` file
2. Ensure Ollama is running if using local models
3. Try again in a few moments for rate-limited services${retrySection}${configLink}`;
      }
      return `I'm currently in **Fallback Mode** due to AI provider connectivity issues.

**Basic Web Development Guidance:**
- Focus on semantic HTML structure
- Use responsive CSS frameworks
- Implement progressive enhancement
- Test accessibility compliance

${diagnosticSection}

**Recovery Steps:**
1. Verify API keys are configured
2. Check Ollama service status
3. Wait for rate limits to reset
4. Refresh and try again${retrySection}${configLink}`;

    case "analytics-agent":
      return `# Analytics Insights (Fallback Mode)

AI providers are currently unreachable. Here's fundamental analytics guidance:

**Core Analytics Framework:**
1. **Data Collection**: Implement robust event tracking
2. **KPIs**: Define measurable business metrics
3. **Analysis**: Look for patterns and anomalies
4. **Reporting**: Create actionable dashboards

**Key Metrics to Track:**
- Conversion rates and funnel analysis
- User engagement and retention
- Revenue per user and lifetime value
- Channel performance and attribution

${diagnosticSection}

**Restoration Steps:**
1. Check API key configuration
2. Verify network connectivity
3. Wait for service availability
4. Retry the analysis request${retrySection}${configLink}`;

    default:
      return `# AI Capability Unavailable

All AI providers are currently inaccessible. The system is running in offline fallback mode.

**Current Capabilities:**
- Basic text processing and formatting
- Static response generation
- Error diagnostics and logging

${diagnosticSection}

**System Recovery:**
- **API Keys**: Verify all provider API keys are configured
- **Local Services**: Ensure Ollama is running for local inference
- **Network**: Check internet connectivity for cloud providers
- **Rate Limits**: Wait for quota resets on limited services
- **Support**: Contact system administrator if issues persist

**Request ID:** ${Date.now()}-${agentId}-${errorLog?.length || 0}${retrySection}${configLink}`;
  }
}
