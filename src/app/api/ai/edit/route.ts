/**
 * AI Text Editing API
 * Provides AI-powered text editing capabilities
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { generateWithOpenAI } from "@/lib/ai/providers/openai";

type AIAction =
  | "improve"
  | "summarize"
  | "expand"
  | "shorten"
  | "translate"
  | "tone-professional"
  | "tone-casual"
  | "tone-friendly"
  | "fix-grammar"
  | "bullet-points"
  | "paragraph";

interface EditRequest {
  text: string;
  action: AIAction;
  targetLanguage?: string;
}

const ACTION_PROMPTS: Record<AIAction, string> = {
  improve:
    "Improve the following text. Make it clearer, more engaging, and better structured while maintaining the original meaning:",
  summarize:
    "Summarize the following text into a concise version that captures the key points:",
  expand:
    "Expand the following text with more detail, examples, and elaboration while maintaining the original tone:",
  shorten:
    "Make the following text shorter and more concise while keeping the essential information:",
  translate:
    "Translate the following text. If a target language is specified, translate to that language. Otherwise, detect the language and translate to English:",
  "tone-professional":
    "Rewrite the following text in a professional, formal business tone:",
  "tone-casual":
    "Rewrite the following text in a casual, relaxed, conversational tone:",
  "tone-friendly":
    "Rewrite the following text in a warm, friendly, and approachable tone:",
  "fix-grammar":
    "Fix any grammar, spelling, and punctuation errors in the following text. Maintain the original meaning and style:",
  "bullet-points":
    "Convert the following text into a well-structured bullet point list:",
  paragraph:
    "Convert the following text into well-structured paragraphs with proper flow:",
};

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body: EditRequest = await request.json();

    const { text, action, targetLanguage } = body;

    // Validation
    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    if (!action || !ACTION_PROMPTS[action]) {
      return NextResponse.json(
        { error: "Invalid or missing action" },
        { status: 400 }
      );
    }

    if (text.length > 10000) {
      return NextResponse.json(
        { error: "Text too long. Maximum 10,000 characters." },
        { status: 400 }
      );
    }

    // Build the prompt
    let systemPrompt = ACTION_PROMPTS[action];
    
    if (action === "translate" && targetLanguage) {
      systemPrompt = `Translate the following text to ${targetLanguage}. Maintain the original meaning and tone as much as possible:`;
    }

    const messages = [
      {
        role: "system" as const,
        content:
          "You are a helpful writing assistant. Edit the user's text according to their request. Only return the edited text without any explanations, prefixes, or markdown formatting unless specifically requested.",
      },
      {
        role: "user" as const,
        content: `${systemPrompt}\n\n"""\n${text}\n"""`,
      },
    ];

    // Use gpt-4o-mini for cost-effectiveness
    const response = await generateWithOpenAI(messages, {
      model: "gpt-4o-mini",
      temperature: 0.7,
      maxTokens: Math.min(text.length * 2, 4000),
    });

    // Clean up the response
    let result = response.content.trim();

    // Remove surrounding quotes if present
    if (
      (result.startsWith('"') && result.endsWith('"')) ||
      (result.startsWith("'") && result.endsWith("'"))
    ) {
      result = result.slice(1, -1);
    }

    // Remove markdown code blocks if present
    if (result.startsWith("```") && result.endsWith("```")) {
      result = result.replace(/^```[\w]*\n?/, "").replace(/\n?```$/, "");
    }

    return NextResponse.json({
      result,
      action,
      originalLength: text.length,
      newLength: result.length,
    });
  } catch (error) {
    console.error("AI Edit API error:", error);
    return NextResponse.json(
      { error: "Failed to process text" },
      { status: 500 }
    );
  }
}

// GET endpoint to list available actions
export async function GET() {
  const actions = Object.entries(ACTION_PROMPTS).map(([id, description]) => ({
    id,
    description,
  }));

  return NextResponse.json({ actions });
}
