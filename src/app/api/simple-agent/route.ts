import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message } = body;

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Direct OpenRouter call - simple and focused
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: "OpenRouter API key not configured",
        response: "I'm sorry, but the AI service is not properly configured. Please check that OPENROUTER_API_KEY is set in the environment variables."
      });
    }

    console.log(`[Simple Agent] Processing request: ${message}`);

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://agentsflowai.cloud",
        "X-Title": "AgentsFlowAI",
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-chat",
        messages: [
          {
            role: "system",
            content: `You are a web development expert. Help the user with their coding request. Provide clean, working code examples.`
          },
          {
            role: "user",
            content: message
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      }),
      signal: AbortSignal.timeout(60000) // 60 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Simple Agent] OpenRouter API error: ${response.status} - ${errorText}`);
      return NextResponse.json({ 
        error: `OpenRouter API error: ${response.status}`,
        response: `I encountered an error connecting to the AI service. Status: ${response.status}. Please try again later.`
      });
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";

    console.log(`[Simple Agent] Successfully generated response (${data.usage?.total_tokens || 0} tokens)`);

    return NextResponse.json({
      response: aiResponse,
      model: "deepseek/deepseek-chat",
      tokensUsed: data.usage?.total_tokens || 0,
      provider: "openrouter"
    });

  } catch (error) {
    console.error(`[Simple Agent] Error:`, error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Unknown error",
      response: "I'm sorry, but I encountered an error processing your request. Please try again."
    });
  }
}