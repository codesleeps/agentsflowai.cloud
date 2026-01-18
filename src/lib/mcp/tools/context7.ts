import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { getMCPConnection, returnMCPConnection } from '../client'
import {
  MCPToolExecutionContext,
  MCPUsageMetrics,
  MCPToolResponse,
  Context7Config
} from '../types'
import {
  MCPExecutionError,
  MCPRateLimitError,
  MCPTimeoutError,
  MCPToolNotFoundError,
  createMCPExecutionError,
  createMCPRateLimitError,
  createMCPTimeoutError,
  createMCPToolNotFoundError
} from '../errors'
import { getMCPServerConfig } from '../servers'

// Rate limiting storage similar to src/lib/rate-limiter.ts
interface Context7RateLimitEntry {
  requests: number[]
  lastCleanup: number
}

interface Context7UsageEntry {
  callCount: number
  totalExecutionTime: number
  errorCount: number
  lastUsed: Date
  cost: number
}

// Rate limiting and usage tracking
const rateLimitStorage = new Map<string, Context7RateLimitEntry>()
const usageStorage = new Map<string, Map<string, Context7UsageEntry>>()

// Configuration constants
const RATE_LIMIT_WINDOW_MS = 60000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30 // 30 requests per minute for context7
const RETRY_ATTEMPTS = 3
const RETRY_DELAY_BASE = 1000 // 1 second base delay
const MAX_TIMEOUT = 30000 // 30 seconds
const CLEANUP_INTERVAL = 5 * 60 * 1000 // 5 minutes

// Cleanup interval for rate limiting
const cleanupInterval = setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStorage.entries()) {
    if (now - entry.lastCleanup > CLEANUP_INTERVAL) {
      rateLimitStorage.delete(key)
    }
  }
}, CLEANUP_INTERVAL)

/**
 * Check rate limit for context7 operations
 */
function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const key = `context7-${userId}`

  let entry = rateLimitStorage.get(key)
  if (!entry) {
    entry = { requests: [], lastCleanup: now }
    rateLimitStorage.set(key, entry)
  }

  // Remove old requests outside the window
  const windowStart = now - RATE_LIMIT_WINDOW_MS
  entry.requests = entry.requests.filter(timestamp => timestamp > windowStart)
  entry.lastCleanup = now

  const currentRequests = entry.requests.length

  if (currentRequests >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: Math.min(...entry.requests) + RATE_LIMIT_WINDOW_MS
    }
  }

  // Add current request
  entry.requests.push(now)

  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - currentRequests - 1,
    resetTime: now + RATE_LIMIT_WINDOW_MS
  }
}

/**
 * Track usage and cost for context7 operations
 */
function trackUsage(
  toolName: string,
  executionTime: number,
  success: boolean,
  cost: number = 0
): void {
  const serverName = 'context7'
  let serverUsage = usageStorage.get(serverName)
  if (!serverUsage) {
    serverUsage = new Map()
    usageStorage.set(serverName, serverUsage)
  }

  let toolUsage = serverUsage.get(toolName)
  if (!toolUsage) {
    toolUsage = {
      callCount: 0,
      totalExecutionTime: 0,
      errorCount: 0,
      lastUsed: new Date(),
      cost: 0
    }
    serverUsage.set(toolName, toolUsage)
  }

  toolUsage.callCount++
  toolUsage.totalExecutionTime += executionTime
  toolUsage.lastUsed = new Date()
  // Use provided cost or compute based on execution time (basic pricing model)
  const actualCost = cost || (executionTime / 1000) * 0.001 // $0.001 per second
  toolUsage.cost += actualCost

  if (!success) {
    toolUsage.errorCount++
  }
}

/**
 * Get usage metrics for context7
 */
export function getContext7UsageMetrics(): Record<string, MCPUsageMetrics> {
  const serverName = 'context7'
  const serverUsage = usageStorage.get(serverName)
  if (!serverUsage) return {}

  const metrics: Record<string, MCPUsageMetrics> = {}

  for (const [toolName, usage] of serverUsage.entries()) {
    metrics[toolName] = {
      serverName,
      toolName,
      callCount: usage.callCount,
      totalExecutionTime: usage.totalExecutionTime,
      averageLatency: usage.totalExecutionTime / usage.callCount,
      errorCount: usage.errorCount,
      lastUsed: usage.lastUsed,
      totalCost: usage.cost
    }
  }

  return metrics
}

