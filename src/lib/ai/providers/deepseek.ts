/**
 * DeepSeek AI Provider
 * Cost-effective, high-quality AI models from DeepSeek
 * Models: deepseek-chat, deepseek-coder, deepseek-reasoner
 */

import { getProviderKey } from "@/lib/provider-config";

const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";

interface DeepSeekMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface DeepSeekResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface DeepSeekOptions {
  model?: "deepseek-chat" | "deepseek-coder" | "deepseek-reasoner";
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export async function generateWithDeepSeek(
  messages: DeepSeekMessage[],
  options: DeepSeekOptions = {}
): Promise<{
  content: string;
  tokensUsed: number;
  model: string;
}> {
  const apiKey = getProviderKey("deepseek");
  if (!apiKey) {
    throw new Error("DeepSeek API key not configured");
  }

  const {
    model = "deepseek-chat",
    temperature = 0.7,
    maxTokens = 4096,
    systemPrompt,
  } = options;

  const requestBody: Record<string, unknown> = {
    model,
    messages: systemPrompt
      ? [{ role: "system", content: systemPrompt }, ...messages]
      : messages,
    temperature,
    max_tokens: maxTokens,
  };

  const response = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} - ${error}`);
  }

  const data: DeepSeekResponse = await response.json();

  if (!data.choices?.[0]?.message?.content) {
    throw new Error("Invalid response from DeepSeek API");
  }

  return {
    content: data.choices[0].message.content,
    tokensUsed: data.usage?.total_tokens || 0,
    model,
  };
}

export async function generateTextWithDeepSeek(
  prompt: string,
  options: DeepSeekOptions = {}
): Promise<string> {
  const result = await generateWithDeepSeek(
    [{ role: "user", content: prompt }],
    options
  );
  return result.content;
}

// Model pricing (per 1M tokens) - very cost effective
export const DEEPSEEK_PRICING = {
  "deepseek-chat": { input: 0.14, output: 0.28 }, // $0.14/$0.28 per 1M tokens
  "deepseek-coder": { input: 0.14, output: 0.28 },
  "deepseek-reasoner": { input: 0.55, output: 2.19 },
} as const;

export function calculateDeepSeekCost(
  model: keyof typeof DEEPSEEK_PRICING,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = DEEPSEEK_PRICING[model];
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}
