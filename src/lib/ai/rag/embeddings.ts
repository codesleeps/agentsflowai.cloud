/**
 * RAG Embeddings Service
 * Handles text embedding generation using OpenAI or other providers
 */

import { getProviderKey } from "@/lib/provider-config";

const OPENAI_EMBEDDING_URL = "https://api.openai.com/v1/embeddings";

interface EmbeddingResponse {
  object: string;
  data: Array<{
    object: string;
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export interface EmbeddingOptions {
  model?: "text-embedding-3-small" | "text-embedding-3-large" | "text-embedding-ada-002";
  dimensions?: number;
}

/**
 * Generate embeddings for a single text
 */
export async function generateEmbedding(
  text: string,
  options: EmbeddingOptions = {}
): Promise<number[]> {
  const apiKey = getProviderKey("openai");
  if (!apiKey) {
    throw new Error("OpenAI API key not configured for embeddings");
  }

  const { model = "text-embedding-3-small", dimensions } = options;

  const requestBody: Record<string, unknown> = {
    model,
    input: text,
  };

  if (dimensions) {
    requestBody.dimensions = dimensions;
  }

  const response = await fetch(OPENAI_EMBEDDING_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Embedding API error: ${response.status} - ${error}`);
  }

  const data: EmbeddingResponse = await response.json();

  if (!data.data?.[0]?.embedding) {
    throw new Error("Invalid embedding response");
  }

  return data.data[0].embedding;
}

/**
 * Generate embeddings for multiple texts (batch)
 */
export async function generateEmbeddings(
  texts: string[],
  options: EmbeddingOptions = {}
): Promise<number[][]> {
  const apiKey = getProviderKey("openai");
  if (!apiKey) {
    throw new Error("OpenAI API key not configured for embeddings");
  }

  const { model = "text-embedding-3-small", dimensions } = options;

  const requestBody: Record<string, unknown> = {
    model,
    input: texts,
  };

  if (dimensions) {
    requestBody.dimensions = dimensions;
  }

  const response = await fetch(OPENAI_EMBEDDING_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Embedding API error: ${response.status} - ${error}`);
  }

  const data: EmbeddingResponse = await response.json();

  return data.data.map((d) => d.embedding);
}

// Model pricing per 1M tokens
export const EMBEDDING_PRICING = {
  "text-embedding-3-small": 0.02,
  "text-embedding-3-large": 0.13,
  "text-embedding-ada-002": 0.10,
} as const;

export function calculateEmbeddingCost(
  model: keyof typeof EMBEDDING_PRICING,
  tokens: number
): number {
  return (tokens / 1_000_000) * EMBEDDING_PRICING[model];
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Embeddings must have the same dimensions");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Split text into chunks for embedding
 */
export function chunkText(
  text: string,
  options: {
    chunkSize?: number;
    overlap?: number;
  } = {}
): string[] {
  const { chunkSize = 1000, overlap = 200 } = options;

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    let chunk = text.slice(start, end);

    // Try to break at sentence or word boundary
    if (end < text.length) {
      const lastPeriod = chunk.lastIndexOf(".");
      const lastSpace = chunk.lastIndexOf(" ");
      const breakPoint = lastPeriod > chunkSize * 0.5 ? lastPeriod : lastSpace;

      if (breakPoint > 0) {
        chunk = chunk.slice(0, breakPoint + 1);
      }
    }

    chunks.push(chunk.trim());
    start += chunk.length - overlap;
  }

  return chunks;
}
