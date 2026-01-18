import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { getMCPConnection, returnMCPConnection } from '../client'
import {
  MCPToolExecutionContext,
  MCPUsageMetrics,
  MCPToolResponse,
  FetchConfig
} from '../types'
import {
  MCPExecutionError,
  MCPRateLimitError,
  MCPTimeoutError,
  MCPValidationError,
  createMCPExecutionError,
  createMCPRateLimitError,
  createMCPTimeoutError,
  createMCPValidationError
} from '../errors'
import { getMCPServerConfig } from '../servers'

// Rate limiting storage for fetch operations
interface FetchRateLimitEntry {
  requests: number[]
  lastCleanup: number
}

interface FetchUsageEntry {
  callCount: number
  totalExecutionTime: number
  errorCount: number
  lastUsed: Date
  cost: number
  bytesTransferred: number
}

// Rate limiting and usage tracking
const rateLimitStorage = new Map<string, FetchRateLimitEntry>()
const usageStorage = new Map<string, Map<string, FetchUsageEntry>>()

// Configuration constants
const RATE_LIMIT_WINDOW_MS = 60000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20 // 20 requests per minute for fetch (more restrictive due to bandwidth)
const RETRY_ATTEMPTS = 3
const RETRY_DELAY_BASE = 1000 // 1 second base delay
const MAX_TIMEOUT = 45000 // 45 seconds (longer for web scraping)
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
 * Check rate limit for fetch operations
 */
function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const key = `fetch-${userId}`

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
 * Track usage and cost for fetch operations
 */
function trackUsage(
  toolName: string,
  executionTime: number,
  success: boolean,
  cost: number = 0,
  bytesTransferred: number = 0
): void {
  const serverName = 'fetch'
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
      cost: 0,
      bytesTransferred: 0
    }
    serverUsage.set(toolName, toolUsage)
  }

  toolUsage.callCount++
  toolUsage.totalExecutionTime += executionTime
  toolUsage.lastUsed = new Date()
  // Use provided cost or compute based on bytes transferred and execution time
  const actualCost = cost || ((bytesTransferred / 1024 / 1024) * 0.01) + ((executionTime / 1000) * 0.001) // $0.01 per MB + $0.001 per second
  toolUsage.cost += actualCost
  toolUsage.bytesTransferred += bytesTransferred

  if (!success) {
    toolUsage.errorCount++
  }
}

/**
 * Get usage metrics for fetch
 */
export function getFetchUsageMetrics(): Record<string, MCPUsageMetrics> {
  const serverName = 'fetch'
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
      totalCost: usage.cost,
      bytesTransferred: usage.bytesTransferred
    }
  }

  return metrics
}

/**
 * Execute tool with retry logic and fallback strategies
 */
async function executeWithRetry<T>(
  operation: () => Promise<T>,
  context: MCPToolExecutionContext,
  userId: string
): Promise<T> {
  const startTime = Date.now()
  let lastError: Error | null = null

  // Check rate limit first
  const rateLimitCheck = checkRateLimit(userId)
  if (!rateLimitCheck.allowed) {
    throw createMCPRateLimitError(
      'fetch',
      context.toolName,
      Math.ceil((rateLimitCheck.resetTime - Date.now()) / 1000)
    )
  }

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

  // All retries failed
  throw lastError || new Error('Operation failed after retries')
}

/**
 * Check if an error is retryable for fetch operations
 */
function isRetryableError(error: any): boolean {
  // Don't retry validation errors or authentication errors
  if (
    error.name === 'MCPValidationError' ||
    error.name === 'MCPAuthenticationError'
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
    error.message?.includes('timeout') ||
    error.message?.includes('network') ||
    error.message?.includes('connection')
  )
}

/**
 * Validate URL format
 */
function validateUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Execute a fetch tool with proper error handling and connection management
 */
async function executeFetchTool(
  toolName: string,
  parameters: Record<string, any>,
  userId: string,
  timeout: number = MAX_TIMEOUT
): Promise<MCPToolResponse> {
  const startTime = Date.now()
  let client: Client | null = null

  try {
    // Get MCP connection
    client = await getMCPConnection('fetch')
    if (!client) {
      throw new MCPExecutionError('Failed to get MCP connection for fetch')
    }

    // Execute tool with timeout
    const result = await Promise.race([
      client.callTool({
        name: toolName,
        arguments: parameters
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(createMCPTimeoutError('fetch', timeout)), timeout)
      )
    ])

    const executionTime = Date.now() - startTime

    // Track bytes transferred if available
    const bytesTransferred = result?.contentLength || result?.size || 0

    return {
      success: true,
      data: result,
      executionTime,
      serverName: 'fetch',
      toolName
    }

  } catch (error) {
    const executionTime = Date.now() - startTime

    // Return connection to pool
    if (client) {
      try {
        await returnMCPConnection('fetch', client)
      } catch (returnError) {
        console.error('[Fetch] Error returning connection to pool:', returnError)
      }
    }

    // Always throw MCP errors for retry logic to work
    throw error instanceof Error && error.name.startsWith('MCP')
      ? error
      : createMCPExecutionError('fetch', toolName, error as Error)
  }
}

