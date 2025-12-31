#!/usr/bin/env tsx

import { config } from "dotenv";
import { handleAnthropicProvider, handleGoogleProvider, handleOllamaProvider, handleOpenRouterProvider, handleOpenAIProvider } from "../src/app/api/ai/agents/route";
import { logDiagnosticTest } from "../src/server-lib/ai-usage-tracker";
import { AIAgent } from "../src/shared/models/ai-agents";

// Load environment variables
config();

// Test agent configuration for diagnostics
const TEST_AGENT: AIAgent = {
  id: "health-check-test",
  name: "Health Check Test Agent",
  description: "Test agent for provider diagnostics",
  icon: "🔧",
  category: "fast-chat",
  systemPrompt: "You are a test agent. Respond with 'OK' to any message.",
  capabilities: ["Test responses"],
  model: "mistral:latest",
  provider: "ollama",
  supportedProviders: [
    { provider: "ollama", model: "mistral:latest", priority: 1 },
    { provider: "google", model: "gemini-2.0-flash", priority: 2 },
    { provider: "anthropic", model: "claude-3-5-sonnet-20241022", priority: 3 },
    { provider: "openai", model: "gpt-4-turbo", priority: 4 },
    { provider: "openrouter", model: "anthropic/claude-3.5-sonnet", priority: 5 },
  ],
  defaultProvider: "ollama",
  costTier: "free",
  isActive: true,
};

interface TestResult {
  provider: string;
  model: string;
  status: "success" | "failed";
  latency_ms: number;
  error?: string;
  available_models?: string[];
}

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
};

function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

