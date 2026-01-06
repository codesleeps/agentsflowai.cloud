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
import { logModelUsage } from "@/server-lib/ai-usage-tracker";
import { AIMessage } from "@/shared/models/types";
import { AIAgent } from "../../../../shared/models/ai-agents";

// Module-level environment check (runs once on load)
function verifyEnvironmentVariables() {
  const providers = {
    google: !!(process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY),
    openrouter: !!process.env.OPENROUTER_API_KEY,
    ollama: !!process.env.OLLAMA_BASE_URL,
  };

  console.log('[AI Agents API] Environment initialized:', providers);

  const availableProviders = Object.entries(providers)
    .filter(([_, available]) => available)
    .map(([name]) => name);

  if (availableProviders.length === 0) {
    console.warn('[AI Agents API] WARNING: No AI providers configured!');
  } else {
    console.log('[AI Agents API] Available providers:', availableProviders.join(', '));
  }
}

// Run verification on module load
verifyEnvironmentVariables();

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

    // Log environment variable status
    console.log(`[AI Agents] Environment check: GOOGLE_API_KEY=${!!process.env.GOOGLE_API_KEY}, GOOGLE_GENERATIVE_AI_API_KEY=${!!process.env.GOOGLE_GENERATIVE_AI_API_KEY}, OPENROUTER_API_KEY=${!!process.env.OPENROUTER_API_KEY}, OLLAMA_BASE_URL=${process.env.OLLAMA_BASE_URL || 'not set'}`);

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
        enrichedMessage = `${message}

[System Context: The user provided a URL. Here is the scraped content of ${urlToScrape} for your analysis:]

${scrapedContent}`;
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

export async function handleGoogleProvider(
  agent: AIAgent,
  message: string,
  conversationHistory: AIMessage[],
  systemPrompt: string,
) {
  console.log('[Google Provider] Checking API keys...');
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  console.log('[Google Provider] API key found:', !!apiKey);
  if (!apiKey) {
    console.error('[Google Provider] Missing API key. Checked: GOOGLE_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY');
    throw new Error("GOOGLE_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY is not defined");
  }

  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(apiKey);

  const modelNames = [
    agent.model,
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-2.0-flash-exp",
    "gemini-1.0-pro",
  ];

  let lastError;

  for (const modelName of modelNames) {
    try {
      console.log(`[Google AI] Attempting generation with model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });

      // Build segments for generateContent
      const contents = (conversationHistory || []).map((msg: any) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      }));

      // Google Generative AI requires the first message to be from 'user'
      while (contents.length > 0 && contents[0].role === 'model') {
        contents.shift();
      }

      // Add the current system prompt + message
      const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${message}` : message;
      contents.push({
        role: "user",
        parts: [{ text: fullPrompt }]
      });

      const result = await model.generateContent({
        contents,
        generationConfig: { maxOutputTokens: 2048 },
      });

      const response = result.response;
      const responseText = response.text();

      if (!responseText) throw new Error("Empty response text");

      return {
        response: responseText,
        tokensUsed: 0,
        modelUsed: modelName
      };
    } catch (error) {
      lastError = error;
      console.warn(`[Google AI] Model ${modelName} failed: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
  }

  throw new Error(`Google AI failed after trying all models. Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

export async function handleOpenRouter(
  agent: AIAgent,
  message: string,
  conversationHistory: AIMessage[],
  systemPrompt: string
) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  console.log('[OpenRouter] API key found:', !!apiKey);
  if (!apiKey) {
    console.error('[OpenRouter] OPENROUTER_API_KEY not found in environment');
    throw new Error("OPENROUTER_API_KEY is not defined");
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://agentsflowai.cloud",
      "X-Title": "AgentsFlowAI",
    },
    body: JSON.stringify({
      model: agent.model,
      messages: [
        { role: "system", content: systemPrompt },
        ...conversationHistory.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: message },
      ],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`OpenRouter API error: ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return {
    response: data.choices[0]?.message?.content || "",
    tokensUsed: data.usage?.total_tokens || 0,
  };
}

export async function handleOpenAI(
  agent: AIAgent,
  message: string,
  conversationHistory: AIMessage[],
  systemPrompt: string
) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not defined");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: agent.model,
      messages: [
        { role: "system", content: systemPrompt },
        ...conversationHistory.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: message },
      ],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return {
    response: data.choices[0]?.message?.content || "",
    tokensUsed: data.usage?.total_tokens || 0,
  };
}

export async function handleOllamaProvider(agent: AIAgent, messages: AIMessage[]) {
  const OLLAMA_BASE_URL =
    process.env.OLLAMA_BASE_URL || "http://localhost:11434";

  console.log('[Ollama] Base URL:', OLLAMA_BASE_URL);

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
      signal: AbortSignal.timeout(5000), // 5 second timeout for local Ollama - fail fast to cloud
    });

    if (!ollamaResponse.ok) {
      if (ollamaResponse.status === 404) {
        throw new Error(`Ollama model "${agent.model}" not found. Please pull it using 'ollama pull ${agent.model}'`);
      }
      throw new Error(`Ollama API returned ${ollamaResponse.status}`);
    }
    const data = await ollamaResponse.json();

    return {
      response: data.message?.content || data.response,
      tokensUsed: data.eval_count || 0,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new Error("Ollama connection timed out (30s)");
    }
    throw error;
  }
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

      if (provider === "google") {
        result = await handleGoogleProvider(
          { ...agent, model },
          message,
          conversationHistory,
          systemPrompt,
        );
      } else if (provider === "ollama") {
        result = await handleOllamaProvider({ ...agent, model }, messages);
      } else if (provider === "openrouter") {
        result = await handleOpenRouter(
          { ...agent, model },
          message,
          conversationHistory,
          systemPrompt,
        );
      } else if (provider === "openai") {
        result = await handleOpenAI(
          { ...agent, model },
          message,
          conversationHistory,
          systemPrompt,
        );
      } else {
        continue;
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

The AI providers (Google, Ollama) are currently unavailable or hit their rate limits.

**Quick Component Blueprint:**
\`\`\`tsx
export function Component() {
  return <div className="p-4 bg-muted rounded">Base Structure</div>;
}
\`\`\`

*Please check your API keys or ensure your local Ollama instance is running to restore full generative capabilities.*`;
      }
      return `I'm currently in **Limited Resource Mode**. 

The connection to Google's Gemini or your local Ollama instance is not responding. 

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

I'm currently running in a limited offline mode because I cannot reach the AI providers (Google or Ollama).

**Troubleshooting:**
- **External APIs**: Verify your API keys in the environment settings.
- **Local Models**: Ensure Ollama is active if you're using local inference.
- **Network**: Check if your server has outgoing internet access for cloud models.

*As soon as a provider becomes available, I will automatically resume full intelligence services.*`;
  }
}
