import { z } from 'zod'
import {
  MCPServerRegistry,
  Context7Config,
  FetchConfig,
  PlaywrightConfig,
  FileSystemConfig,
  context7ConfigSchema,
  fetchConfigSchema,
  playwrightConfigSchema
} from './types'

// Environment variable validation schema
const mcpEnvSchema = z.object({
  MCP_CONTEXT7_ENDPOINT: z.string().url().optional(),
  MCP_CONTEXT7_API_KEY: z.string().optional(),
  MCP_FETCH_ENDPOINT: z.string().url().optional(),
  MCP_PLAYWRIGHT_ENDPOINT: z.string().url().optional(),
  MCP_ENABLED: z.string().optional().default('true').transform(val => val !== 'false')
})

// Parse environment variables
const env = mcpEnvSchema.parse(process.env)

// Fallback server configurations
export const MCP_FALLBACK_CHAINS = {
  context7: [
    {
      serverName: 'fetch',
      toolName: 'fetch_and_extract',
      parameters: { extractType: 'text' },
      priority: 1
    }
  ],
  fetch: [
    {
      serverName: 'context7',
      toolName: 'search',
      parameters: {},
      priority: 1
    }
  ],
  playwright: [
    {
      serverName: 'fetch',
      toolName: 'fetch_url',
      parameters: {},
      priority: 1
    }
  ],
  filesystem: [] // No fallbacks for filesystem operations
}

// MCP Server Configurations
export const MCP_SERVERS: MCPServerRegistry & { filesystem: FileSystemConfig } = {
  context7: {
    name: 'context7',
    endpoint: env.MCP_CONTEXT7_ENDPOINT || 'http://localhost:3100',
    apiKey: env.MCP_CONTEXT7_API_KEY,
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
    poolSize: 5,
    capabilities: ['search', 'retrieve', 'list_sources'],
    healthCheckEndpoint: `${env.MCP_CONTEXT7_ENDPOINT || 'http://localhost:3100'}/health`,
    searchCapabilities: ['documentation', 'code', 'api_reference'],
    maxResults: 50
  },
  fetch: {
    name: 'fetch',
    endpoint: env.MCP_FETCH_ENDPOINT || 'http://localhost:3200',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
    poolSize: 5,
    capabilities: ['fetch', 'scrape', 'extract'],
    healthCheckEndpoint: `${env.MCP_FETCH_ENDPOINT || 'http://localhost:3200'}/health`,
    maxConcurrentRequests: 10,
    userAgent: 'AgentsFlowAI/1.0'
  },
  playwright: {
    name: 'playwright',
    endpoint: env.MCP_PLAYWRIGHT_ENDPOINT || 'http://localhost:3300',
    timeout: 60000,
    retryAttempts: 2,
    retryDelay: 2000,
    poolSize: 3,
    capabilities: ['navigate', 'click', 'type', 'screenshot', 'extract'],
    healthCheckEndpoint: `${env.MCP_PLAYWRIGHT_ENDPOINT || 'http://localhost:3300'}/health`,
    browserType: 'chromium',
    headless: true,
    viewport: { width: 1920, height: 1080 }
  },
  filesystem: {
    name: 'filesystem',
    endpoint: 'local',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
    poolSize: 10,
    capabilities: ['read_file', 'write_file', 'create_file', 'delete_file', 'list_directory', 'get_stats'],
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedDirectories: ['/src', '/public', '/components', '/lib', '/utils', '/styles', '/pages', '/app'],
    backupDirectory: '.backups',
    rateLimit: {
      windowMs: 60000,
      maxRequests: 50
    }
  }
}

// Validation function for MCP server configurations
export function validateMCPServerConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  try {
    // Validate Context7 config
    context7ConfigSchema.parse(MCP_SERVERS.context7)
  } catch (error) {
    errors.push(`Context7 configuration validation failed: ${error}`)
  }

  try {
    // Validate Fetch config
    fetchConfigSchema.parse(MCP_SERVERS.fetch)
  } catch (error) {
    errors.push(`Fetch configuration validation failed: ${error}`)
  }

  try {
    // Validate Playwright config
    playwrightConfigSchema.parse(MCP_SERVERS.playwright)
  } catch (error) {
    errors.push(`Playwright configuration validation failed: ${error}`)
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

// Get server configuration by name
export function getMCPServerConfig(serverName: keyof MCPServerRegistry) {
  return MCP_SERVERS[serverName]
}

// Get all server configurations
export function getAllMCPServerConfigs(): MCPServerRegistry {
  return MCP_SERVERS
}

// Get configured servers (filter out servers without proper configuration)
export function getConfiguredMCPServers(): Partial<MCPServerRegistry> {
  const configured: Partial<MCPServerRegistry> = {}

  // Context7 requires both endpoint and API key
  if (env.MCP_CONTEXT7_ENDPOINT && env.MCP_CONTEXT7_API_KEY) {
    configured.context7 = MCP_SERVERS.context7
  }

  // Fetch only requires endpoint
  if (env.MCP_FETCH_ENDPOINT) {
    configured.fetch = MCP_SERVERS.fetch
  }

  // Playwright only requires endpoint
  if (env.MCP_PLAYWRIGHT_ENDPOINT) {
    configured.playwright = MCP_SERVERS.playwright
  }

  return configured
}

// Check if MCP is enabled
export function isMCPEnabled(): boolean {
  return env.MCP_ENABLED
}

// Get server capabilities
export function getServerCapabilities(serverName: keyof MCPServerRegistry): string[] {
  return MCP_SERVERS[serverName].capabilities
}

// Get server health check endpoint
export function getServerHealthEndpoint(serverName: keyof MCPServerRegistry): string | undefined {
  return MCP_SERVERS[serverName].healthCheckEndpoint
}

// Configuration metadata for each server
export const MCP_SERVER_METADATA = {
  context7: {
    description: 'Documentation and code search server',
    version: '1.0.0',
    tools: ['search', 'retrieve', 'list_sources'],
    rateLimit: '100 requests/minute',
    costEstimate: '$0.001 per search'
  },
  fetch: {
    description: 'Web scraping and data extraction server',
    version: '1.0.0',
    tools: ['fetch_page', 'extract_data', 'scrape_urls'],
    rateLimit: '50 requests/minute',
    costEstimate: '$0.002 per page'
  },
  playwright: {
    description: 'Browser automation server',
    version: '1.0.0',
    tools: ['navigate', 'click', 'type', 'screenshot', 'extract_text'],
    rateLimit: '20 requests/minute',
    costEstimate: '$0.005 per automation'
  },
  filesystem: {
    description: 'Local file system operations',
    version: '1.0.0',
    tools: ['read_file', 'write_file', 'create_file', 'delete_file', 'list_directory', 'get_stats'],
    rateLimit: '50 requests/minute',
    costEstimate: '$0.0000001 per byte'
  }
} as const

// Export types for convenience
export type { Context7Config, FetchConfig, PlaywrightConfig, FileSystemConfig }
