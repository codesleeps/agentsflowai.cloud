import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { validateAndSanitize } from "@/lib/validation-schemas";
import { GenerateTextRequestSchema } from "@/lib/validation-schemas";
import { executeSimpleGeneration } from "@/server-lib/ai-fallback-handler";
import { logIntegrationError } from "@/server-lib/ai-usage-tracker";

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = validateAndSanitize(GenerateTextRequestSchema, body);

    const {
      prompt,
      enableWebSearch,
      enableDeepResearch,
      reasoningEffort,
      modelProvider,
    } = validatedData;

    // Execute text generation with fallback
    const result = await executeSimpleGeneration({
      prompt,
      enableWebSearch,
      enableDeepResearch,
      reasoningEffort,
      modelProvider,
      userId: user.id,
    });

    return NextResponse.json({
      text: result.text,
      fallbackUsed: result.fallbackUsed,
      provider: result.provider,
    });
  } catch (error) {
    console.error("AI integration endpoint error:", error);

    // Log the integration error
    const body = await request.json().catch(() => ({}));
    await logIntegrationError(
      request.headers.get("x-user-id") || "unknown",
      "/api/integrations/ai/generate-text",
      error as Error,
      body.prompt || "unknown",
    );

    // Return a helpful fallback response
    return NextResponse.json(
      {
        text: `I'm currently experiencing connectivity issues with my AI providers, but I'm here to help! 

While I work on reconnecting, here's what I can tell you:
- All our AI agents support multi-model fallback for reliability
- We use Anthropic Claude, Google Gemini, and local Ollama models
- Your question has been logged and I'll provide a detailed response once reconnected

In the meantime, you can:
• Try asking a different question
• Check our documentation
• Contact our support team directly

What else can I help you with?`,
        fallbackUsed: true,
        provider: "static-fallback",
      },
      { status: 503 },
    );
  }
}
