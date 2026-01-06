import { NextResponse } from "next/server";
import { handleGoogleProvider, handleOllamaProvider, handleOpenRouter, handleOpenAI } from "../agents/route";
import { logModelUsage } from "@/server-lib/ai-usage-tracker";
import { AIAgent } from "@/shared/models/ai-agents";

// Test agent configuration for diagnostics
const TEST_AGENT: AIAgent = {
  id: "health-check-test",
  name: "Health Check Test Agent",
  description: "Test agent for provider diagnostics",
  icon: "🔧",
  category: "fast-chat",
  systemPrompt: "You are a test agent. Respond with 'OK' to any message.",
  capabilities: ["Test responses"],
  model: "mistral:7b",
  provider: "ollama",
  supportedProviders: [
    { provider: "ollama", model: "mistral:7b", priority: 1 },
    { provider: "google", model: "gemini-1.5-flash", priority: 2 },
    { provider: "openrouter", model: "meta-llama/llama-3.3-70b-instruct:free", priority: 3 },
  ],
  defaultProvider: "ollama",
  costTier: "free",
  isActive: true,
};

interface ProviderStatus {
  status: "healthy" | "degraded" | "unhealthy";
  latency_ms?: number;
  available_models?: string[];
  missing_models?: Array<{
    name: string;
    pullCommand: string;
    size: string;
  }>;
  model?: string;
  error?: string;
}

interface HealthCheckResponse {
  timestamp: string;
  overall_status: "healthy" | "degraded" | "unhealthy";
  providers: {
    ollama: ProviderStatus;
    google: ProviderStatus;
    openrouter: ProviderStatus;
    openai: ProviderStatus;
  };
  environment: {
    ollama_configured: boolean;
    google_key_configured: boolean;
    openai_key_configured: boolean;
    openrouter_key_configured: boolean;
  };
}

