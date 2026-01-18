import { z } from 'zod'

// Core MCP Types
export interface MCPServerConfig {
  name: string
  endpoint: string
  apiKey?: string
  timeout: number
  retryAttempts: number
  retryDelay: number
  poolSize: number
  capabilities: string[]
  healthCheckEndpoint?: string
}

export interface MCPConnectionStatus {
  connected: boolean
  lastConnected?: Date
  lastDisconnected?: Date
  errorMessage?: string
  reconnectAttempts: number
}

export interface MCPHealthCheck {
  serverName: string
  healthy: boolean
  latency?: number
  lastCheck: Date
  errorMessage?: string
  consecutiveFailures: number
}

export interface MCPToolCall {
  serverName: string
  toolName: string
  parameters: Record<string, any>
  timeout?: number
}

export interface MCPToolResponse {
  success: boolean
  data?: any
  error?: string
  executionTime: number
  serverName: string
  toolName: string
}

// Server-Specific Types
export interface Context7Config extends MCPServerConfig {
  searchCapabilities: string[]
  maxResults: number
}

export interface FetchConfig extends MCPServerConfig {
  maxConcurrentRequests: number
  userAgent?: string
}

export interface PlaywrightConfig extends MCPServerConfig {
  browserType: 'chromium' | 'firefox' | 'webkit'
  headless: boolean
  viewport?: { width: number; height: number }
}

// Connection Pool Types
export interface MCPConnection {
  id: string
  serverName: string
  client: any // MCP client instance
  createdAt: Date
  lastUsed: Date
  status: 'active' | 'idle' | 'closed'
}

export interface MCPConnectionPool {
  serverName: string
  connections: MCPConnection[]
  maxSize: number
  activeCount: number
  idleCount: number
}

// Zod Schemas for Validation
export const mcpServerConfigSchema = z.object({
  name: z.string().min(1),
  endpoint: z.string().url(),
  apiKey: z.string().optional(),
  timeout: z.number().positive().default(30000),
  retryAttempts: z.number().int().nonnegative().default(3),
  retryDelay: z.number().positive().default(1000),
  poolSize: z.number().int().positive().default(5),
  capabilities: z.array(z.string()).default([]),
  healthCheckEndpoint: z.string().url().optional()
})

export const context7ConfigSchema = mcpServerConfigSchema.extend({
  searchCapabilities: z.array(z.string()).default(['search', 'retrieve']),
  maxResults: z.number().int().positive().default(50)
})

export const fetchConfigSchema = mcpServerConfigSchema.extend({
  maxConcurrentRequests: z.number().int().positive().default(10),
  userAgent: z.string().optional()
})

export const playwrightConfigSchema = mcpServerConfigSchema.extend({
  browserType: z.enum(['chromium', 'firefox', 'webkit']).default('chromium'),
  headless: z.boolean().default(true),
  viewport: z.object({
    width: z.number().positive(),
    height: z.number().positive()
  }).optional()
})

// MCP Server Registry Type
export interface MCPServerRegistry {
  context7: Context7Config
  fetch: FetchConfig
  playwright: PlaywrightConfig
}

// Event Types
export interface MCPConnectionEvent {
  serverName: string
  type: 'connected' | 'disconnected' | 'error' | 'reconnecting'
  timestamp: Date
  details?: any
}

export interface MCPHealthEvent {
  serverName: string
  healthy: boolean
  latency?: number
  timestamp: Date
  error?: string
}

// Configuration Types
export interface MCPGlobalConfig {
  enabled: boolean
  connectionTimeout: number
  healthCheckInterval: number
  circuitBreakerThreshold: number
  circuitBreakerResetTimeout: number
}

export const mcpGlobalConfigSchema = z.object({
  enabled: z.boolean().default(true),
  connectionTimeout: z.number().positive().default(30000),
  healthCheckInterval: z.number().positive().default(30000),
  circuitBreakerThreshold: z.number().int().positive().default(3),
  circuitBreakerResetTimeout: z.number().positive().default(60000)
})

// Tool Execution Context
export interface MCPToolExecutionContext {
  serverName: string
  toolName: string
  parameters: Record<string, any>
  timeout?: number
  retryOnFailure: boolean
  trackUsage: boolean
}

// Usage Tracking Types
export interface MCPUsageMetrics {
  serverName: string
  toolName: string
  callCount: number
  totalExecutionTime: number
  averageLatency: number
  errorCount: number
  lastUsed: Date
}

export interface MCPServerMetrics {
  serverName: string
  uptime: number
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  lastHealthCheck: Date
  circuitBreakerState: 'closed' | 'open' | 'half-open'
}
