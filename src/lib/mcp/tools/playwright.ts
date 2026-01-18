import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { getMCPConnection, returnMCPConnection } from '../client'
import {
  MCPToolExecutionContext,
  MCPUsageMetrics,
  MCPToolResponse,
  PlaywrightConfig
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

// Rate limiting storage for playwright operations
interface PlaywrightRateLimitEntry {
  requests: number[]
  lastCleanup: number
}

interface PlaywrightUsageEntry {
  callCount: number
  totalExecutionTime: number
  errorCount: number
  lastUsed: Date
  cost: number
  screenshotsTaken: number
}

// Rate limiting and usage tracking
const rateLimitStorage = new Map<string, PlaywrightRateLimitEntry>()
const usageStorage = new Map<string, Map<string, PlaywrightUsageEntry>>()

// Configuration constants
const RATE_LIMIT_WINDOW_MS = 60000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10 // 10 requests per minute for playwright (resource intensive)
const RETRY_ATTEMPTS = 2 // Fewer retries for browser automation
const RETRY_DELAY_BASE = 2000 // 2 second base delay (longer for browser operations)
const MAX_TIMEOUT = 60000 // 60 seconds (browser operations can be slow)
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
 * Check rate limit for playwright operations
 */
function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const key = `playwright-${userId}`

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
 * Track usage and cost for playwright operations
 */
function trackUsage(
  toolName: string,
  executionTime: number,
  success: boolean,
  cost: number = 0,
  screenshotsTaken: number = 0
): void {
  const serverName = 'playwright'
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
      screenshotsTaken: 0
    }
    serverUsage.set(toolName, toolUsage)
  }

  toolUsage.callCount++
  toolUsage.totalExecutionTime += executionTime
  toolUsage.lastUsed = new Date()
  // Use provided cost or compute based on screenshots taken and execution time
  const actualCost = cost || (screenshotsTaken * 0.005) + ((executionTime / 1000) * 0.002) // $0.005 per screenshot + $0.002 per second
  toolUsage.cost += actualCost
  toolUsage.screenshotsTaken += screenshotsTaken

  if (!success) {
    toolUsage.errorCount++
  }
}

/**
 * Get usage metrics for playwright
 */
