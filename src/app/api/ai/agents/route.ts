import { NextRequest, NextResponse } from "next/server";
import { AI_AGENTS, AIAgent } from "@/shared/models/ai-agents";

interface AgentRequest {
  agentId: string;
  message: string;
  conversationHistory?: Array<{role: string; content: string}>;
}

interface AgentResponse {
  response: string;
  model: string;
  agentId: string;
  agentName: string;
  tokensUsed: number;
  generationTime: number;
  provider: string;
}

// Simple OpenRouter call function
async function callOpenRouter(agent: AIAgent, message: string, conversationHistory: Array<{role: string; content: string}> = []): Promise<{response: string; tokensUsed: number}> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY not configured");
  }

  const messages = [
    { role: "system", content: agent.systemPrompt },
    ...conversationHistory,
    { role: "user", content: message }
  ];

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://agentsflowai.cloud",
      "X-Title": "AgentsFlowAI",
    },
    body: JSON.stringify({
      model: agent.model,
      messages,
      temperature: 0.7,
      max_tokens: 2000
    }),
    signal: AbortSignal.timeout(60000)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return {
    response: data.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.",
    tokensUsed: data.usage?.total_tokens || 0
  };
}

// Simple Ollama call function
async function callOllama(agent: AIAgent, message: string, conversationHistory: Array<{role: string; content: string}> = []): Promise<{response: string; tokensUsed: number}> {
  const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  
  const messages = [
    ...conversationHistory,
    { role: "user", content: message }
  ];

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: agent.model,
      messages,
      stream: false,
      options: { temperature: 0.7, num_predict: 2000 }
    }),
    signal: AbortSignal.timeout(60000)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return {
    response: data.message?.content || data.response || "Sorry, I couldn't generate a response.",
    tokensUsed: data.eval_count || 0
  };
}

// Get all agents
export async function GET() {
  try {
    return NextResponse.json(AI_AGENTS);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch agents" }, { status: 500 });
  }
}

// Generate response from agent
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body: AgentRequest = await request.json();
    const { agentId, message, conversationHistory = [] } = body;

    // Validate input
    if (!agentId || !message) {
      return NextResponse.json({ error: "agentId and message are required" }, { status: 400 });
    }

    // Find the agent
    const agent = AI_AGENTS.find(a => a.id === agentId);
    if (!agent) {
      return NextResponse.json({ error: `Agent ${agentId} not found` }, { status: 404 });
    }

    if (!agent.isActive) {
      return NextResponse.json({ error: `Agent ${agentId} is not active` }, { status: 400 });
    }

    console.log(`[Agent API] Processing request for ${agentId}: ${message.substring(0, 100)}...`);

    // Try providers in order of priority
    let lastError: Error | null = null;
    
    for (const providerConfig of agent.supportedProviders.sort((a, b) => a.priority - b.priority)) {
      try {
        let result;
        
        if (providerConfig.provider === "openrouter") {
          result = await callOpenRouter(
            { ...agent, model: providerConfig.model },
            message,
            conversationHistory
          );
        } else if (providerConfig.provider === "ollama") {
          result = await callOllama(
            { ...agent, model: providerConfig.model },
            message,
            conversationHistory
          );
        } else {
          // Skip unsupported providers
          continue;
        }

        const totalTime = Date.now() - startTime;
        
        const response: AgentResponse = {
          response: result.response,
          model: providerConfig.model,
          agentId: agent.id,
          agentName: agent.name,
          tokensUsed: result.tokensUsed,
          generationTime: totalTime,
          provider: providerConfig.provider
        };

        console.log(`[Agent API] ${agentId} succeeded with ${providerConfig.provider}/${providerConfig.model} in ${totalTime}ms (${result.tokensUsed} tokens)`);
        
        return NextResponse.json(response);

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`[Agent API] ${agentId} failed with ${providerConfig.provider}/${providerConfig.model}: ${lastError.message}`);
        // Continue to next provider
      }
    }

    // All providers failed
    const totalTime = Date.now() - startTime;
    console.error(`[Agent API] All providers failed for ${agentId} after ${totalTime}ms`);
    
    return NextResponse.json({
      response: `I'm sorry, but I'm currently unable to process your request. Please try again later.\n\nError: ${lastError?.message || 'Unknown error'}`,
      model: "fallback",
      agentId: agent.id,
      agentName: agent.name,
      tokensUsed: 0,
      generationTime: totalTime,
      provider: "none"
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`[Agent API] Request failed after ${totalTime}ms:`, error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
      response: "I encountered an error processing your request. Please try again."
    }, { status: 500 });
  }
}