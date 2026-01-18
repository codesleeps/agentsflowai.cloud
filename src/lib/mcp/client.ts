import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { WebSocketClientTransport } from '@modelcontextprotocol/sdk/client/websocket.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import {
  MCPConnection,
  MCPConnectionPool,
  MCPHealthCheck,
  MCPConnectionEvent,
  MCPHealthEvent,
  MCPUsageMetrics,
  MCPServerMetrics,
  MCPGlobalConfig,
  mcpGlobalConfigSchema
} from './types'
import { getMCPServerConfig, getConfiguredMCPServers, isMCPEnabled, getServerHealthEndpoint } from './servers'
import { MCPConnectionError, MCPTimeoutError, MCPAuthenticationError, MCPServerUnavailableError } from './errors'

// Global configuration with defaults
const globalConfig: MCPGlobalConfig = {
  enabled: process.env.MCP_ENABLED !== 'false',
  connectionTimeout: 30000,
  healthCheckInterval: 30000,
  circuitBreakerThreshold: 3,
  circuitBreakerResetTimeout: 60000
}

// Connection pools for each server
const connectionPools = new Map<string, MCPConnectionPool>()

// Active connections tracking
const activeConnections = new Map<string, MCPConnection>()

// Health check cache
const healthCheckCache = new Map<string, MCPHealthCheck>()

// Circuit breaker state
const circuitBreakerState = new Map<string, 'closed' | 'open' | 'half-open'>()
const circuitBreakerFailures = new Map<string, number>()
const circuitBreakerLastFailure = new Map<string, Date>()

// Usage tracking
const usageMetrics = new Map<string, Map<string, MCPUsageMetrics>>()
const serverMetrics = new Map<string, MCPServerMetrics>()

// Event listeners
const eventListeners = new Map<string, ((event: MCPConnectionEvent | MCPHealthEvent) => void)[]>()

/**
 * MCP Client Manager - Singleton pattern for managing MCP server connections
 */
export class MCPClientManager {
  private static instance: MCPClientManager | null = null
  private initialized = false

  private constructor() {}

  static getInstance(): MCPClientManager {
    if (!MCPClientManager.instance) {
      MCPClientManager.instance = new MCPClientManager()
    }
    return MCPClientManager.instance
  }

  /**
   * Initialize the MCP client manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    if (!isMCPEnabled()) {
      console.log('[MCP] MCP services are disabled')
      this.initialized = true
      return
    }

    console.log('[MCP] Initializing MCP client manager...')

    try {
      // Initialize connection pools for configured servers
      const configuredServers = getConfiguredMCPServers()

      for (const [serverName, config] of Object.entries(configuredServers)) {
        if (config) {
          await this.initializeConnectionPool(serverName, config.poolSize)
        }
      }

      this.initialized = true
      console.log('[MCP] MCP client manager initialized successfully')
    } catch (error) {
      console.error('[MCP] Failed to initialize MCP client manager:', error)
      throw error
    }
  }

  /**
   * Initialize connection pool for a specific server
   */
  private async initializeConnectionPool(serverName: string, poolSize: number): Promise<void> {
    const pool: MCPConnectionPool = {
      serverName,
      connections: [],
      maxSize: poolSize,
      activeCount: 0,
      idleCount: 0
    }

    connectionPools.set(serverName, pool)
    circuitBreakerState.set(serverName, 'closed')
    circuitBreakerFailures.set(serverName, 0)

    console.log(`[MCP] Initialized connection pool for ${serverName} (size: ${poolSize})`)
  }

