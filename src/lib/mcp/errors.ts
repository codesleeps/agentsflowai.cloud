/**
 * Custom error classes for MCP operations
 * Following the pattern from src/lib/api-errors.ts
 */

export class MCPError extends Error {
  public readonly code: string
  public readonly serverName?: string
  public readonly toolName?: string
  public readonly details?: any

  constructor(
    message: string,
    code: string,
    serverName?: string,
    toolName?: string,
    details?: any
  ) {
    super(message)
    this.name = 'MCPError'
    this.code = code
    this.serverName = serverName
    this.toolName = toolName
    this.details = details

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MCPError)
    }
  }
}

export class MCPConnectionError extends MCPError {
  constructor(message: string, serverName?: string, details?: any) {
    super(message, 'MCP_CONNECTION_ERROR', serverName, undefined, details)
    this.name = 'MCPConnectionError'
  }
}

export class MCPTimeoutError extends MCPError {
  constructor(message: string, serverName?: string, details?: any) {
    super(message, 'MCP_TIMEOUT_ERROR', serverName, undefined, details)
    this.name = 'MCPTimeoutError'
  }
}

export class MCPAuthenticationError extends MCPError {
  constructor(message: string, serverName?: string, details?: any) {
    super(message, 'MCP_AUTHENTICATION_ERROR', serverName, undefined, details)
    this.name = 'MCPAuthenticationError'
  }
}

export class MCPServerUnavailableError extends MCPError {
  constructor(message: string, serverName?: string, details?: any) {
    super(message, 'MCP_SERVER_UNAVAILABLE_ERROR', serverName, undefined, details)
    this.name = 'MCPServerUnavailableError'
  }
}

export class MCPToolNotFoundError extends MCPError {
  constructor(message: string, serverName?: string, toolName?: string, details?: any) {
    super(message, 'MCP_TOOL_NOT_FOUND_ERROR', serverName, toolName, details)
    this.name = 'MCPToolNotFoundError'
  }
}

export class MCPRateLimitError extends MCPError {
  constructor(message: string, serverName?: string, toolName?: string, details?: any) {
    super(message, 'MCP_RATE_LIMIT_ERROR', serverName, toolName, details)
    this.name = 'MCPRateLimitError'
  }
}

export class MCPValidationError extends MCPError {
  constructor(message: string, serverName?: string, toolName?: string, details?: any) {
    super(message, 'MCP_VALIDATION_ERROR', serverName, toolName, details)
    this.name = 'MCPValidationError'
  }
}

export class MCPExecutionError extends MCPError {
  constructor(message: string, serverName?: string, toolName?: string, details?: any) {
    super(message, 'MCP_EXECUTION_ERROR', serverName, toolName, details)
    this.name = 'MCPExecutionError'
  }
}

// Error factory functions for common scenarios
export function createMCPConnectionError(
  serverName: string,
  originalError?: Error
): MCPConnectionError {
  const message = `Failed to connect to MCP server '${serverName}'`
  const details = originalError ? { originalError: originalError.message } : undefined
  return new MCPConnectionError(message, serverName, details)
}

export function createMCPTimeoutError(
  serverName: string,
  timeout: number
): MCPTimeoutError {
  const message = `MCP server '${serverName}' timed out after ${timeout}ms`
  return new MCPTimeoutError(message, serverName, { timeout })
}

export function createMCPAuthenticationError(
  serverName: string,
  reason?: string
): MCPAuthenticationError {
  const message = `Authentication failed for MCP server '${serverName}'${reason ? `: ${reason}` : ''}`
  return new MCPAuthenticationError(message, serverName, { reason })
}

export function createMCPServerUnavailableError(
  serverName: string,
  reason?: string
): MCPServerUnavailableError {
  const message = `MCP server '${serverName}' is unavailable${reason ? `: ${reason}` : ''}`
  return new MCPServerUnavailableError(message, serverName, { reason })
}

export function createMCPToolNotFoundError(
  serverName: string,
  toolName: string
): MCPToolNotFoundError {
  const message = `Tool '${toolName}' not found on MCP server '${serverName}'`
  return new MCPToolNotFoundError(message, serverName, toolName)
}

export function createMCPRateLimitError(
  serverName: string,
  toolName?: string,
  retryAfter?: number
): MCPRateLimitError {
  const message = `Rate limit exceeded for ${toolName ? `tool '${toolName}' on ` : ''}MCP server '${serverName}'`
  const details = retryAfter ? { retryAfter } : undefined
  return new MCPRateLimitError(message, serverName, toolName, details)
}

export function createMCPValidationError(
  serverName: string,
  toolName: string,
  validationErrors: any
): MCPValidationError {
  const message = `Validation failed for tool '${toolName}' on MCP server '${serverName}'`
  return new MCPValidationError(message, serverName, toolName, { validationErrors })
}

export function createMCPExecutionError(
  serverName: string,
  toolName: string,
  originalError?: Error
): MCPExecutionError {
  const message = `Tool execution failed for '${toolName}' on MCP server '${serverName}'`
  const details = originalError ? { originalError: originalError.message } : undefined
  return new MCPExecutionError(message, serverName, toolName, details)
}

// Error type guards
export function isMCPError(error: any): error is MCPError {
  return error instanceof MCPError
}

export function isMCPConnectionError(error: any): error is MCPConnectionError {
  return error instanceof MCPConnectionError
}

export function isMCPTimeoutError(error: any): error is MCPTimeoutError {
  return error instanceof MCPTimeoutError
}

export function isMCPAuthenticationError(error: any): error is MCPAuthenticationError {
  return error instanceof MCPAuthenticationError
}

export function isMCPServerUnavailableError(error: any): error is MCPServerUnavailableError {
  return error instanceof MCPServerUnavailableError
}

export function isMCPToolNotFoundError(error: any): error is MCPToolNotFoundError {
  return error instanceof MCPToolNotFoundError
}

export function isMCPRateLimitError(error: any): error is MCPRateLimitError {
  return error instanceof MCPRateLimitError
}

export function isMCPValidationError(error: any): error is MCPValidationError {
  return error instanceof MCPValidationError
}

export function isMCPExecutionError(error: any): error is MCPExecutionError {
  return error instanceof MCPExecutionError
}
