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
    console.log("AI Agent Request:", JSON.stringify(body, null, 2));

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

async function handleAnthropicProvider(
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

async function handleGoogleProvider(
  agent: AIAgent,
  message: string,
  conversationHistory: AIMessage[],
  systemPrompt: string,
) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY is not defined");

  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: agent.model });

  const history = (conversationHistory || []).map((msg: any) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));

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

async function handleOllamaProvider(agent: AIAgent, messages: AIMessage[]) {
  const OLLAMA_BASE_URL =
    process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  const ollamaResponse = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: agent.model,
      messages,
      stream: false,
      options: { temperature: 0.7, top_p: 0.9, num_predict: 2048 },
    }),
  });

  if (!ollamaResponse.ok)
    throw new Error(`Ollama API returned ${ollamaResponse.status}`);
  const data = await ollamaResponse.json();

  return {
    response: data.message?.content || data.response,
    tokensUsed: data.eval_count,
  };
}

async function handleOpenRouterProvider(
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

async function handleOpenAIProvider(
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
        return `# Web Development Suggestion

Here's a basic React component structure to get you started:

\`\`\`tsx
import { useState } from 'react';

interface Props {
  title: string;
}

export function MyComponent({ title }: Props) {
  const [isActive, setIsActive] = useState(false);
  
  return (
    <div className="p-4 rounded-lg border">
      <h2 className="text-xl font-bold">{title}</h2>
      <button 
        onClick={() => setIsActive(!isActive)}
        className="mt-2 px-4 py-2 bg-primary text-white rounded"
      >
        {isActive ? 'Active' : 'Inactive'}
      </button>
    </div>
  );
}
\`\`\`

**Best Practices:**
- Use TypeScript for type safety
- Keep components small and focused
- Use meaningful prop names
- Add proper accessibility attributes

*Note: Connect Ollama for more detailed, context-aware responses.*`;
      }
      return `I can help you with web development! Here are some things I can assist with:

• **React/Next.js Components** - Generate modern, reusable components
• **TypeScript** - Type-safe code with proper interfaces
• **API Development** - RESTful endpoints and data handling
• **Performance** - Optimization techniques and best practices
• **Testing** - Unit tests and integration tests

What specific web development task can I help you with?

*Note: Connect Ollama on your VPS for full AI-powered code generation.*`;

    case "analytics-agent":
      return `# Analytics Insights

Based on your query, here are some analytical perspectives:

**Key Metrics to Consider:**
1. **Conversion Rate** - Track how visitors become customers
2. **Customer Lifetime Value** - Long-term revenue per customer
3. **Churn Rate** - Customer retention analysis
4. **ROI** - Return on marketing investments

**Recommended Actions:**
- Set up proper tracking and attribution
- Create weekly performance dashboards
- A/B test key landing pages
- Monitor competitor benchmarks

**Quick Analysis Framework:**
1. Define your key performance indicators
2. Collect baseline data
3. Identify trends and patterns
4. Generate actionable insights
5. Implement and measure changes

*Connect Ollama for detailed data analysis and custom insights.*`;

    case "content-agent":
      return `# Content Creation Framework

Here's a structure for creating compelling content:

**Blog Post Template:**

## [Attention-Grabbing Headline]

**Introduction** (Hook your readers)
- Start with a compelling statistic or question
- Address the reader's pain point
- Preview what they'll learn

**Main Content**
- Break into scannable sections
- Use bullet points and lists
- Include relevant examples
- Add visuals where possible

**Conclusion**
- Summarize key takeaways
- Include a clear call-to-action
- Encourage engagement

**SEO Checklist:**
✅ Keyword in title and first paragraph
✅ Meta description (150-160 characters)
✅ Internal and external links
✅ Image alt text
✅ Readable URL structure

*Connect Ollama for AI-generated content tailored to your specific needs.*`;

    case "marketing-agent":
      return `# Marketing Strategy Framework

**Campaign Planning Checklist:**

1. **Define Objectives**
   - Brand awareness
   - Lead generation
   - Sales conversion
   - Customer retention

2. **Identify Target Audience**
   - Demographics
   - Psychographics
   - Pain points
   - Buying behavior

3. **Select Channels**
   - Paid ads (Google, Facebook, LinkedIn)
   - Content marketing
   - Email campaigns
   - Social media
   - Influencer partnerships

4. **Create Messaging**
   - Value proposition
   - Key benefits
   - Call-to-action
   - Brand voice

5. **Set Budget & Timeline**
   - Channel allocation
   - Testing budget
   - Scaling plan

**Quick Wins:**
• Optimize your landing pages for conversion
• Set up retargeting campaigns
• Create lead magnets
• Build email sequences

*Connect Ollama for personalized marketing strategies and ad copy generation.*`;

    case "social-media-agent":
      return `# Social Media Content Ideas

**Platform-Specific Tips:**

📘 **Facebook**
- Best posting times: 1-4 PM
- Use eye-catching visuals
- Ask questions to boost engagement
- Go live regularly

📸 **Instagram**
- Use 5-10 relevant hashtags
- Post Reels for maximum reach
- Engage with Stories daily
- Collaborate with creators

💼 **LinkedIn**
- Share industry insights
- Post thought leadership content
- Engage in comments
- Use LinkedIn articles

🐦 **Twitter/X**
- Tweet 3-5 times daily
- Use trending hashtags
- Create threads for complex topics
- Engage with your community

**Content Calendar Template:**
| Day | Platform | Content Type | Topic |
|-----|----------|--------------|-------|
| Mon | LinkedIn | Article | Industry news |
| Tue | Instagram | Reel | Behind the scenes |
| Wed | Twitter | Thread | Tips & tricks |
| Thu | Facebook | Live | Q&A session |
| Fri | All | Promo | Weekly offer |

*Connect Ollama for AI-generated posts and personalized strategies.*`;

    case "seo-agent":
      return `# SEO Optimization Guide

**On-Page SEO Checklist:**

✅ **Title Tag** (50-60 characters)
- Include primary keyword
- Make it compelling
- Add brand name

✅ **Meta Description** (150-160 characters)
- Summarize page content
- Include call-to-action
- Use target keyword

✅ **Headers (H1-H6)**
- One H1 per page
- Use keywords naturally
- Create logical hierarchy

✅ **Content Optimization**
- 1,500+ words for pillar content
- Include related keywords
- Add internal links
- Use multimedia

**Technical SEO:**
- Page speed < 3 seconds
- Mobile-friendly design
- SSL certificate
- XML sitemap
- Clean URL structure

**Keyword Research Tips:**
1. Start with seed keywords
2. Analyze search intent
3. Check competition
4. Find long-tail variations
5. Group by topic clusters

**Quick Wins:**
• Fix broken links
• Optimize images
• Add schema markup
• Improve Core Web Vitals

*Connect Ollama for detailed SEO analysis and keyword recommendations.*`;

    default:
      return `I'm your AI assistant! I can help you with:

• **Web Development** - Code, components, debugging
• **Analytics** - Data insights, trends, forecasting
• **Content Creation** - Blog posts, copy, articles
• **Marketing** - Campaigns, strategies, ad copy
• **Social Media** - Posts, calendars, engagement
• **SEO** - Keywords, optimization, rankings

Please select a specific agent or ask me anything!

*For full AI capabilities, ensure Ollama is running on your VPS.*`;
  }
}