async function testProvider(providerName: string, model: string): Promise<ProviderStatus> {
  const startTime = Date.now();

  try {
    let result;

    const testMessage = "Hello, respond with 'OK'";
    const testMessages = [
      {
        role: "user" as const,
        content: testMessage,
        agentId: "health-check-test",
        id: "test-msg",
        timestamp: new Date(),
      },
    ];

    switch (providerName) {
      case "ollama":
        result = await handleOllamaProvider({ ...TEST_AGENT, model }, testMessages);
        break;
      case "google":
        result = await handleGoogleProvider(
          { ...TEST_AGENT, model },
          testMessage,
          [],
          TEST_AGENT.systemPrompt
        );
        break;
      case "openrouter":
        result = await handleOpenRouter(
          { ...TEST_AGENT, model },
          testMessage,
          [],
          TEST_AGENT.systemPrompt
        );
        break;
      case "openai":
        result = await handleOpenAI(
          { ...TEST_AGENT, model },
          testMessage,
          [],
          TEST_AGENT.systemPrompt
        );
        break;
      default:
        throw new Error(`Unknown provider: ${providerName}`);
    }

    const latency = Date.now() - startTime;

    // Log successful diagnostic
    await logModelUsage({
      user_id: "system",
      agent_id: "health-check-diagnostic",
      provider: providerName,
      model,
      prompt_tokens: 0,
      completion_tokens: result.tokensUsed || 0,
      cost_usd: 0,
      latency_ms: latency,
      status: "success",
    });

    return {
      status: "healthy",
      latency_ms: latency,
      model,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Log failed diagnostic
    await logModelUsage({
      user_id: "system",
      agent_id: "health-check-diagnostic",
      provider: providerName,
      model,
      prompt_tokens: 0,
      completion_tokens: 0,
      cost_usd: 0,
      latency_ms: latency,
      status: "failed",
      error_message: errorMessage,
    });

    return {
      status: "unhealthy",
      latency_ms: latency,
      model,
      error: errorMessage,
    };
  }
}

async function getOllamaModels(): Promise<string[]> {
  try {
    const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: "GET",
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (response.ok) {
      const data = await response.json();
      return data.models?.map((m: any) => m.name) || [];
    }
    return [];
  } catch {
    return [];
  }
}

async function testProviderWithTimeout(providerName: string, model: string): Promise<ProviderStatus> {
  return Promise.race([
    testProvider(providerName, model),
    new Promise<ProviderStatus>((resolve) =>
      setTimeout(() => resolve({
        status: "unhealthy",
        model,
        error: "Request timeout (30 seconds)",
      }), 30000)
    ),
  ]);
}

export async function GET() {
  const startTime = Date.now();

  // Check environment variables
  const environment = {
    ollama_configured: !!process.env.OLLAMA_BASE_URL,
    google_key_configured: !!(process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY),
    openai_key_configured: !!process.env.OPENAI_API_KEY,
    openrouter_key_configured: !!process.env.OPENROUTER_API_KEY,
  };

  // Test all providers concurrently
  const [ollamaResult, googleResult, openrouterResult, openaiResult] = await Promise.all([
    testProviderWithTimeout("ollama", "mistral:7b"),
    environment.google_key_configured
      ? testProviderWithTimeout("google", "gemini-1.5-flash")
      : Promise.resolve({ status: "unhealthy" as const, model: "gemini-1.5-flash", error: "GOOGLE_API_KEY not configured" }),
    environment.openrouter_key_configured
      ? testProviderWithTimeout("openrouter", "meta-llama/llama-3.3-70b-instruct:free")
      : Promise.resolve({ status: "unhealthy" as const, model: "meta-llama/llama-3.3-70b-instruct:free", error: "OPENROUTER_API_KEY not configured" }),
    environment.openai_key_configured
      ? testProviderWithTimeout("openai", "gpt-4o-mini")
      : Promise.resolve({ status: "unhealthy" as const, model: "gpt-4o-mini", error: "OPENAI_API_KEY not configured" }),
  ]);

  // Get Ollama models and check for missing required models
  const ollamaModels = await getOllamaModels();
  // Always compute missing models when Ollama is reachable (has models list, even if empty)
  if (ollamaModels.length > 0 || ollamaResult.status !== "unhealthy" || (ollamaResult.error && !ollamaResult.error.includes("not configured"))) {
    ollamaResult.available_models = ollamaModels;

    // Check for missing agent-required models
    const requiredModels = [
      { name: 'mistral:7b', size: '3.8GB' },
      { name: 'llama3.1:8b', size: '4.7GB' },
      { name: 'gemma2:9b', size: '5.4GB' },
    ];

    const missingModels = requiredModels.filter(model => !ollamaModels.includes(model.name));

    if (missingModels.length > 0) {
      ollamaResult.status = "degraded";
      ollamaResult.missing_models = missingModels.map(model => ({
        name: model.name,
        pullCommand: `ollama pull ${model.name}`,
        size: model.size,
      }));
      ollamaResult.error = `${missingModels.length} required models not available`;
    }
  }

  const providers = {
    ollama: ollamaResult,
    google: googleResult,
    openrouter: openrouterResult,
    openai: openaiResult,
  };

  // Determine overall status
  const healthyCount = Object.values(providers).filter(p => p.status === "healthy").length;
  const totalConfigured = Object.values(environment).filter(Boolean).length;

  let overall_status: "healthy" | "degraded" | "unhealthy";
  // Guard: when no providers are configured, system is unhealthy
  if (totalConfigured === 0) {
    overall_status = "unhealthy";
  } else if (healthyCount === totalConfigured) {
    overall_status = "healthy";
  } else if (healthyCount >= Math.ceil(totalConfigured / 2)) {
    overall_status = "degraded";
  } else {
    overall_status = "unhealthy";
  }

  const response: HealthCheckResponse = {
    timestamp: new Date().toISOString(),
    overall_status,
    providers,
    environment,
  };

  return NextResponse.json(response);
}
