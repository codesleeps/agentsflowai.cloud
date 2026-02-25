/**
 * Google Gemini AI Provider
 * Google's multimodal AI with native image, audio, and video understanding
 * Models: gemini-2.0-flash, gemini-2.0-pro, gemini-1.5-flash, gemini-1.5-pro
 */

import { getProviderKey } from "@/lib/provider-config";

const GOOGLE_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

interface GeminiContent {
  role: "user" | "model";
  parts: Array<{ text: string }>;
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
      role: string;
    };
    finishReason: string;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export interface GeminiOptions {
  model?:
    | "gemini-2.0-flash"
    | "gemini-2.0-pro"
    | "gemini-1.5-flash"
    | "gemini-1.5-pro";
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export async function generateWithGemini(
  contents: GeminiContent[],
  options: GeminiOptions = {}
): Promise<{
  content: string;
  tokensUsed: number;
  model: string;
}> {
  const apiKey = getProviderKey("google");
  if (!apiKey) {
    throw new Error("Google API key not configured");
  }

  const {
    model = "gemini-2.0-flash",
    temperature = 0.7,
    maxTokens = 8192,
    systemPrompt,
  } = options;

  const requestBody: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
    },
  };

  if (systemPrompt) {
    requestBody.systemInstruction = {
      parts: [{ text: systemPrompt }],
    };
  }

  const response = await fetch(
    `${GOOGLE_API_URL}/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Gemini API error: ${response.status} - ${error}`);
  }

  const data: GeminiResponse = await response.json();

  if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new Error("Invalid response from Google Gemini API");
  }

  return {
    content: data.candidates[0].content.parts[0].text,
    tokensUsed: data.usageMetadata?.totalTokenCount || 0,
    model,
  };
}

export async function generateTextWithGemini(
  prompt: string,
  options: GeminiOptions = {}
): Promise<string> {
  const result = await generateWithGemini(
    [{ role: "user", parts: [{ text: prompt }] }],
    options
  );
  return result.content;
}

// Multimodal support - analyze images
export async function analyzeImageWithGemini(
  imageBase64: string,
  prompt: string,
  options: GeminiOptions = {}
): Promise<string> {
  const apiKey = getProviderKey("google");
  if (!apiKey) {
    throw new Error("Google API key not configured");
  }

  const { model = "gemini-2.0-flash" } = options;

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: imageBase64,
            },
          },
        ],
      },
    ],
  };

  const response = await fetch(
    `${GOOGLE_API_URL}/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Vision API error: ${response.status} - ${error}`);
  }

  const data: GeminiResponse = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// Model pricing (per 1M tokens)
export const GEMINI_PRICING = {
  "gemini-2.0-flash": { input: 0.075, output: 0.3 }, // Very cost effective
  "gemini-2.0-pro": { input: 1.25, output: 5.0 },
  "gemini-1.5-flash": { input: 0.075, output: 0.3 },
  "gemini-1.5-pro": { input: 1.25, output: 5.0 },
} as const;

export function calculateGeminiCost(
  model: keyof typeof GEMINI_PRICING,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = GEMINI_PRICING[model];
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}
