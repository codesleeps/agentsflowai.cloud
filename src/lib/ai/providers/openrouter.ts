/**
 * OpenRouter Provider
 * Unified API for accessing 100+ AI models
 * https://openrouter.ai/docs
 */

import { getProviderKey } from "@/lib/provider-config";

interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenRouterOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  // OpenRouter specific
  transforms?: string[]; // ["middle-out"] for context window management
  models?: string[]; // Fallback models
  route?: "fallback" | "store";
}

// Popular models available on OpenRouter
export const OPENROUTER_MODELS = {
  // OpenAI
  "gpt-4o": "openai/gpt-4o",
  "gpt-4o-mini": "openai/gpt-4o-mini",
  "gpt-4-turbo": "openai/gpt-4-turbo",
  
  // Anthropic
  "claude-3.5-sonnet": "anthropic/claude-3.5-sonnet",
  "claude-3-opus": "anthropic/claude-3-opus",
  "claude-3-haiku": "anthropic/claude-3-haiku",
  
  // Google
  "gemini-2.0-flash": "google/gemini-2.0-flash-exp:free",
  "gemini-1.5-pro": "google/gemini-pro-1.5",
  
  // Meta
  "llama-3.1-405b": "meta-llama/llama-3.1-405b-instruct",
  "llama-3.1-70b": "meta-llama/llama-3.1-70b-instruct",
  "llama-3.1-8b": "meta-llama/llama-3.1-8b-instruct",
  
  // Mistral
  "mistral-large": "mistralai/mistral-large",
  "mistral-medium": "mistralai/mistral-medium",
  
  // DeepSeek
  "deepseek-chat": "deepseek/deepseek-chat",
  "deepseek-coder": "deepseek/deepseek-coder",
  
  // Qwen
  "qwen-2.5-72b": "qwen/qwen-2.5-72b-instruct",
  
  // Free/Cheap options
  "llama-3.2-3b-free": "meta-llama/llama-3.2-3b-instruct:free",
  "gemma-2-9b-free": "google/gemma-2-9b-it:free",
} as const;

export type OpenRouterModel = keyof typeof OPENROUTER_MODELS;

/**
 * Generate text using OpenRouter
 * Automatically handles model routing and fallbacks
 */
export async function generateWithOpenRouter(
  messages: OpenRouterMessage[],
  options: OpenRouterOptions = {}
): Promise<{
  content: string;
  tokensUsed: number;
  model: string;
  provider: string;
}> {
  const apiKey = getProviderKey("openrouter");

  if (!apiKey) {
    throw new Error("OpenRouter API key not configured");
  }

  const {
    model = "gpt-4o-mini",
    temperature = 0.7,
    maxTokens = 2000,
    transforms,
    models, // Fallback models
    route = "fallback",
  } = options;

  // Map shorthand model names to full OpenRouter IDs
  const modelId = OPENROUTER_MODELS[model as OpenRouterModel] || model;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "AgentsFlowAI",
    },
    body: JSON.stringify({
      model: modelId,
      messages,
      temperature,
      max_tokens: maxTokens,
      ...(transforms && { transforms }),
      ...(models && { models }),
      ...(route && { route }),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
  }

  const data = await response.json();

  return {
    content: data.choices[0].message.content,
    tokensUsed: data.usage?.total_tokens || 0,
    model: data.model,
    provider: data.provider,
  };
}

/**
 * Stream text generation from OpenRouter
 */
export async function* streamWithOpenRouter(
  messages: OpenRouterMessage[],
  options: OpenRouterOptions = {}
): AsyncGenerator<string> {
  const apiKey = getProviderKey("openrouter");

  if (!apiKey) {
    throw new Error("OpenRouter API key not configured");
  }

  const {
    model = "gpt-4o-mini",
    temperature = 0.7,
    maxTokens = 2000,
  } = options;

  const modelId = OPENROUTER_MODELS[model as OpenRouterModel] || model;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "AgentsFlowAI",
    },
    body: JSON.stringify({
      model: modelId,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") return;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            yield content;
          }
        } catch {
          // Ignore parse errors for malformed chunks
        }
      }
    }
  }
}

/**
 * Get model pricing information from OpenRouter
 */
export async function getModelPricing(): Promise<
  Array<{
    id: string;
    name: string;
    pricing: { prompt: number; completion: number };
    context_length: number;
  }>
> {
  const apiKey = getProviderKey("openrouter");

  if (!apiKey) {
    throw new Error("OpenRouter API key not configured");
  }

  const response = await fetch("https://openrouter.ai/api/v1/models", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.status}`);
  }

  const data = await response.json();
  return data.data;
}

/**
 * Smart model selection based on task type
 */
export function selectModelForTask(task: string): string {
  const taskLower = task.toLowerCase();
  
  // Coding tasks
  if (taskLower.includes("code") || taskLower.includes("programming")) {
    return "deepseek-coder";
  }
  
  // Creative writing
  if (taskLower.includes("creative") || taskLower.includes("story")) {
    return "claude-3.5-sonnet";
  }
  
  // Quick/simple tasks
  if (taskLower.includes("simple") || taskLower.includes("quick")) {
    return "gpt-4o-mini";
  }
  
  // Complex reasoning
  if (taskLower.includes("complex") || taskLower.includes("analysis")) {
    return "claude-3-opus";
  }
  
  // Default
  return "gpt-4o-mini";
}

/**
 * Get available models with their capabilities
 */
export function getAvailableModels(): Array<{
  id: string;
  name: string;
  description: string;
  cost: "free" | "low" | "medium" | "high";
  strengths: string[];
}> {
  return [
    {
      id: "gpt-4o-mini",
      name: "GPT-4o Mini",
      description: "Fast and cost-effective for most tasks",
      cost: "low",
      strengths: ["general", "fast", "cheap"],
    },
    {
      id: "gpt-4o",
      name: "GPT-4o",
      description: "High quality for complex tasks",
      cost: "medium",
      strengths: ["general", "vision", "coding"],
    },
    {
      id: "claude-3.5-sonnet",
      name: "Claude 3.5 Sonnet",
      description: "Excellent for writing and analysis",
      cost: "medium",
      strengths: ["writing", "analysis", "coding"],
    },
    {
      id: "deepseek-chat",
      name: "DeepSeek Chat",
      description: "Very cost-effective alternative",
      cost: "low",
      strengths: ["general", "cheap", "fast"],
    },
    {
      id: "llama-3.1-70b",
      name: "Llama 3.1 70B",
      description: "Open source, great performance",
      cost: "low",
      strengths: ["general", "open-source"],
    },
    {
      id: "gemini-2.0-flash",
      name: "Gemini 2.0 Flash",
      description: "Google's fast multimodal model",
      cost: "free",
      strengths: ["multimodal", "fast", "free"],
    },
  ];
}
