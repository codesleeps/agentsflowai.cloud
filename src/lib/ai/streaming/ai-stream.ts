/**
 * AI Streaming Service
 * Handles streaming AI responses via Server-Sent Events (SSE)
 * Provides real-time token-by-token delivery for better UX
 */

import { getProviderKey } from "@/lib/provider-config";
import type { AIProvider } from "@/lib/provider-config";

export interface StreamOptions {
  provider: AIProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface StreamChunk {
  type: "token" | "error" | "done";
  content?: string;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Stream response from OpenAI
 */
async function* streamOpenAI(
  messages: Array<{ role: string; content: string }>,
  options: StreamOptions
): AsyncGenerator<StreamChunk> {
  const apiKey = getProviderKey("openai");
  if (!apiKey) {
    yield { type: "error", error: "OpenAI API key not configured" };
    return;
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: options.model || "gpt-4o-mini",
      messages: options.systemPrompt
        ? [{ role: "system", content: options.systemPrompt }, ...messages]
        : messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
      stream: true,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    yield { type: "error", error: `OpenAI API error: ${error}` };
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    yield { type: "error", error: "No response body" };
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") {
            yield { type: "done" };
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              yield { type: "token", content };
            }
          } catch {
            // Ignore parse errors for incomplete chunks
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  yield { type: "done" };
}

/**
 * Stream response from Anthropic
 */
async function* streamAnthropic(
  messages: Array<{ role: string; content: string }>,
  options: StreamOptions
): AsyncGenerator<StreamChunk> {
  const apiKey = getProviderKey("anthropic");
  if (!apiKey) {
    yield { type: "error", error: "Anthropic API key not configured" };
    return;
  }

  // Convert messages to Anthropic format
  const systemMessage = options.systemPrompt;
  const userMessages = messages.filter((m) => m.role !== "system");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: options.model || "claude-3-5-sonnet-20241022",
      messages: userMessages,
      system: systemMessage,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
      stream: true,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    yield { type: "error", error: `Anthropic API error: ${error}` };
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    yield { type: "error", error: "No response body" };
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);

          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "content_block_delta") {
              const content = parsed.delta?.text;
              if (content) {
                yield { type: "token", content };
              }
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  yield { type: "done" };
}

/**
 * Stream response from DeepSeek
 */
async function* streamDeepSeek(
  messages: Array<{ role: string; content: string }>,
  options: StreamOptions
): AsyncGenerator<StreamChunk> {
  const apiKey = getProviderKey("deepseek");
  if (!apiKey) {
    yield { type: "error", error: "DeepSeek API key not configured" };
    return;
  }

  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: options.model || "deepseek-chat",
      messages: options.systemPrompt
        ? [{ role: "system", content: options.systemPrompt }, ...messages]
        : messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
      stream: true,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    yield { type: "error", error: `DeepSeek API error: ${error}` };
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    yield { type: "error", error: "No response body" };
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") {
            yield { type: "done" };
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              yield { type: "token", content };
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  yield { type: "done" };
}

/**
 * Stream response from OpenRouter
 */
async function* streamOpenRouter(
  messages: Array<{ role: string; content: string }>,
  options: StreamOptions
): AsyncGenerator<StreamChunk> {
  const apiKey = getProviderKey("openrouter");
  if (!apiKey) {
    yield { type: "error", error: "OpenRouter API key not configured" };
    return;
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "AgentsFlowAI",
    },
    body: JSON.stringify({
      model: options.model || "openai/gpt-4o-mini",
      messages: options.systemPrompt
        ? [{ role: "system", content: options.systemPrompt }, ...messages]
        : messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
      stream: true,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    yield { type: "error", error: `OpenRouter API error: ${error}` };
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    yield { type: "error", error: "No response body" };
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") {
            yield { type: "done" };
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              yield { type: "token", content };
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  yield { type: "done" };
}

/**
 * Main streaming function - routes to appropriate provider
 * OpenRouter is prioritized for its model variety and fallback capabilities
 */
export async function* streamAIResponse(
  messages: Array<{ role: string; content: string }>,
  options: StreamOptions
): AsyncGenerator<StreamChunk> {
  switch (options.provider) {
    case "openrouter":
      yield* streamOpenRouter(messages, options);
      break;
    case "openai":
      yield* streamOpenAI(messages, options);
      break;
    case "anthropic":
      yield* streamAnthropic(messages, options);
      break;
    case "deepseek":
      yield* streamDeepSeek(messages, options);
      break;
    default:
      // Fallback to OpenRouter if available, otherwise error
      const openRouterKey = getProviderKey("openrouter");
      if (openRouterKey) {
        yield* streamOpenRouter(messages, { ...options, provider: "openrouter" });
      } else {
        yield { type: "error", error: `Streaming not supported for ${options.provider}` };
      }
  }
}

/**
 * Create a ReadableStream for SSE
 */
export function createAIStream(
  messages: Array<{ role: string; content: string }>,
  options: StreamOptions
): ReadableStream {
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamAIResponse(messages, options)) {
          const data = `data: ${JSON.stringify(chunk)}\n\n`;
          controller.enqueue(new TextEncoder().encode(data));

          if (chunk.type === "done" || chunk.type === "error") {
            controller.close();
            return;
          }
        }
      } catch (error) {
        const errorChunk: StreamChunk = {
          type: "error",
          error: error instanceof Error ? error.message : "Stream error",
        };
        controller.enqueue(
          new TextEncoder().encode(`data: ${JSON.stringify(errorChunk)}\n\n`)
        );
        controller.close();
      }
    },
  });
}
