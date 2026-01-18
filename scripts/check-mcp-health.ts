#!/usr/bin/env tsx

import { config } from "dotenv";
import { checkAllServersHealth } from "../src/lib/mcp/client";
import { validateMCPServerConfig, isMCPEnabled, getConfiguredMCPServers } from "../src/lib/mcp/servers";

// Load environment variables
config();

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

interface HealthResult {
  serverName: string;
  healthy: boolean;
  latency?: number;
  lastCheck: Date;
  errorMessage?: string;
  consecutiveFailures: number;
}

function printHeader() {
  console.log("");
  console.log(colorize("╔═══════════════════════════════════════════════════════════╗", "cyan"));
  console.log(colorize("║             MCP Server Health Check Results              ║", "cyan"));
  console.log(colorize("╚═══════════════════════════════════════════════════════════╝", "cyan"));
  console.log("");
}

function formatLatency(latency?: number): string {
  if (!latency) return "N/A";
  if (latency < 100) return colorize(`${latency}ms`, "green");
  if (latency < 500) return colorize(`${latency}ms`, "yellow");
  return colorize(`${latency}ms`, "red");
}

function printServerHealth(serverName: string, health: HealthResult) {
  const status = health.healthy ? "✓ Healthy" : "✗ Unhealthy";
  const statusColor = health.healthy ? "green" : "red";

  console.log(colorize(`${serverName}:`, "bright"));
  console.log(`  Status: ${colorize(status, statusColor)}`);
  console.log(`  Latency: ${formatLatency(health.latency)}`);
  console.log(`  Last Check: ${health.lastCheck.toLocaleString()}`);

  if (health.errorMessage) {
    console.log(`  Error: ${colorize(health.errorMessage, "red")}`);
  }

  if (health.consecutiveFailures > 0) {
    console.log(`  Consecutive Failures: ${colorize(health.consecutiveFailures.toString(), "yellow")}`);
  }

  console.log("");
}

function printSummary(results: Record<string, HealthResult>) {
  const servers = Object.values(results);
  const healthy = servers.filter(s => s.healthy).length;
  const total = servers.length;
  const totalFailures = servers.reduce((sum, s) => sum + s.consecutiveFailures, 0);

  console.log(colorize("╔═══════════════════════════════════════════════════════════╗", "cyan"));
  console.log(colorize(`║ Summary: ${healthy}/${total} servers healthy${' '.repeat(Math.max(0, 42 - `Summary: ${healthy}/${total} servers healthy`.length))}║`, "cyan"));
  if (totalFailures > 0) {
    console.log(colorize(`║ Total consecutive failures: ${totalFailures}${' '.repeat(Math.max(0, 32 - `Total consecutive failures: ${totalFailures}`.length))}║`, "yellow"));
  }
  console.log(colorize("╚═══════════════════════════════════════════════════════════╝", "cyan"));
}

function saveResultsToFile(results: Record<string, HealthResult>, filename: string) {
  const data = {
    timestamp: new Date().toISOString(),
    mcpEnabled: isMCPEnabled(),
    results,
    summary: {
      total: Object.keys(results).length,
      healthy: Object.values(results).filter(r => r.healthy).length,
      totalFailures: Object.values(results).reduce((sum, s) => sum + s.consecutiveFailures, 0),
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

  const outputFile = options.output as string;

  printHeader();

  // Check if MCP is enabled
  if (!isMCPEnabled()) {
    console.log(colorize("MCP services are disabled via MCP_ENABLED environment variable", "yellow"));
    console.log("");

    if (outputFile) {
      saveResultsToFile({}, outputFile);
    }

    process.exit(0);
  }

  // Validate configuration
  const configValidation = validateMCPServerConfig();
  if (!configValidation.valid) {
    console.log(colorize("Configuration validation failed:", "red"));
    configValidation.errors.forEach(error => {
      console.log(`  ${colorize("✗", "red")} ${error}`);
    });
    console.log("");

    if (outputFile) {
      const errorResults: Record<string, HealthResult> = {};
      configValidation.errors.forEach((error, index) => {
        errorResults[`config-error-${index}`] = {
          serverName: `config-error-${index}`,
          healthy: false,
          lastCheck: new Date(),
          errorMessage: error,
          consecutiveFailures: 1,
        };
      });
      saveResultsToFile(errorResults, outputFile);
    }

    process.exit(1);
  }

  try {
    // Check configured servers
    const configuredServers = getConfiguredMCPServers();

    if (Object.keys(configuredServers).length === 0) {
      console.log(colorize("No MCP servers configured", "yellow"));
      console.log("Configure at least one MCP server endpoint to enable health checks");
      console.log("");

      if (outputFile) {
        saveResultsToFile({}, outputFile);
      }

      process.exit(0);
    }

    console.log(colorize("Checking MCP server health...", "blue"));
    console.log("");

    const results = await checkAllServersHealth();

    // Print results for each server
    Object.entries(results).forEach(([serverName, health]) => {
      printServerHealth(serverName, health);
    });

    printSummary(results);

    if (outputFile) {
      saveResultsToFile(results, outputFile);
    }

    // Exit with appropriate code
    const hasUnhealthy = Object.values(results).some(r => !r.healthy);
    process.exit(hasUnhealthy ? 1 : 0);

  } catch (error) {
    console.error(colorize("Error checking MCP server health:", "red"), error);

    if (outputFile) {
      const errorResults: Record<string, HealthResult> = {
        script_error: {
          serverName: "script_error",
          healthy: false,
          lastCheck: new Date(),
          errorMessage: error instanceof Error ? error.message : String(error),
          consecutiveFailures: 1,
        },
      };
      saveResultsToFile(errorResults, outputFile);
    }

    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  console.error(colorize("Unexpected error:", "red"), error);
  process.exit(1);
});
