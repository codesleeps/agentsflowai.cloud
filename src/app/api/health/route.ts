import { NextResponse } from 'next/server';
import { queryInternalDatabase } from '@/server-lib/internal-db-query';

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: {
      status: 'up' | 'down';
      latency?: number;
      error?: string;
    };
    memory: {
      status: 'ok' | 'warning' | 'critical';
      used: number;
      total: number;
      percentage: number;
    };
  };
}

export async function GET() {
  const startTime = Date.now();
  const checks: HealthCheck['checks'] = {
    database: { status: 'down' },
    memory: { status: 'ok', used: 0, total: 0, percentage: 0 },
  };

  // Check database connectivity
  try {
    const dbStart = Date.now();
    await queryInternalDatabase('SELECT 1 as health_check');
    checks.database = {
      status: 'up',
      latency: Date.now() - dbStart,
    };
  } catch (error) {
    checks.database = {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown database error',
    };
  }

  // Check memory usage
  const memUsage = process.memoryUsage();
  const totalMemory = memUsage.heapTotal;
  const usedMemory = memUsage.heapUsed;
  const memoryPercentage = (usedMemory / totalMemory) * 100;

  checks.memory = {
    status: memoryPercentage > 90 ? 'critical' : memoryPercentage > 75 ? 'warning' : 'ok',
    used: Math.round(usedMemory / 1024 / 1024),
    total: Math.round(totalMemory / 1024 / 1024),
    percentage: Math.round(memoryPercentage),
  };

  // Determine overall health status
  let status: HealthCheck['status'] = 'healthy';
  if (checks.database.status === 'down') {
    status = 'unhealthy';
  } else if (checks.memory.status === 'critical') {
    status = 'degraded';
  }

  const healthResponse: HealthCheck = {
    status,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? '1.0.0',
    uptime: process.uptime(),
    checks,
  };

  const statusCode = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503;

  return NextResponse.json(healthResponse, { status: statusCode });
}
