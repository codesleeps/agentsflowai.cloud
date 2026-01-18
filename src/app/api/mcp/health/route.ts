import { NextRequest, NextResponse } from 'next/server'
import { checkAllServersHealth } from '@/lib/mcp/client'
import { isMCPEnabled, getConfiguredMCPServers } from '@/lib/mcp/servers'
import { requireAuth } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    // Require authentication for health checks
    await requireAuth(request)

    const enabled = isMCPEnabled()

    if (!enabled) {
      return NextResponse.json({
        enabled: false,
        servers: {},
        timestamp: new Date().toISOString(),
        message: 'MCP services are disabled'
      }, {
        headers: {
          'Cache-Control': 'public, max-age=30',
        }
      })
    }

    // Check if any servers are configured
    const configuredServers = getConfiguredMCPServers()
    const totalConfiguredServers = Object.keys(configuredServers).length

    if (totalConfiguredServers === 0) {
      return NextResponse.json({
        enabled: true,
        overallHealthy: false,
        healthyServers: 0,
        totalServers: 0,
        servers: {},
        timestamp: new Date().toISOString(),
        message: 'MCP is enabled but no servers are configured. At least one MCP server must be configured when MCP is enabled.'
      }, {
        status: 503,
        headers: {
          'Cache-Control': 'public, max-age=30',
          'Content-Type': 'application/json'
        }
      })
    }

    // Check health of all servers
    const serverHealth = await checkAllServersHealth()

    // Determine overall health status
    const healthyServers = Object.values(serverHealth).filter(
      (health) => health.healthy
    ).length

    const totalServers = Object.keys(serverHealth).length
    const overallHealthy = healthyServers === totalServers

    const response = {
      enabled: true,
      overallHealthy,
      healthyServers,
      totalServers,
      servers: serverHealth,
      timestamp: new Date().toISOString()
    }

    // Return response with appropriate status code
    const statusCode = overallHealthy ? 200 : 503 // Service Unavailable if not all servers are healthy

    return NextResponse.json(response, {
      status: statusCode,
      headers: {
        'Cache-Control': 'public, max-age=30', // Cache for 30 seconds
        'Content-Type': 'application/json'
      }
    })

  } catch (error) {
    console.error('[MCP Health API] Error checking MCP server health:', error)

    // Return error response
    return NextResponse.json({
      enabled: isMCPEnabled(),
      error: 'Failed to check MCP server health',
      timestamp: new Date().toISOString(),
      details: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/json'
      }
    })
  }
}

// Handle unsupported methods
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}