  /**
   * Get a connection to the specified MCP server
   */
  async getConnection(serverName: string): Promise<Client | null> {
    if (!this.initialized) {
      await this.initialize()
    }

    if (!isMCPEnabled()) {
      return null
    }

    // Check circuit breaker
    if (this.isCircuitBreakerOpen(serverName)) {
      throw new MCPServerUnavailableError(`Circuit breaker is open for server ${serverName}`)
    }

    const pool = connectionPools.get(serverName)
    if (!pool) {
      throw new MCPConnectionError(`No connection pool configured for server ${serverName}`)
    }

    // Try to get an idle connection first
    let connection = pool.connections.find(conn => conn.status === 'idle')

    if (!connection && pool.connections.length < pool.maxSize) {
      // Create a new connection
      connection = await this.createConnection(serverName)
      if (connection) {
        pool.connections.push(connection)
      }
    }

    if (!connection) {
      throw new MCPConnectionError(`No available connections for server ${serverName}`)
    }

    // Mark as active
    connection.status = 'active'
    connection.lastUsed = new Date()
    pool.activeCount++
    pool.idleCount = Math.max(0, pool.idleCount - 1)

    activeConnections.set(`${serverName}-${connection.id}`, connection)

    this.emitEvent({
      serverName,
      type: 'connected',
      timestamp: new Date(),
      details: { connectionId: connection.id }
    })

    return connection.client
  }

