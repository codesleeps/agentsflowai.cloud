import { logModelUsage } from "./ai-usage-tracker";
import { AIModelUsage } from "@prisma/client";

// Type definitions for the fallback handler
interface GenerationRequest {
  prompt: string;
  enableWebSearch?: boolean;
  enableDeepResearch?: boolean;
  reasoningEffort?: "low" | "medium" | "high";
  modelProvider?: "openai" | "google";
  userId: string;
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
async function handleAnthropicProvider(
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
      throw new Error(
        `Anthropic API error: ${response.status} ${response.statusText}`,
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
async function handleGoogleProvider(
  prompt: string,
  enableWebSearch: boolean,
  enableDeepResearch: boolean,
  reasoningEffort: "low" | "medium" | "high",
  agentConfig: AgentConfig,
  userId: string,
): Promise<{ text: string; provider: string }> {
  try {
    const response = await fetch(
      `${process.env.GOOGLE_AI_API_BASE_URL}/v1/models/${agentConfig.primaryModel}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.GOOGLE_AI_API_KEY!,
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
      },
    );

    if (!response.ok) {
      throw new Error(
        `Google API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    const text = data.candidates[0]?.content?.parts[0]?.text || "";

    await logModelUsage({
      user_id: userId,
      model: agentConfig.primaryModel,
      provider: "google",
      prompt_tokens: data.usageMetadata?.promptTokenCount || 0,
      completion_tokens: data.usageMetadata?.candidatesTokenCount || 0,
      cost_usd: 0, // Will be calculated by logModelUsage
      latency_ms: 0, // Not available in this context
      status: "success",
      agent_id: agentConfig.agentId,
      error_message: undefined,
    });

    return { text, provider: "google" };
  } catch (error) {
    console.error("Google provider failed:", error);
    throw error;
  }
}

// Extracted from agents route - handle Ollama provider
async function handleOllamaProvider(
  prompt: string,
  enableWebSearch: boolean,
  enableDeepResearch: boolean,
  reasoningEffort: "low" | "medium" | "high",
  agentConfig: AgentConfig,
  userId: string,
): Promise<{ text: string; provider: string }> {
  try {
    const response = await fetch(
      `${process.env.OLLAMA_API_BASE_URL}/api/generate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: agentConfig.primaryModel,
          prompt,
          stream: false,
          options: {
            temperature: 0.7,
            top_k: 40,
            top_p: 0.95,
            num_ctx: 4096,
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Ollama API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    const text = data.response || "";

    await logModelUsage({
      user_id: userId,
      model: agentConfig.primaryModel,
      provider: "ollama",
      prompt_tokens: data.prompt_eval_count || 0,
      completion_tokens: data.eval_count || 0,
      cost_usd: 0, // Will be calculated by logModelUsage
      latency_ms: 0, // Not available in this context
      status: "success",
      agent_id: agentConfig.agentId,
      error_message: undefined,
    });

    return { text, provider: "ollama" };
  } catch (error) {
    console.error("Ollama provider failed:", error);
    throw error;
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
  } = request;

  // Determine agent configuration based on model provider
  const agentConfig: AgentConfig =
    modelProvider === "google"
      ? {
          agentId: "gemini-agent",
          primaryProvider: "google",
          primaryModel: "gemini-pro",
          fallbackChain: [
            { provider: "ollama", model: "glm4:9b", priority: 1 },
            { provider: "ollama", model: "mistral", priority: 2 },
            {
              provider: "anthropic",
              model: "claude-sonnet-4-5-20250929",
              priority: 3,
            },
          ],
        }
      : {
          agentId: "fast-chat-agent",
          primaryProvider: "ollama",
          primaryModel: "glm4:9b",
          fallbackChain: [
            { provider: "ollama", model: "mistral", priority: 1 },
            { provider: "google", model: "gemini-2.0-flash", priority: 2 },
          ],
        };

  const providers = [
    { provider: agentConfig.primaryProvider, model: agentConfig.primaryModel },
    ...agentConfig.fallbackChain.map((item) => ({
      provider: item.provider,
      model: item.model,
    })),
  ];

  let lastError: Error | null = null;

  for (const { provider, model } of providers) {
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