export function getPlaywrightUsageMetrics(): Record<string, MCPUsageMetrics> {
  const serverName = 'playwright'
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
      screenshotsTaken: usage.screenshotsTaken
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
      'playwright',
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
 * Check if an error is retryable for playwright operations
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
    error.message?.includes('browser') ||
    error.message?.includes('page crash')
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
 * Execute a playwright tool with proper error handling and connection management
 */
async function executePlaywrightTool(
  toolName: string,
  parameters: Record<string, any>,
  userId: string,
  timeout: number = MAX_TIMEOUT
): Promise<MCPToolResponse> {
  const startTime = Date.now()
  let client: Client | null = null

  try {
    // Get MCP connection
    client = await getMCPConnection('playwright')
    if (!client) {
      throw new MCPExecutionError('Failed to get MCP connection for playwright')
    }

    // Execute tool with timeout
    const result = await Promise.race([
      client.callTool({
        name: toolName,
        arguments: parameters
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(createMCPTimeoutError('playwright', timeout)), timeout)
      )
    ])

    const executionTime = Date.now() - startTime

    // Track screenshots if taken
    const screenshotsTaken = result?.screenshot ? 1 : 0

    return {
      success: true,
      data: result,
      executionTime,
      serverName: 'playwright',
      toolName
    }

  } catch (error) {
    const executionTime = Date.now() - startTime

    // Return connection to pool
    if (client) {
      try {
        await returnMCPConnection('playwright', client)
      } catch (returnError) {
        console.error('[Playwright] Error returning connection to pool:', returnError)
      }
    }

    // Always throw MCP errors for retry logic to work
    throw error instanceof Error && error.name.startsWith('MCP')
      ? error
      : createMCPExecutionError('playwright', toolName, error as Error)
  }
}

/**
 * Navigate to a URL in the browser
 */
export async function navigateToUrl(
  url: string,
  options: {
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle'
    timeout?: number
    userId: string
  }
): Promise<MCPToolResponse> {
  // Validate URL
  if (!validateUrl(url)) {
    throw createMCPValidationError('playwright', 'navigate', { url: 'Invalid URL format' })
  }

  const context: MCPToolExecutionContext = {
    serverName: 'playwright',
    toolName: 'navigate',
    parameters: {
      url,
      waitUntil: options.waitUntil || 'load',
      timeout: options.timeout || 30000
    },
    timeout: options.timeout || MAX_TIMEOUT,
    retryOnFailure: true,
    trackUsage: true
  }

  return executeWithRetry(
    () => executePlaywrightTool('navigate', context.parameters, options.userId, context.timeout),
    context,
    options.userId
  )
}

/**
 * Take a screenshot of the current page
 */
export async function takeScreenshot(
  options: {
    selector?: string
    fullPage?: boolean
    format?: 'png' | 'jpeg'
    quality?: number
    userId: string
    timeout?: number
  }
): Promise<MCPToolResponse> {
  const context: MCPToolExecutionContext = {
    serverName: 'playwright',
    toolName: 'screenshot',
    parameters: {
      selector: options.selector,
      fullPage: options.fullPage || false,
      format: options.format || 'png',
      quality: options.quality || 80
    },
    timeout: options.timeout || MAX_TIMEOUT,
    retryOnFailure: true,
    trackUsage: true
  }

  return executeWithRetry(
    () => executePlaywrightTool('screenshot', context.parameters, options.userId, context.timeout),
    context,
    options.userId
  )
}

/**
 * Interact with page elements (click, type, etc.)
 */
export async function interactWithElement(
  action: 'click' | 'type' | 'fill' | 'select' | 'hover',
  selector: string,
  options: {
    text?: string
    delay?: number
    force?: boolean
    userId: string
    timeout?: number
  }
): Promise<MCPToolResponse> {
  if (!selector || selector.trim().length === 0) {
    throw createMCPValidationError('playwright', 'interact', { selector: 'Selector is required' })
  }

  if (action === 'type' || action === 'fill') {
    if (!options.text) {
      throw createMCPValidationError('playwright', 'interact', { text: 'Text is required for type/fill actions' })
    }
  }

  const context: MCPToolExecutionContext = {
    serverName: 'playwright',
    toolName: 'interact',
    parameters: {
      action,
      selector,
      text: options.text,
      delay: options.delay || 100,
      force: options.force || false
    },
    timeout: options.timeout || MAX_TIMEOUT,
    retryOnFailure: true,
    trackUsage: true
  }

  return executeWithRetry(
    () => executePlaywrightTool('interact', context.parameters, options.userId, context.timeout),
    context,
    options.userId
  )
}

/**
 * Extract data from page elements
 */
export async function extractFromPage(
  selector: string,
  options: {
    extractType?: 'text' | 'html' | 'attribute' | 'multiple'
    attribute?: string
    multiple?: boolean
    userId: string
    timeout?: number
  }
): Promise<MCPToolResponse> {
  if (!selector || selector.trim().length === 0) {
    throw createMCPValidationError('playwright', 'extract', { selector: 'Selector is required' })
  }

  const context: MCPToolExecutionContext = {
    serverName: 'playwright',
    toolName: 'extract',
    parameters: {
      selector,
      extractType: options.extractType || 'text',
      attribute: options.attribute,
      multiple: options.multiple || false
    },
    timeout: options.timeout || MAX_TIMEOUT,
    retryOnFailure: true,
    trackUsage: true
  }

  return executeWithRetry(
    () => executePlaywrightTool('extract', context.parameters, options.userId, context.timeout),
    context,
    options.userId
  )
}

/**
 * Wait for element to appear or condition to be met
 */
export async function waitForElement(
  selector: string,
  options: {
    state?: 'visible' | 'hidden' | 'attached' | 'detached'
    timeout?: number
    userId: string
  }
): Promise<MCPToolResponse> {
  if (!selector || selector.trim().length === 0) {
    throw createMCPValidationError('playwright', 'wait_for', { selector: 'Selector is required' })
  }

  const context: MCPToolExecutionContext = {
    serverName: 'playwright',
    toolName: 'wait_for',
    parameters: {
      selector,
      state: options.state || 'visible',
      timeout: options.timeout || 10000
    },
    timeout: options.timeout || MAX_TIMEOUT,
    retryOnFailure: true,
    trackUsage: true
  }

  return executeWithRetry(
    () => executePlaywrightTool('wait_for', context.parameters, options.userId, context.timeout),
    context,
    options.userId
  )
}

/**
 * Execute JavaScript in the browser context
 */
export async function executeJavaScript(
  script: string,
  options: {
    userId: string
    timeout?: number
  }
): Promise<MCPToolResponse> {
  if (!script || script.trim().length === 0) {
    throw createMCPValidationError('playwright', 'execute_js', { script: 'JavaScript code is required' })
  }

  const context: MCPToolExecutionContext = {
    serverName: 'playwright',
    toolName: 'execute_js',
    parameters: {
      script
    },
    timeout: options.timeout || MAX_TIMEOUT,
    retryOnFailure: true,
    trackUsage: true
  }

  return executeWithRetry(
    () => executePlaywrightTool('execute_js', context.parameters, options.userId, context.timeout),
    context,
    options.userId
  )
}

/**
 * Get page information (URL, title, etc.)
 */
export async function getPageInfo(
  options: {
    userId: string
    timeout?: number
  }
): Promise<MCPToolResponse> {
  const context: MCPToolExecutionContext = {
    serverName: 'playwright',
    toolName: 'get_page_info',
    parameters: {},
    timeout: options.timeout || MAX_TIMEOUT,
    retryOnFailure: true,
    trackUsage: true
  }

  return executeWithRetry(
    () => executePlaywrightTool('get_page_info', context.parameters, options.userId, context.timeout),
    context,
    options.userId
  )
}

/**
 * Get playwright server configuration
 */
export function getPlaywrightConfig(): PlaywrightConfig | null {
  return getMCPServerConfig('playwright') as PlaywrightConfig
}

/**
 * Check if playwright is available and healthy
 */
export async function isPlaywrightAvailable(): Promise<boolean> {
  try {
    const client = await getMCPConnection('playwright')
    if (!client) return false

    await returnMCPConnection('playwright', client)
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