  /**
   * Create a new connection to an MCP server
   */
  private async createConnection(serverName: string): Promise<MCPConnection | null> {
    try {
      const config = getMCPServerConfig(serverName as keyof ReturnType<typeof getConfiguredMCPServers>)
      if (!config) {
        throw new MCPConnectionError(`Server configuration not found for ${serverName}`)
      }

      // Determine transport type based on endpoint
      const transport = this.createTransport(serverName, config.endpoint)

      // Create MCP client
      const client = new Client(
        {
          name: `agentsflowai-${serverName}`,
          version: '1.0.0'
        },
        {
          capabilities: {}
        }
      )

      // Connect with timeout
      await this.connectWithTimeout(client, transport, config.timeout)

      const connection: MCPConnection = {
        id: `${serverName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        serverName,
        client,
        createdAt: new Date(),
        lastUsed: new Date(),
        status: 'idle'
      }

      console.log(`[MCP] Created new connection to ${serverName}: ${connection.id}`)
      return connection

    } catch (error) {
      console.error(`[MCP] Failed to create connection to ${serverName}:`, error)

      // Update circuit breaker
      this.recordFailure(serverName)

      throw error
    }
  }

  /**
   * Create appropriate transport based on endpoint
   */
  private createTransport(serverName: string, endpoint: string) {
    const config = getMCPServerConfig(serverName as keyof ReturnType<typeof getConfiguredMCPServers>)

    if (endpoint.startsWith('ws://') || endpoint.startsWith('wss://')) {
      // For WebSocket, add API key as query parameter if available
      const url = new URL(endpoint)
      if (config?.apiKey) {
        url.searchParams.set('apiKey', config.apiKey)
      }
      return new WebSocketClientTransport(url)
    } else if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      // For SSE, add API key as header if available
      const requestInit: RequestInit = {}
      if (config?.apiKey) {
        requestInit.headers = {
          'Authorization': `Bearer ${config.apiKey}`
        }
      }
      return new SSEClientTransport(new URL(endpoint), { requestInit })
    } else {
      // Assume stdio for local processes - API keys don't apply here
      return new StdioClientTransport({
        command: endpoint,
        args: [],
        env: process.env
      })
    }
  }

  /**
   * Connect client with timeout
   */
  private async connectWithTimeout(
    client: Client,
    transport: any,
    timeout: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new MCPTimeoutError(`Connection timeout after ${timeout}ms`))
      }, timeout)

      client.connect(transport)
        .then(() => {
          clearTimeout(timeoutId)
          resolve()
        })
        .catch((error) => {
          clearTimeout(timeoutId)
          reject(error)
        })
    })
  }

  /**
   * Return a connection to the pool
   */
  async returnConnection(serverName: string, client: Client): Promise<void> {
    for (const [key, connection] of activeConnections) {
      if (connection.client === client) {
        const pool = connectionPools.get(serverName)

        if (pool) {
          connection.status = 'idle'
          connection.lastUsed = new Date()
          pool.activeCount = Math.max(0, pool.activeCount - 1)
          pool.idleCount++
        }

        activeConnections.delete(key)
        return
      }
    }

    console.warn(`[MCP] Connection not found for return: ${serverName}`)
  }

  /**
   * Close a specific connection
   */
  async closeConnection(serverName: string, client?: Client): Promise<void> {
    if (client) {
      // Close specific connection
      for (const [key, connection] of activeConnections) {
        if (connection.client === client) {
          await this.closeConnectionInternal(connection)
          activeConnections.delete(key)
          break
        }
      }
    } else {
      // Close all connections for server
      const pool = connectionPools.get(serverName)
      if (pool) {
        for (const connection of pool.connections) {
          await this.closeConnectionInternal(connection)
        }
        pool.connections = []
        pool.activeCount = 0
        pool.idleCount = 0
      }
    }

    this.emitEvent({
      serverName,
      type: 'disconnected',
      timestamp: new Date()
    })
  }

  /**
   * Internal connection closing
   */
  private async closeConnectionInternal(connection: MCPConnection): Promise<void> {
    try {
      await connection.client.close()
      connection.status = 'closed'
      console.log(`[MCP] Closed connection ${connection.id}`)
    } catch (error) {
      console.error(`[MCP] Error closing connection ${connection.id}:`, error)
    }
  }

  /**
   * Close all connections and cleanup
   */
  async closeAllConnections(): Promise<void> {
    console.log('[MCP] Closing all MCP connections...')

    for (const [serverName] of connectionPools) {
      await this.closeConnection(serverName)
    }

    activeConnections.clear()
    connectionPools.clear()
    healthCheckCache.clear()

    console.log('[MCP] All MCP connections closed')
  }

  /**
   * Health check for individual server
   */
  async checkServerHealth(serverName: string): Promise<MCPHealthCheck> {
    const cached = healthCheckCache.get(serverName)
    if (cached && (Date.now() - cached.lastCheck.getTime()) < globalConfig.healthCheckInterval) {
      return cached
    }

    const healthCheck: MCPHealthCheck = {
      serverName,
      healthy: false,
      lastCheck: new Date(),
      consecutiveFailures: circuitBreakerFailures.get(serverName) || 0
    }

    try {
      const healthEndpoint = getServerHealthEndpoint(serverName as keyof typeof getServerHealthEndpoint)
      if (!healthEndpoint) {
        healthCheck.errorMessage = 'No health check endpoint configured'
        this.recordFailure(serverName)
      } else {
        const startTime = Date.now()
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)

        try {
          // Add authentication headers for servers that require it
          const headers: Record<string, string> = {
            'User-Agent': 'AgentsFlowAI-HealthCheck/1.0'
          }

          const config = getMCPServerConfig(serverName as keyof ReturnType<typeof getConfiguredMCPServers>)
          if (config?.apiKey) {
            headers['Authorization'] = `Bearer ${config.apiKey}`
          }

          const response = await fetch(healthEndpoint, {
            signal: controller.signal,
            headers
          })
          clearTimeout(timeoutId)

          if (response.ok) {
            healthCheck.healthy = true
            healthCheck.latency = Date.now() - startTime
            this.recordSuccess(serverName)
          } else {
            healthCheck.errorMessage = `Health check failed with status ${response.status}`
            this.recordFailure(serverName)
          }
        } catch (error) {
          clearTimeout(timeoutId)
          healthCheck.errorMessage = error instanceof Error ? error.message : 'Unknown error'
          this.recordFailure(serverName)
        }
      }
    } catch (error) {
      healthCheck.errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.recordFailure(serverName)
    }

    healthCheckCache.set(serverName, healthCheck)

    this.emitEvent({
      serverName,
      type: 'health',
      healthy: healthCheck.healthy,
      latency: healthCheck.latency,
      timestamp: new Date(),
      error: healthCheck.errorMessage
    } as MCPHealthEvent)

    return healthCheck
  }

  /**
   * Check health of all servers
   */
  async checkAllServersHealth(): Promise<Record<string, MCPHealthCheck>> {
    const configuredServers = getConfiguredMCPServers()
    const results: Record<string, MCPHealthCheck> = {}

    for (const serverName of Object.keys(configuredServers)) {
      try {
        results[serverName] = await this.checkServerHealth(serverName)
      } catch (error) {
        results[serverName] = {
          serverName,
          healthy: false,
          lastCheck: new Date(),
          errorMessage: error instanceof Error ? error.message : 'Health check failed',
          consecutiveFailures: circuitBreakerFailures.get(serverName) || 0
        }
      }
    }

    return results
  }

  /**
   * Circuit breaker logic
   */
  private isCircuitBreakerOpen(serverName: string): boolean {
    const state = circuitBreakerState.get(serverName)
    if (state === 'open') {
      const lastFailure = circuitBreakerLastFailure.get(serverName)
      if (lastFailure && (Date.now() - lastFailure.getTime()) > globalConfig.circuitBreakerResetTimeout) {
        // Reset to half-open
        circuitBreakerState.set(serverName, 'half-open')
        circuitBreakerFailures.set(serverName, 0)
        return false
      }
      return true
    }
    return false
  }

  private recordFailure(serverName: string): void {
    const failures = (circuitBreakerFailures.get(serverName) || 0) + 1
    circuitBreakerFailures.set(serverName, failures)
    circuitBreakerLastFailure.set(serverName, new Date())

    if (failures >= globalConfig.circuitBreakerThreshold) {
      circuitBreakerState.set(serverName, 'open')
      console.warn(`[MCP] Circuit breaker opened for ${serverName} after ${failures} failures`)
    }
  }

  private recordSuccess(serverName: string): void {
    circuitBreakerFailures.set(serverName, 0)
    if (circuitBreakerState.get(serverName) === 'half-open') {
      circuitBreakerState.set(serverName, 'closed')
      console.log(`[MCP] Circuit breaker closed for ${serverName}`)
    }
  }

  /**
   * Event handling
   */
  addEventListener(serverName: string, listener: (event: MCPConnectionEvent | MCPHealthEvent) => void): void {
    if (!eventListeners.has(serverName)) {
      eventListeners.set(serverName, [])
    }
    eventListeners.get(serverName)!.push(listener)
  }

  removeEventListener(serverName: string, listener: (event: MCPConnectionEvent | MCPHealthEvent) => void): void {
    const listeners = eventListeners.get(serverName)
    if (listeners) {
      const index = listeners.indexOf(listener)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  private emitEvent(event: MCPConnectionEvent | MCPHealthEvent): void {
    const listeners = eventListeners.get(event.serverName)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event)
        } catch (error) {
          console.error('[MCP] Error in event listener:', error)
        }
      })
    }
  }

  /**
   * Get connection pool stats
   */
  getConnectionStats(serverName?: string): Record<string, any> {
    if (serverName) {
      return {
        pool: connectionPools.get(serverName),
        circuitBreaker: {
          state: circuitBreakerState.get(serverName),
          failures: circuitBreakerFailures.get(serverName),
          lastFailure: circuitBreakerLastFailure.get(serverName)
        },
        health: healthCheckCache.get(serverName)
      }
    }

    const stats: Record<string, any> = {}
    for (const [name, pool] of connectionPools) {
      stats[name] = this.getConnectionStats(name)
    }
    return stats
  }
}

// Export singleton instance
export const mcpClient = MCPClientManager.getInstance()

// Convenience functions
export async function getMCPConnection(serverName: string): Promise<Client | null> {
  return mcpClient.getConnection(serverName)
}

export async function returnMCPConnection(serverName: string, client: Client): Promise<void> {
  return mcpClient.returnConnection(serverName, client)
}

export async function closeMCPConnections(): Promise<void> {
  return mcpClient.closeAllConnections()
}

export async function checkAllServersHealth(): Promise<Record<string, MCPHealthCheck>> {
  return mcpClient.checkAllServersHealth()
}
