#!/usr/bin/env tsx

import { config } from "dotenv";
import { getMCPConnection, returnMCPConnection } from "../src/lib/mcp/client";
import { validateMCPServerConfig, isMCPEnabled, getConfiguredMCPServers, getServerCapabilities } from "../src/lib/mcp/servers";

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

interface ConnectionTestResult {
  serverName: string;
  connectionSuccessful: boolean;
  latency?: number;
  toolsAvailable?: string[];
  errorMessage?: string;
  testTime: Date;
}

function printHeader() {
  console.log("");
  console.log(colorize("╔═══════════════════════════════════════════════════════════╗", "cyan"));
  console.log(colorize("║           MCP Server Connection Test Results             ║", "cyan"));
  console.log(colorize("╚═══════════════════════════════════════════════════════════╝", "cyan"));
  console.log("");
}

function formatLatency(latency?: number): string {
  if (!latency) return "N/A";
  if (latency < 100) return colorize(`${latency}ms`, "green");
  if (latency < 500) return colorize(`${latency}ms`, "yellow");
  return colorize(`${latency}ms`, "red");
}

async function testServerConnection(serverName: string): Promise<ConnectionTestResult> {
  const result: ConnectionTestResult = {
    serverName,
    connectionSuccessful: false,
    testTime: new Date(),
  };

  try {
    const startTime = Date.now();

    // Attempt to get a connection
    const client = await getMCPConnection(serverName);

    if (!client) {
      result.errorMessage = "No connection established (MCP may be disabled)";
      return result;
    }

    const connectionTime = Date.now() - startTime;
    result.latency = connectionTime;

    // Basic connection test - just getting a connection is enough to verify it works
    // Tool listing would require more complex MCP protocol handling
    result.connectionSuccessful = true;
    result.toolsAvailable = []; // Placeholder - would need MCP protocol implementation

    // Return the connection to the pool
    await returnMCPConnection(serverName, client);

  } catch (error) {
    result.errorMessage = error instanceof Error ? error.message : String(error);
  }

  return result;
}

function printServerTestResult(result: ConnectionTestResult) {
  const status = result.connectionSuccessful ? "✓ Connected" : "✗ Failed";
  const statusColor = result.connectionSuccessful ? "green" : "red";

  console.log(colorize(`${result.serverName}:`, "bright"));
  console.log(`  Status: ${colorize(status, statusColor)}`);
  console.log(`  Latency: ${formatLatency(result.latency)}`);
  console.log(`  Test Time: ${result.testTime.toLocaleString()}`);

  if (result.toolsAvailable) {
    console.log(`  Tools Available: ${result.toolsAvailable.length}`);
    if (result.toolsAvailable.length > 0 && result.toolsAvailable.length <= 10) {
      console.log(`    ${colorize(result.toolsAvailable.join(", "), "blue")}`);
    } else if (result.toolsAvailable.length > 10) {
      console.log(`    ${colorize(result.toolsAvailable.slice(0, 10).join(", ") + "...", "blue")}`);
    }
  }

  if (result.errorMessage) {
    console.log(`  Error: ${colorize(result.errorMessage, "red")}`);
  }

  console.log("");
}

function printSummary(results: ConnectionTestResult[]) {
  const connected = results.filter(r => r.connectionSuccessful).length;
  const total = results.length;
  const totalTools = results.reduce((sum, r) => sum + (r.toolsAvailable?.length || 0), 0);

  console.log(colorize("╔═══════════════════════════════════════════════════════════╗", "cyan"));
  console.log(colorize(`║ Summary: ${connected}/${total} servers connected${' '.repeat(Math.max(0, 40 - `Summary: ${connected}/${total} servers connected`.length))}║`, "cyan"));
  console.log(colorize(`║ Total tools available: ${totalTools}${' '.repeat(Math.max(0, 35 - `Total tools available: ${totalTools}`.length))}║`, "blue"));
  console.log(colorize("╚═══════════════════════════════════════════════════════════╝", "cyan"));
}

function saveResultsToFile(results: ConnectionTestResult[], filename: string) {
  const data = {
    timestamp: new Date().toISOString(),
    mcpEnabled: isMCPEnabled(),
    results,
    summary: {
      total: results.length,
      connected: results.filter(r => r.connectionSuccessful).length,
      totalTools: results.reduce((sum, r) => sum + (r.toolsAvailable?.length || 0), 0),
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

  const specificServer = options.server as string;
  const outputFile = options.output as string;

  printHeader();

  // Check if MCP is enabled
  if (!isMCPEnabled()) {
    console.log(colorize("MCP services are disabled via MCP_ENABLED environment variable", "yellow"));
    console.log("");

    if (outputFile) {
      saveResultsToFile([], outputFile);
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
      const errorResults: ConnectionTestResult[] = configValidation.errors.map((error, index) => ({
        serverName: `config-error-${index}`,
        connectionSuccessful: false,
        errorMessage: error,
        testTime: new Date(),
      }));
      saveResultsToFile(errorResults, outputFile);
    }

    process.exit(1);
  }

  try {
    // Get servers to test
    const configuredServers = getConfiguredMCPServers();
    const serversToTest = specificServer
      ? (configuredServers[specificServer as keyof typeof configuredServers] ? [specificServer] : [])
      : Object.keys(configuredServers);

    if (serversToTest.length === 0) {
      if (specificServer) {
        console.log(colorize(`Server '${specificServer}' is not configured or available`, "red"));
      } else {
        console.log(colorize("No MCP servers configured", "yellow"));
        console.log("Configure at least one MCP server endpoint to enable connection tests");
      }
      console.log("");

      if (outputFile) {
        saveResultsToFile([], outputFile);
      }

      process.exit(0);
    }

    console.log(colorize("Testing MCP server connections...", "blue"));
    console.log("");

    const results: ConnectionTestResult[] = [];

    // Test each server
    for (const serverName of serversToTest) {
      console.log(colorize(`Testing connection to ${serverName}...`, "cyan"));
      const result = await testServerConnection(serverName);
      results.push(result);
      printServerTestResult(result);
    }

    printSummary(results);

    if (outputFile) {
      saveResultsToFile(results, outputFile);
    }

    // Exit with appropriate code
    const hasFailures = results.some(r => !r.connectionSuccessful);
    process.exit(hasFailures ? 1 : 0);

  } catch (error) {
    console.error(colorize("Error testing MCP connections:", "red"), error);

    if (outputFile) {
      const errorResults: ConnectionTestResult[] = [{
        serverName: "script_error",
        connectionSuccessful: false,
        errorMessage: error instanceof Error ? error.message : String(error),
        testTime: new Date(),
      }];
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
