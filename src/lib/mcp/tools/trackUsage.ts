import { MCPToolResponse, MCPUsageMetrics } from '../types'

// Centralized usage tracking storage
const usageStorage = new Map<string, Map<string, MCPUsageMetrics>>()

/**
 * Generic MCP usage tracking function that dispatches to unified storage
 */
export function trackMCPUsage(
  serverName: string,
  toolName: string,
  executionTime: number,
  success: boolean,
  metrics: MCPToolResponse['metrics'] = { estimatedCost: 0 },
  userId?: string
): void {
  // Get or create server usage map
  let serverUsage = usageStorage.get(serverName)
  if (!serverUsage) {
    serverUsage = new Map()
    usageStorage.set(serverName, serverUsage)
  }

  // Get or create tool usage metrics
  let toolUsage = serverUsage.get(toolName)
  if (!toolUsage) {
    toolUsage = {
      serverName,
      toolName,
      callCount: 0,
      totalExecutionTime: 0,
      averageLatency: 0,
      errorCount: 0,
      lastUsed: new Date(),
      totalCost: 0,
      bytesTransferred: 0,
      screenshotsTaken: 0
    }
    serverUsage.set(toolName, toolUsage)
  }

  // Update metrics
  toolUsage.callCount++
  toolUsage.totalExecutionTime += executionTime
  toolUsage.averageLatency = toolUsage.totalExecutionTime / toolUsage.callCount
  toolUsage.lastUsed = new Date()

  // Update cost and specific metrics
  const cost = metrics?.estimatedCost ?? 0
  toolUsage.totalCost += cost

  if (metrics?.bytesTransferred) {
    toolUsage.bytesTransferred! += metrics.bytesTransferred
  }

  if (metrics?.screenshotsTaken) {
    toolUsage.screenshotsTaken! += metrics.screenshotsTaken
  }

  if (!success) {
    toolUsage.errorCount++
  }
}

/**
 * Get usage metrics for a specific server
 */
export function getMCPUsageMetrics(serverName: string): Record<string, MCPUsageMetrics> {
  const serverUsage = usageStorage.get(serverName)
  if (!serverUsage) return {}

  const metrics: Record<string, MCPUsageMetrics> = {}
  for (const [toolName, usage] of serverUsage.entries()) {
    metrics[toolName] = { ...usage }
  }

  return metrics
}

/**
 * Get all MCP usage metrics across all servers
 */
export function getAllMCPUsageMetrics(): Record<string, Record<string, MCPUsageMetrics>> {
  const allMetrics: Record<string, Record<string, MCPUsageMetrics>> = {}

  for (const [serverName, serverUsage] of usageStorage.entries()) {
    allMetrics[serverName] = getMCPUsageMetrics(serverName)
  }

  return allMetrics
}

/**
 * Clear usage metrics for a specific server (useful for testing)
 */
export function clearMCPUsageMetrics(serverName?: string): void {
  if (serverName) {
    usageStorage.delete(serverName)
  } else {
    usageStorage.clear()
  }
}
