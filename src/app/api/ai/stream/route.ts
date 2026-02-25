/**
 * AI Streaming API Endpoint
 * Provides Server-Sent Events (SSE) for real-time AI responses
 */

import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { createAIStream } from "@/lib/ai/streaming/ai-stream";
import type { AIProvider } from "@/lib/provider-config";

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuth(request);

    // Parse request body
    const body = await request.json();
    const {
      messages,
      provider,
      model,
      temperature,
      maxTokens,
      systemPrompt,
    } = body;

    // Validate required fields
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!provider) {
      return new Response(
        JSON.stringify({ error: "Provider is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create streaming response
    const stream = createAIStream(messages, {
      provider: provider as AIProvider,
      model,
      temperature,
      maxTokens,
      systemPrompt,
    });

    // Return SSE response
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Streaming API error:", error);
    
    // Handle auth errors
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Internal server error" 
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
