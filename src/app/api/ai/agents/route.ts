import { NextRequest, NextResponse } from "next/server";
import { AI_AGENTS } from "@/shared/models/ai-agents";
import {
  AIAgentRequestSchema,
  validateAndSanitize,
} from "@/lib/validation-schemas";
import { requireAuth } from "@/lib/auth-helpers";
import { handleApiError } from "@/lib/api-errors";
import * as cheerio from "cheerio";
import axios from "axios";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { logModelUsage } from "@/server-lib/ai-usage-tracker";
import { AIMessage } from "@/shared/models/types";
import { AIAgent } from "../../../../shared/models/ai-agents";

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
        enrichedMessage = `${message}\n\n[System Context: The user provided a URL. Here is the scraped content of ${urlToScrape} for your analysis:]\n\n${scrapedContent}`;
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

export async function handleAnthropicProvider(
  agent: AIAgent,
  messages: AIMessage[],
  systemPrompt: string,
) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not defined");

  const anthropic = new Anthropic({ apiKey });

  const response = await anthropic.messages.create({
    model: agent.model,
    system: systemPrompt,
    messages: messages
      .filter((msg) => msg.role !== "system")
      .map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
    max_tokens: 2048,
  });

  const textContent =
    response.content[0].type === "text" ? response.content[0].text : "";

  return {
    response: textContent,
    tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
  };
}

export async function handleGoogleProvider(
  agent: AIAgent,
  message: string,
  conversationHistory: AIMessage[],
  systemPrompt: string,
) {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY is not defined");

  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: agent.model });

  const history = (conversationHistory || []).map((msg: any) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));

  // Google Generative AI requires the first message to be from 'user'
  while (history.length > 0 && history[0].role === 'model') {
    history.shift();
  }

  const chat = model.startChat({
    history,
    generationConfig: { maxOutputTokens: 2048 },
    systemInstruction: { role: "system", parts: [{ text: systemPrompt }] },
  });

  const result = await chat.sendMessage(message);
  const responseText = result.response.text();

  return {
    response: responseText,
    tokensUsed: 0, // Not easily available
  };
}

export async function handleOllamaProvider(agent: AIAgent, messages: AIMessage[]) {
  const OLLAMA_BASE_URL =
    process.env.OLLAMA_BASE_URL || "http://localhost:11434";

  try {
    const ollamaResponse = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: agent.model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        stream: false,
        options: { temperature: 0.7, top_p: 0.9, num_predict: 2048 },
      }),
      signal: AbortSignal.timeout(3000), // 3 second timeout for local Ollama
    });

    if (!ollamaResponse.ok)
      throw new Error(`Ollama API returned ${ollamaResponse.status}`);
    const data = await ollamaResponse.json();

    return {
      response: data.message?.content || data.response,
      tokensUsed: data.eval_count || 0,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new Error("Ollama connection timed out (3s)");
    }
    throw error;
  }
}

export async function handleOpenRouterProvider(
  agent: AIAgent,
  messages: AIMessage[],
  systemPrompt: string,
) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not defined");

  // Map messages to OpenRouter format
  const formattedMessages = [
    { role: "system", content: systemPrompt },
    ...messages
      .filter((msg) => msg.role !== "system")
      .map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
  ];

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer":
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "AgentsFlowAI",
      },
      body: JSON.stringify({
        model: agent.model,
        messages: formattedMessages,
        max_tokens: 2048,
        temperature: 0.7,
      }),
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `OpenRouter API error: ${response.status} - ${errorData.error?.message || response.statusText}`,
    );
  }

  const data = await response.json();
  const textContent = data.choices?.[0]?.message?.content || "";

  return {
    response: textContent,
    tokensUsed: data.usage?.total_tokens || 0,
  };
}

