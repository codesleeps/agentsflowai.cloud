import { getMCPConnection, returnMCPConnection } from '../client'
import { MCPToolExecutionContext, MCPToolResponse } from '../types'
import {
  MCPExecutionError,
  MCPTimeoutError,
  createMCPExecutionError,
  createMCPTimeoutError
} from '../errors'
import { trackMCPUsage } from './trackUsage'

/**
 * Generic MCP tool executor that can work with any server
 */
export async function executeMCPTool(
  serverName: string,
  toolName: string,
  parameters: Record<string, any>,
  userId: string,
  timeout: number = 30000
): Promise<MCPToolResponse> {
  const startTime = Date.now()
  let client: any = null

  try {
    // Get MCP connection for the specified server
    client = await getMCPConnection(serverName)
    if (!client) {
      throw new MCPExecutionError(`Failed to get MCP connection for ${serverName}`)
    }

    // Execute tool with timeout
    const result = await Promise.race([
      client.callTool({
        name: toolName,
        arguments: parameters
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(createMCPTimeoutError(serverName, timeout)), timeout)
      )
    ])

    const executionTime = Date.now() - startTime

    return {
      success: true,
      data: result,
      executionTime,
      serverName,
      toolName
    }

  } catch (error) {
    const executionTime = Date.now() - startTime

    // Return connection to pool
    if (client) {
      try {
        await returnMCPConnection(serverName, client)
      } catch (returnError) {
        console.error(`[${serverName}] Error returning connection to pool:`, returnError)
      }
    }

    // Always throw MCP errors for retry logic to work
    throw error instanceof Error && error.name.startsWith('MCP')
      ? error
      : createMCPExecutionError(serverName, toolName, error as Error)
  }
}

/**
 * Execute tool with retry logic and fallback strategies
 */
export async function executeWithRetryAndFallback<T>(
  operation: () => Promise<T>,
  context: MCPToolExecutionContext,
  userId: string,
  executeMCPToolFn: (
    serverName: string,
    toolName: string,
    parameters: Record<string, any>,
    userId: string,
    timeout: number
  ) => Promise<MCPToolResponse>
): Promise<T> {
  const startTime = Date.now()
  let lastError: Error | null = null
  let fallbackUsed = false

  // Try primary operation with retries
  for (let attempt = 0; attempt < 3; attempt++) { // Use standard retry count
    try {
      const result = await operation()

      // Check if result is MCPToolResponse with success: false
      if (result && typeof result === 'object' && 'success' in result && result.success === false) {
        // Treat success: false as retryable error
        const error = new Error((result as any).error || 'Tool execution failed')
        lastError = error

        // Check if error is retryable
        if (!isRetryableError(error)) {
          break
        }

        // Exponential backoff delay
        if (attempt < 2) {
          const delay = 1000 * Math.pow(2, attempt)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
        continue
      }

      // Track successful operation
      if (result && typeof result === 'object' && 'success' in result && 'executionTime' in result && 'serverName' in result && 'toolName' in result) {
        const toolResult = result as MCPToolResponse
        if (toolResult.success) {
          trackMCPUsage(toolResult.serverName, toolResult.toolName, toolResult.executionTime, true, toolResult.metrics)
        }
      }

      return result
    } catch (error) {
      lastError = error as Error

      // Check if error is retryable
      if (!isRetryableError(error)) {
        break
      }

      // Exponential backoff delay
      if (attempt < 2) {
        const delay = 1000 * Math.pow(2, attempt)
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
        const fallbackResult = await executeMCPToolFn(
          fallback.serverName,
          fallback.toolName || context.toolName,
          { ...context.parameters, ...(fallback.parameters || {}) },
          userId,
          context.timeout || 30000
        )

        // Mark that fallback was used
        if (fallbackResult && typeof fallbackResult === 'object') {
          (fallbackResult as any).fallbackUsed = true
        }

        // Track successful fallback
        if (fallbackResult.success) {
          trackMCPUsage(fallbackResult.serverName, fallbackResult.toolName, fallbackResult.executionTime, true, fallbackResult.metrics)
        }

        fallbackUsed = true
        return fallbackResult as T
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