/**
 * Fetch URL content
 */
export async function fetchUrl(
  url: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    headers?: Record<string, string>
    body?: string
    followRedirects?: boolean
    userId: string
    timeout?: number
  }
): Promise<MCPToolResponse> {
  try {
    // Validate URL
    if (!validateUrl(url)) {
      throw createMCPValidationError('fetch', 'fetch_url', { url: 'Invalid URL format' })
    }

    const context: MCPToolExecutionContext = {
      serverName: 'fetch',
      toolName: 'fetch_url',
      parameters: {
        url,
        method: options.method || 'GET',
        headers: options.headers || {},
        body: options.body,
        followRedirects: options.followRedirects !== false
      },
      timeout: options.timeout || MAX_TIMEOUT,
      retryOnFailure: true,
      trackUsage: true
    }

    return await executeWithRetry(
      () => executeFetchTool('fetch_url', context.parameters, options.userId, context.timeout),
      context,
      options.userId
    )
  } catch (error) {
    // Normalize all errors to MCPToolResponse
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      executionTime: 0,
      serverName: 'fetch',
      toolName: 'fetch_url'
    }
  }
}

/**
 * Extract content from HTML
 */
export async function extractContent(
  html: string,
  options: {
    selector?: string
    extractType?: 'text' | 'html' | 'links' | 'images' | 'meta'
    userId: string
    timeout?: number
  }
): Promise<MCPToolResponse> {
  if (!html || html.trim().length === 0) {
    throw createMCPValidationError('fetch', 'extract_content', { html: 'HTML content is required' })
  }

  const context: MCPToolExecutionContext = {
    serverName: 'fetch',
    toolName: 'extract_content',
    parameters: {
      html,
      selector: options.selector,
      extractType: options.extractType || 'text'
    },
    timeout: options.timeout || MAX_TIMEOUT,
    retryOnFailure: true,
    trackUsage: true
  }

  return executeWithRetry(
    () => executeFetchTool('extract_content', context.parameters, options.userId, context.timeout),
    context,
    options.userId
  )
}

/**
 * Parse HTML content
 */
export async function parseHtml(
  html: string,
  options: {
    parseType?: 'dom' | 'json' | 'markdown'
    removeScripts?: boolean
    removeStyles?: boolean
    userId: string
    timeout?: number
  }
): Promise<MCPToolResponse> {
  if (!html || html.trim().length === 0) {
    throw createMCPValidationError('fetch', 'parse_html', { html: 'HTML content is required' })
  }

  const context: MCPToolExecutionContext = {
    serverName: 'fetch',
    toolName: 'parse_html',
    parameters: {
      html,
      parseType: options.parseType || 'dom',
      removeScripts: options.removeScripts !== false,
      removeStyles: options.removeStyles !== false
    },
    timeout: options.timeout || MAX_TIMEOUT,
    retryOnFailure: true,
    trackUsage: true
  }

  return executeWithRetry(
    () => executeFetchTool('parse_html', context.parameters, options.userId, context.timeout),
    context,
    options.userId
  )
}

/**
 * Fetch and extract content from URL in one operation
 */
export async function fetchAndExtract(
  url: string,
  options: {
    selector?: string
    extractType?: 'text' | 'html' | 'links' | 'images' | 'meta'
    followRedirects?: boolean
    userId: string
    timeout?: number
  }
): Promise<MCPToolResponse> {
  // Validate URL
  if (!validateUrl(url)) {
    throw createMCPValidationError('fetch', 'fetch_and_extract', { url: 'Invalid URL format' })
  }

  const context: MCPToolExecutionContext = {
    serverName: 'fetch',
    toolName: 'fetch_and_extract',
    parameters: {
      url,
      selector: options.selector,
      extractType: options.extractType || 'text',
      followRedirects: options.followRedirects !== false
    },
    timeout: options.timeout || MAX_TIMEOUT,
    retryOnFailure: true,
    trackUsage: true
  }

  return executeWithRetry(
    () => executeFetchTool('fetch_and_extract', context.parameters, options.userId, context.timeout),
    context,
    options.userId
  )
}

/**
 * Get fetch server configuration
 */
export function getFetchConfig(): FetchConfig | null {
  return getMCPServerConfig('fetch') as FetchConfig
}

/**
 * Check if fetch is available and healthy
 */
export async function isFetchAvailable(): Promise<boolean> {
  try {
    const client = await getMCPConnection('fetch')
    if (!client) return false

    await returnMCPConnection('fetch', client)
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
