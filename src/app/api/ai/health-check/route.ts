import { NextResponse } from "next/server";
import { handleOllamaProvider, handleOpenRouter, handleOpenAIProvider } from "../agents/route";
import { logModelUsage } from "@/server-lib/ai-usage-tracker";
import { AIAgent } from "@/shared/models/ai-agents";
import { APIKeyExpiredError } from "@/lib/api-errors";
import { getAllProviderStatuses } from "@/lib/env-validation";

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
    { provider: "openrouter", model: "z-ai/glm-4.5-air", priority: 2 },
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
  key_status?: "valid" | "expired" | "invalid" | "missing" | "unreachable";
  renewal_url?: string;
  env_var_name?: string;
  remediation_steps?: string[];
}

interface HealthCheckResponse {
  timestamp: string;
  overall_status: "healthy" | "degraded" | "unhealthy";
  providers: {
    ollama: ProviderStatus;
    openrouter: ProviderStatus;
    openai: ProviderStatus;
  };
  environment: {
    ollama_configured: boolean;
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
      case "openrouter":
        result = await handleOpenRouter(
          { ...TEST_AGENT, model },
          testMessage,
          [],
          TEST_AGENT.systemPrompt
        );
        break;
      case "openai":
        result = await handleOpenAIProvider(
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

    // Handle APIKeyExpiredError specifically
    if (error instanceof APIKeyExpiredError) {
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
        key_status: "expired",
        renewal_url: error.renewalUrl,
        env_var_name: error.envVarName,
        remediation_steps: [
          `Visit ${error.renewalUrl} to renew your API key`,
          `Update ${error.envVarName} in your environment variables`,
          "Restart the application after updating the key",
        ],
      };
    }

    // Handle missing key errors (detected during test)
    if (errorMessage.includes("not configured") || errorMessage.includes("API key")) {
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
        key_status: "missing",
      };
    }

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

async function getOpenRouterModels(): Promise<string[]> {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return [];

    const response = await fetch("https://openrouter.ai/api/v1/models", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const data = await response.json();
      return data.data?.map((m: any) => m.id) || [];
    }
    return [];
  } catch {
    return [];
  }
}

async function getOpenAIModels(): Promise<string[]> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return [];

    const response = await fetch("https://api.openai.com/v1/models", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const data = await response.json();
      return data.data?.map((m: any) => m.id) || [];
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
    openai_key_configured: !!process.env.OPENAI_API_KEY,
    openrouter_key_configured: !!process.env.OPENROUTER_API_KEY,
  };

  // Get cached startup validation data
  const startupValidation = getAllProviderStatuses();

  // Test all providers concurrently
  const [ollamaResult, openrouterResult, openaiResult] = await Promise.all([
    testProviderWithTimeout("ollama", "mistral:7b"),
    environment.openrouter_key_configured
      ? testProviderWithTimeout("openrouter", "z-ai/glm-4.5-air")
      : Promise.resolve<ProviderStatus>({ status: "unhealthy", model: "z-ai/glm-4.5-air", error: "OPENROUTER_API_KEY not configured", key_status: "missing" }),
    environment.openai_key_configured
      ? testProviderWithTimeout("openai", "gpt-4o-mini")
      : Promise.resolve<ProviderStatus>({ status: "unhealthy", model: "gpt-4o-mini", error: "OPENAI_API_KEY not configured", key_status: "missing" }),
  ]);

  // Fetch model lists concurrently for all providers
  const [ollamaModels, openrouterModels, openaiModels] = await Promise.all([
    getOllamaModels(),
    getOpenRouterModels(),
    getOpenAIModels(),
  ]);

  // Process Ollama models and check for missing required models
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

  // Process OpenRouter models
  if (openrouterModels.length > 0 && openrouterResult.status === "healthy") {
    openrouterResult.available_models = openrouterModels;
  } else if (openrouterResult.status !== "unhealthy" && environment.openrouter_key_configured) {
    const testedModel = "meta-llama/llama-3.3-70b-instruct:free";
    if (openrouterModels.length > 0 && !openrouterModels.includes(testedModel)) {
      openrouterResult.status = "degraded";
      openrouterResult.error = `Model ${testedModel} not available`;
      openrouterResult.available_models = openrouterModels;
    }
  }

  // Process OpenAI models
  if (openaiModels.length > 0 && openaiResult.status === "healthy") {
    openaiResult.available_models = openaiModels;
  } else if (openaiResult.status !== "unhealthy" && environment.openai_key_configured) {
    const testedModel = "gpt-4o-mini";
    if (openaiModels.length > 0 && !openaiModels.includes(testedModel)) {
      openaiResult.status = "degraded";
      openaiResult.error = `Model ${testedModel} not available`;
      openaiResult.available_models = openaiModels;
    }
  }

  // Merge startup validation data into provider results
  const ollamaValidation = startupValidation.get("Ollama");
  if (ollamaValidation && !ollamaResult.key_status) {
    ollamaResult.key_status = ollamaValidation.status;
    ollamaResult.env_var_name = ollamaValidation.envVarName;
    if (ollamaValidation.status !== "valid") {
      ollamaResult.remediation_steps = [
        ollamaValidation.message || "Check Ollama service status",
        "Ensure OLLAMA_BASE_URL is set correctly",
        "Verify Ollama is running: ollama serve",
      ];
    }
  }

  const openrouterValidation = startupValidation.get("OpenRouter");
  if (openrouterValidation && !openrouterResult.key_status) {
    openrouterResult.key_status = openrouterValidation.status;
    openrouterResult.renewal_url = openrouterValidation.renewalUrl;
    openrouterResult.env_var_name = openrouterValidation.envVarName;
    if (openrouterValidation.status === "expired" || openrouterValidation.status === "invalid") {
      openrouterResult.remediation_steps = [
        openrouterValidation.message || "API key validation failed",
        `Visit ${openrouterValidation.renewalUrl} to manage your API key`,
        `Update ${openrouterValidation.envVarName} in your environment variables`,
        "Restart the application after updating the key",
      ];
    } else if (openrouterValidation.status === "missing") {
      openrouterResult.remediation_steps = [
        `Obtain an API key from ${openrouterValidation.renewalUrl}`,
        `Set ${openrouterValidation.envVarName} in your environment variables`,
        "Restart the application after adding the key",
      ];
    }
  }

  const openaiValidation = startupValidation.get("OpenAI");
  if (openaiValidation && !openaiResult.key_status) {
    openaiResult.key_status = openaiValidation.status;
    openaiResult.renewal_url = openaiValidation.renewalUrl;
    openaiResult.env_var_name = openaiValidation.envVarName;
    if (openaiValidation.status === "expired" || openaiValidation.status === "invalid") {
      openaiResult.remediation_steps = [
        openaiValidation.message || "API key validation failed",
        `Visit ${openaiValidation.renewalUrl} to manage your API key`,
        `Update ${openaiValidation.envVarName} in your environment variables`,
        "Restart the application after updating the key",
      ];
    } else if (openaiValidation.status === "missing") {
      openaiResult.remediation_steps = [
        `Obtain an API key from ${openaiValidation.renewalUrl}`,
        `Set ${openaiValidation.envVarName} in your environment variables`,
        "Restart the application after adding the key",
      ];
    }
  }

  const providers = {
    ollama: ollamaResult,
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