/**
 * Execute tool with retry logic and fallback strategies (inspired by ai-fallback-handler.ts)
 */
async function executeWithRetry(
  operation: () => Promise<MCPToolResponse>,
  context: MCPToolExecutionContext,
  userId: string
): Promise<MCPToolResponse> {
  const startTime = Date.now()
  let lastError: Error | null = null

  // Check rate limit first
  const rateLimitCheck = checkRateLimit(userId)
  if (!rateLimitCheck.allowed) {
    throw createMCPRateLimitError(
      'context7',
      context.toolName,
      Math.ceil((rateLimitCheck.resetTime - Date.now()) / 1000)
    )
  }

  // Primary server attempts with retries
  for (let attempt = 0; attempt < RETRY_ATTEMPTS; attempt++) {
    try {
      const result = await operation()

      // Check if result is MCPToolResponse with success: false
      if (result && typeof result === 'object' && 'success' in result && result.success === false) {
        const executionTime = Date.now() - startTime
        trackUsage(context.toolName, executionTime, false)

        // Treat success: false as retryable error
        const error = new Error((result as any).error || 'Tool execution failed')
        lastError = error

        // Check if error is retryable
        if (!isRetryableError(error)) {
          break
        }

        // Exponential backoff delay
        if (attempt < RETRY_ATTEMPTS - 1) {
          const delay = RETRY_DELAY_BASE * Math.pow(2, attempt)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
        continue
      }

      // Track successful usage
      const executionTime = Date.now() - startTime
      trackUsage(context.toolName, executionTime, true)

      return result
    } catch (error) {
      lastError = error as Error
      const executionTime = Date.now() - startTime

      // Track failed attempt
      trackUsage(context.toolName, executionTime, false)

      // Check if error is retryable
      if (!isRetryableError(error)) {
        break
      }

      // Exponential backoff delay
      if (attempt < RETRY_ATTEMPTS - 1) {
        const delay = RETRY_DELAY_BASE * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  // Try fallback servers if configured
  if (context.fallbackServers && context.fallbackServers.length > 0) {
    // Sort fallback servers by priority
    const sortedFallbacks = context.fallbackServers.sort((a, b) => a.priority - b.priority)

    for (const fallback of sortedFallbacks) {
      try {
        // Create fallback operation
        const fallbackOperation = async () => {
          // For now, assume fallback uses same executeContext7Tool but with different server
          // In practice, this would need server-specific logic
          const fallbackToolName = fallback.toolName || context.toolName
          const fallbackParams = { ...context.parameters, ...(fallback.parameters || {}) }

          return await executeContext7Tool(fallbackToolName, fallbackParams, userId, context.timeout)
        }

        const result = await fallbackOperation()

        // Track successful fallback usage
        const executionTime = Date.now() - startTime
        trackUsage(context.toolName, executionTime, true)

        return result
      } catch (error) {
        lastError = error as Error
        // Continue to next fallback
      }
    }
  }

  // All retries and fallbacks failed
  throw lastError || new Error('Operation failed after retries and fallbacks')
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: any): boolean {
  // Don't retry authentication errors, tool not found, or validation errors
  if (
    error.name === 'MCPAuthenticationError' ||
    error.name === 'MCPToolNotFoundError' ||
    error.name === 'MCPValidationError'
  ) {
    return false
  }

  // Retry on timeout, rate limit, server unavailable, or network errors
  return (
    error.name === 'MCPTimeoutError' ||
    error.name === 'MCPRateLimitError' ||
    error.name === 'MCPServerUnavailableError' ||
    error.message?.includes('ECONNREFUSED') ||
    error.message?.includes('ENOTFOUND') ||
    error.message?.includes('timeout')
  )
}

/**
 * Execute a context7 tool with proper error handling and connection management
 */
async function executeContext7Tool(
  toolName: string,
  parameters: Record<string, any>,
  userId: string,
  timeout: number = MAX_TIMEOUT
): Promise<MCPToolResponse> {
  const startTime = Date.now()
  let client: Client | null = null

  try {
    // Get MCP connection
    client = await getMCPConnection('context7')
    if (!client) {
      throw new MCPExecutionError('Failed to get MCP connection for context7')
    }

    // Execute tool with timeout
    const result = await Promise.race([
      client.callTool({
        name: toolName,
        arguments: parameters
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(createMCPTimeoutError('context7', timeout)), timeout)
      )
    ])

    const executionTime = Date.now() - startTime

    return {
      success: true,
      data: result,
      executionTime,
      serverName: 'context7',
      toolName
    }

  } catch (error) {
    const executionTime = Date.now() - startTime

    // Return connection to pool
    if (client) {
      try {
        await returnMCPConnection('context7', client)
      } catch (returnError) {
        console.error('[Context7] Error returning connection to pool:', returnError)
      }
    }

    // Always throw MCP errors for retry logic to work
    throw error instanceof Error && error.name.startsWith('MCP')
      ? error
      : createMCPExecutionError('context7', toolName, error as Error)
  }
}

/**
 * Search documentation using context7
 */
export async function searchDocumentation(
  query: string,
  options: {
    maxResults?: number
    sources?: string[]
    userId: string
    timeout?: number
  }
): Promise<MCPToolResponse> {
  try {
    const context: MCPToolExecutionContext = {
      serverName: 'context7',
      toolName: 'search',
      parameters: {
        query,
        maxResults: options.maxResults || 50,
        sources: options.sources || []
      },
      timeout: options.timeout || MAX_TIMEOUT,
      retryOnFailure: true,
      trackUsage: true
    }

    return await executeWithRetry(
      () => executeContext7Tool('search', context.parameters, options.userId, context.timeout),
      context,
      options.userId
    )
  } catch (error) {
    // Normalize all errors to MCPToolResponse
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      executionTime: 0,
      serverName: 'context7',
      toolName: 'search'
    }
  }
}

/**
 * Retrieve specific documentation content
 */
export async function retrieveDocumentation(
  documentId: string,
  options: {
    sections?: string[]
    userId: string
    timeout?: number
  }
): Promise<MCPToolResponse> {
  try {
    const context: MCPToolExecutionContext = {
      serverName: 'context7',
      toolName: 'retrieve',
      parameters: {
        documentId,
        sections: options.sections || []
      },
      timeout: options.timeout || MAX_TIMEOUT,
      retryOnFailure: true,
      trackUsage: true
    }

    return await executeWithRetry(
      () => executeContext7Tool('retrieve', context.parameters, options.userId, context.timeout),
      context,
      options.userId
    )
  } catch (error) {
    // Normalize all errors to MCPToolResponse
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      executionTime: 0,
      serverName: 'context7',
      toolName: 'retrieve'
    }
  }
}

/**
 * List available documentation sources
 */
export async function listDocumentationSources(
  options: {
    category?: string
    userId: string
    timeout?: number
  }
): Promise<MCPToolResponse> {
  try {
    const context: MCPToolExecutionContext = {
      serverName: 'context7',
      toolName: 'list_sources',
      parameters: {
        category: options.category || 'all'
      },
      timeout: options.timeout || MAX_TIMEOUT,
      retryOnFailure: true,
      trackUsage: true
    }

    return await executeWithRetry(
      () => executeContext7Tool('list_sources', context.parameters, options.userId, context.timeout),
      context,
      options.userId
    )
  } catch (error) {
    // Normalize all errors to MCPToolResponse
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      executionTime: 0,
      serverName: 'context7',
      toolName: 'list_sources'
    }
  }
}

/**
 * Get context7 server configuration
 */
export function getContext7Config(): Context7Config | null {
  return getMCPServerConfig('context7') as Context7Config
}

/**
 * Check if context7 is available and healthy
 */
export async function isContext7Available(): Promise<boolean> {
  try {
    const client = await getMCPConnection('context7')
    if (!client) return false

    await returnMCPConnection('context7', client)
    return true
  } catch {
    return false
  }
}

// Cleanup on process exit
process.on('SIGINT', () => {
  clearInterval(cleanupInterval)
})

process.on('SIGTERM', () => {
  clearInterval(cleanupInterval)
})