export async function handleOpenAIProvider(
  agent: AIAgent,
  messages: AIMessage[],
  systemPrompt: string,
) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not defined");

  const openai = new OpenAI({ apiKey });

  const response = await openai.chat.completions.create({
    model: agent.model,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages
        .filter((msg) => msg.role !== "system")
        .map((msg) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        })),
    ],
    max_tokens: 2048,
  });

  const textContent = response.choices[0]?.message?.content || "";

  return {
    response: textContent,
    tokensUsed: response.usage?.total_tokens || 0,
  };
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

  for (const providerConfig of providers) {
    const { provider, model } = providerConfig;
    try {
      let result;
      const systemPrompt = agent.systemPrompt;

      if (provider === "anthropic") {
        result = await handleAnthropicProvider(
          { ...agent, model },
          messages,
          systemPrompt,
        );
      } else if (provider === "google") {
        result = await handleGoogleProvider(
          { ...agent, model },
          message,
          conversationHistory,
          systemPrompt,
        );
      } else if (provider === "ollama") {
        result = await handleOllamaProvider({ ...agent, model }, messages);
      } else if (provider === "openrouter") {
        result = await handleOpenRouterProvider(
          { ...agent, model },
          messages,
          systemPrompt,
        );
      } else if (provider === "openai") {
        result = await handleOpenAIProvider(
          { ...agent, model },
          messages,
          systemPrompt,
        );
      } else {
        continue; // Skip unsupported providers
      }

      const latency = Date.now() - startTime;
      await logModelUsage({
        user_id: userId,
        agent_id: agent.id,
        provider,
        model,
        prompt_tokens: 0, // Simplified for now
        completion_tokens: result.tokensUsed || 0,
        cost_usd: 0, // TODO: Implement cost calculation
        latency_ms: latency,
        status: "success",
      });

      return {
        response: result.response,
        model,
        agentId: agent.id,
        agentName: agent.name,
        tokensUsed: result.tokensUsed,
        generationTime: latency,
        fallbackUsed: provider !== agent.defaultProvider,
        usedProvider: provider,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(
        `Provider ${provider} (${model}) failed: ${lastError.message}. Trying next provider.`,
      );
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

  return {
    response: generateFallbackResponse(agent.id, message),
    model: "fallback",
    agentId: agent.id,
    agentName: agent.name,
    note: `All AI providers are currently unavailable. Using offline fallback mode. Last error: ${lastError?.message}`,
  };
}

function generateFallbackResponse(agentId: string, message: string): string {
  const lowercaseMessage = message.toLowerCase();

  switch (agentId) {
    case "web-dev-agent":
      if (
        lowercaseMessage.includes("react") ||
        lowercaseMessage.includes("component")
      ) {
        return `# Web Development Insight (Standard Mode)

The AI providers (Google, OpenAI, Anthropic, Ollama) are currently unavailable or hit their rate limits.

**Quick Component Blueprint:**
\`\`\`tsx
export function Component() {
  return <div className="p-4 bg-muted rounded">Base Structure</div>;
}
\`\`\`

*Please check your API keys or ensure your local Ollama instance is running to restore full generative capabilities.*`;
      }
      return `I'm currently in **Limited Resource Mode**. 

The connection to our AI providers (Anthropic, Google, and OpenAI) or your local Ollama instance is not responding. 

**What you can do:**
1. Check your \`.env\` file for valid API keys.
2. If using local models, ensure Ollama is running at \`http://localhost:11434\`.
3. Try again in a few minutes if this is a rate-limit issue.`;

    case "analytics-agent":
      return `# Analytics Insights (Fallback)

Our advanced analytical models are currently unreachable.

**General Optimization Framework:**
1. **Define KPIs**: Focus on conversion rate and ROI.
2. **Collect Data**: Ensure robust event tracking.
3. **Analyze**: Look for anomalies in weekly trends.

*Restoring connectivity will enable deep-dive analysis of your specific metrics.*`;

    default:
      return `# AI Capability Note

I'm currently running in a limited offline mode because I cannot reach the AI providers (OpenAI, Anthropic, Google, or Ollama).

**Troubleshooting:**
- **External APIs**: Verify your API keys in the environment settings.
- **Local Models**: Ensure Ollama is active if you're using local inference.
- **Network**: Check if your server has outgoing internet access for cloud models.

*As soon as a provider becomes available, I will automatically resume full intelligence services.*`;
  }
}