async function testProvider(providerName: string, model: string, retries: number = 3): Promise<TestResult> {
  const startTime = Date.now();

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      let result;

      const testMessage = "Hello, respond with 'OK'";
      const testMessages = [
        {
          role: "user" as const,
          content: testMessage,
          agentId: "health-check-test",
          id: `test-msg-${Date.now()}`,
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
        case "anthropic":
          result = await handleAnthropicProvider(
            { ...TEST_AGENT, model },
            testMessages,
            TEST_AGENT.systemPrompt
          );
          break;
        case "openai":
          result = await handleOpenAIProvider(
            { ...TEST_AGENT, model },
            testMessages,
            TEST_AGENT.systemPrompt
          );
          break;
        case "openrouter":
          result = await handleOpenRouterProvider(
            { ...TEST_AGENT, model },
            testMessages,
            TEST_AGENT.systemPrompt
          );
          break;
        default:
          throw new Error(`Unknown provider: ${providerName}`);
      }

      const latency = Date.now() - startTime;

      // Log successful diagnostic
      await logDiagnosticTest({
        provider: providerName,
        model,
        status: "success",
        latency_ms: latency,
        test_type: "cli",
      });

      return {
        provider: providerName,
        model,
        status: "success",
        latency_ms: latency,
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (attempt === retries) {
        // Log failed diagnostic
        await logDiagnosticTest({
          provider: providerName,
          model,
          status: "failed",
          latency_ms: latency,
          error_message: errorMessage,
          test_type: "cli",
        });

        return {
          provider: providerName,
          model,
          status: "failed",
          latency_ms: latency,
          error: errorMessage,
        };
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // This should never be reached, but TypeScript needs it
  return {
    provider: providerName,
    model,
    status: "failed",
    latency_ms: 0,
    error: "Unexpected error",
  };
}

async function getOllamaModels(): Promise<string[]> {
  try {
    const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
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

async function testAllProviders(specificProvider?: string): Promise<TestResult[]> {
  const providers = [
    { name: "ollama", model: "mistral:latest", envCheck: () => true },
    { name: "google", model: "gemini-2.0-flash", envCheck: () => !!process.env.GOOGLE_API_KEY },
    { name: "anthropic", model: "claude-3-5-sonnet-20241022", envCheck: () => !!process.env.ANTHROPIC_API_KEY },
    { name: "openai", model: "gpt-4-turbo", envCheck: () => !!process.env.OPENAI_API_KEY },
    { name: "openrouter", model: "anthropic/claude-3.5-sonnet", envCheck: () => !!process.env.OPENROUTER_API_KEY },
  ];

  const results: TestResult[] = [];

  for (const provider of providers) {
    if (specificProvider && provider.name !== specificProvider) continue;

    console.log(colorize(`Testing ${provider.name}...`, "cyan"));

    if (!provider.envCheck()) {
      console.log(colorize(`  ✗ ${provider.name}: Not configured (API key missing)`, "red"));
      results.push({
        provider: provider.name,
        model: provider.model,
        status: "failed",
        latency_ms: 0,
        error: "API key not configured",
      });
      continue;
    }

    const result = await testProvider(provider.name, provider.model);

    if (result.status === "success") {
      console.log(colorize(`  ✓ ${provider.name}: Connected (${result.latency_ms}ms)`, "green"));

      // Get available models for Ollama
      if (provider.name === "ollama") {
        const models = await getOllamaModels();
        if (models.length > 0) {
          console.log(colorize(`    Models: ${models.slice(0, 3).join(", ")}${models.length > 3 ? "..." : ""}`, "blue"));
          result.available_models = models;
        }
      }
    } else {
      console.log(colorize(`  ✗ ${provider.name}: Failed (${result.latency_ms}ms)`, "red"));
      console.log(colorize(`    Error: ${result.error}`, "red"));
    }

    results.push(result);
  }

  return results;
}

function printHeader() {
  console.log("");
  console.log(colorize("╔═══════════════════════════════════════════════════════════╗", "cyan"));
  console.log(colorize("║           AI Provider Diagnostics Test Results           ║", "cyan"));
  console.log(colorize("╚═══════════════════════════════════════════════════════════╝", "cyan"));
  console.log("");
}

function printSummary(results: TestResult[]) {
  const healthy = results.filter(r => r.status === "success").length;
  const total = results.length;

  console.log("");
  console.log(colorize("╔═══════════════════════════════════════════════════════════╗", "cyan"));
  console.log(colorize(`║ Summary: ${healthy}/${total} providers healthy${' '.repeat(Math.max(0, 42 - `Summary: ${healthy}/${total} providers healthy`.length))}║`, "cyan"));
  console.log(colorize("╚═══════════════════════════════════════════════════════════╝", "cyan"));
}

function saveResultsToFile(results: TestResult[], filename: string) {
  const data = {
    timestamp: new Date().toISOString(),
    results,
    summary: {
      total: results.length,
      healthy: results.filter(r => r.status === "success").length,
      failed: results.filter(r => r.status === "failed").length,
    },
  };

  require("fs").writeFileSync(filename, JSON.stringify(data, null, 2));
  console.log(colorize(`Results saved to ${filename}`, "green"));
}

async function main() {
  const args = process.argv.slice(2);
  const options: { [key: string]: string | boolean } = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      if (args[i + 1] && !args[i + 1].startsWith("--")) {
        options[key] = args[i + 1];
        i++;
      } else {
        options[key] = true;
      }
    }
  }

  const specificProvider = options.provider as string;
  const verbose = options.verbose as boolean;
  const outputFile = options.output as string;

  printHeader();

  try {
    const results = await testAllProviders(specificProvider);

    if (verbose) {
      console.log("\nDetailed Results:");
      console.table(results.map(r => ({
        Provider: r.provider,
        Model: r.model,
        Status: r.status,
        Latency: `${r.latency_ms}ms`,
        Error: r.error || "N/A",
      })));
    }

    printSummary(results);

    if (outputFile) {
      saveResultsToFile(results, outputFile);
    }

    // Exit with appropriate code
    const hasFailures = results.some(r => r.status === "failed");
    process.exit(hasFailures ? 1 : 0);

  } catch (error) {
    console.error(colorize("Error running diagnostics:", "red"), error);
    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  console.error(colorize("Unexpected error:", "red"), error);
  process.exit(1);
});