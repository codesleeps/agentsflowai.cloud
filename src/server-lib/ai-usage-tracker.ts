import { prisma as db } from "@/server-lib/prisma";
import { AIProviderCost } from "@prisma/client";

interface LogUsageParams {
  user_id: string;
  agent_id: string;
  provider: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  cost_usd: number;
  latency_ms: number;
  status: "success" | "failed" | "fallback";
  error_message?: string;
}

// In-memory cache for provider costs
let providerCosts: AIProviderCost[] | null = null;

async function getProviderCosts(): Promise<AIProviderCost[]> {
  if (!providerCosts) {
    providerCosts = await db.aIProviderCost.findMany();
  }
  return providerCosts;
}

export async function logModelUsage(params: LogUsageParams) {
  try {
    // Use provided cost_usd if available, otherwise calculate it
    const cost = params.cost_usd !== undefined && params.cost_usd !== null
      ? params.cost_usd
      : await calculateCost(
          params.provider,
          params.model,
          params.prompt_tokens,
          params.completion_tokens,
        );

    const { user_id, ...rest } = params;
    const total_tokens = params.prompt_tokens + params.completion_tokens;

    // Handle system logs or logs where user doesn't exist
    const data: any = {
      ...rest,
      total_tokens,
      cost_usd: cost,
    };

    // Verify user exists before connecting
    let targetUserId = user_id;
    const userExists = await db.user.findUnique({
      where: { id: targetUserId },
      select: { id: true }
    });

    if (!userExists) {
      // If user doesn't exist (like 'dev-user' or 'system'), 
      // try to find an admin or ANY user to attach the log to
      const fallbackUser = await db.user.findFirst({
        where: { role: 'admin' },
        select: { id: true }
      }) || await db.user.findFirst({
        select: { id: true }
      });

      if (fallbackUser) {
        targetUserId = fallbackUser.id;
      } else {
        console.warn(`No user record found in DB to attach AI usage log (original ID: ${user_id}). Skipping log.`);
        return;
      }
    }

    await db.aIModelUsage.create({
      data: {
        ...data,
        user: { connect: { id: targetUserId } }
      },
    });
  } catch (error) {
    console.error("Failed to log model usage:", error);
  }
}

export async function calculateCost(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
): Promise<number> {
  const costs = await getProviderCosts();
  const modelCost = costs.find(
    (c) => c.provider === provider && c.model === model,
  );

  if (!modelCost) {
    return 0;
  }

  const inputCost = (inputTokens / 1000) * modelCost.input_cost_per_1k_tokens;
  const outputCost =
    (outputTokens / 1000) * modelCost.output_cost_per_1k_tokens;

  return inputCost + outputCost;
}

export async function getUserUsageStats(
  userId: string,
  dateRange: { -readonly [key in string]: string },
) {
  const { startDate, endDate } = dateRange;

  return db.aIModelUsage.groupBy({
    by: ["provider", "agent_id"],
    where: {
      user_id: userId,
      created_at: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    },
    _sum: {
      total_tokens: true,
      cost_usd: true,
    },
    _count: {
      _all: true,
    },
  });
}

export async function getAgentPerformanceMetrics(agentId: string) {
  return db.aIModelUsage.groupBy({
    by: ["provider", "model"],
    where: {
      agent_id: agentId,
    },
    _avg: {
      latency_ms: true,
      cost_usd: true,
    },
    _count: {
      status: true,
    },
  });
}

// ============================================
// PROVIDER HEALTH METRICS
// ============================================

export interface ProviderHealthMetrics {
  provider: string;
  uptime: number; // percentage
  avgLatency: number; // ms
  errorRate: number; // percentage
  costPerDay: number; // USD
  totalRequests: number;
  successCount: number;
  failedCount: number;
}

export async function getProviderHealth(
  userId: string,
  dateRange: { startDate: string; endDate: string },
): Promise<ProviderHealthMetrics[]> {
  const { startDate, endDate } = dateRange;

  const usageData = await db.aIModelUsage.groupBy({
    by: ["provider"],
    where: {
      user_id: userId,
      created_at: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    },
    _avg: {
      latency_ms: true,
      cost_usd: true,
    },
    _sum: {
      cost_usd: true,
      latency_ms: true,
    },
    _count: {
      _all: true,
    },
  });

  const failedData = await db.aIModelUsage.groupBy({
    by: ["provider"],
    where: {
      user_id: userId,
      status: "failed",
      created_at: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    },
    _count: {
      _all: true,
    },
  });

  const failedMap = new Map(failedData.map(f => [f.provider, f._count._all]));

  // Calculate days for cost per day
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

  return usageData.map(item => {
    const totalRequests = item._count._all;
    const failedCount = failedMap.get(item.provider) || 0;
    const successCount = totalRequests - failedCount;
    const uptime = totalRequests > 0 ? (successCount / totalRequests) * 100 : 100;
    const errorRate = totalRequests > 0 ? (failedCount / totalRequests) * 100 : 0;
    const avgLatency = item._avg.latency_ms || 0;
    const totalCost = item._sum.cost_usd || 0;
    const costPerDay = totalCost / days;

    return {
      provider: item.provider,
      uptime: Math.round(uptime * 100) / 100,
      avgLatency: Math.round(avgLatency * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100,
      costPerDay: Math.round(costPerDay * 100) / 100,
      totalRequests,
      successCount,
      failedCount,
    };
  });
}

// ============================================
// TIME-SERIES AGGREGATIONS
// ============================================

export interface TimeSeriesDataPoint {
  date: string;
  provider?: string;
  totalTokens: number;
  totalCost: number;
  requestCount: number;
  avgLatency: number;
}

export async function getProviderTimeSeries(
  userId: string,
  dateRange: { startDate: string; endDate: string },
  provider?: string,
): Promise<TimeSeriesDataPoint[]> {
  const { startDate, endDate } = dateRange;

  const whereClause: any = {
    user_id: userId,
    created_at: {
      gte: new Date(startDate),
      lte: new Date(endDate),
    },
  };

  if (provider) {
    whereClause.provider = provider;
  }

  const usageData = await db.aIModelUsage.groupBy({
    by: ["created_at", "provider"],
    where: whereClause,
    _sum: {
      total_tokens: true,
      cost_usd: true,
      latency_ms: true,
    },
    _count: {
      _all: true,
    },
  });

  // Aggregate by day
  const dailyMap = new Map<string, TimeSeriesDataPoint>();

  usageData.forEach(item => {
    const dateKey = item.created_at.toISOString().split('T')[0];
    const existing = dailyMap.get(dateKey) || {
      date: dateKey,
      totalTokens: 0,
      totalCost: 0,
      requestCount: 0,
      avgLatency: 0,
    };

    existing.totalTokens += item._sum.total_tokens || 0;
    existing.totalCost += item._sum.cost_usd || 0;
    existing.requestCount += item._count._all;
    existing.avgLatency = existing.requestCount > 0 
      ? (existing.avgLatency * (existing.requestCount - item._count._all) + (item._sum.latency_ms || 0)) / existing.requestCount
      : 0;

    dailyMap.set(dateKey, existing);
  });

  return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

// ============================================
// MODEL PERFORMANCE COMPARISON
// ============================================

export interface ModelPerformanceData {
  provider: string;
  model: string;
  totalRequests: number;
  successRate: number;
  avgLatency: number;
  avgCostPerRequest: number;
  totalCost: number;
  totalTokens: number;
}

export async function getModelPerformance(
  userId: string,
  dateRange: { startDate: string; endDate: string },
): Promise<ModelPerformanceData[]> {
  const { startDate, endDate } = dateRange;

  const usageData = await db.aIModelUsage.groupBy({
    by: ["provider", "model"],
    where: {
      user_id: userId,
      created_at: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    },
    _avg: {
      latency_ms: true,
      cost_usd: true,
    },
    _sum: {
      total_tokens: true,
      cost_usd: true,
    },
    _count: {
      _all: true,
    },
  });

  const failedData = await db.aIModelUsage.groupBy({
    by: ["provider", "model"],
    where: {
      user_id: userId,
      status: "failed",
      created_at: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    },
    _count: {
      _all: true,
    },
  });

  const failedMap = new Map(failedData.map(f => [`${f.provider}:${f.model}`, f._count._all]));

  return usageData.map(item => {
    const key = `${item.provider}:${item.model}`;
    const failedCount = failedMap.get(key) || 0;
    const totalRequests = item._count._all;
    const successRate = totalRequests > 0 ? ((totalRequests - failedCount) / totalRequests) * 100 : 0;

    return {
      provider: item.provider,
      model: item.model,
      totalRequests,
      successRate: Math.round(successRate * 100) / 100,
      avgLatency: Math.round((item._avg.latency_ms || 0) * 100) / 100,
      avgCostPerRequest: Math.round((item._avg.cost_usd || 0) * 10000) / 10000,
      totalCost: Math.round((item._sum.cost_usd || 0) * 10000) / 10000,
      totalTokens: item._sum.total_tokens || 0,
    };
  });
}

// ============================================
// FALLBACK TRACKING
// ============================================

export interface FallbackData {
  id: string;
  agent_id: string;
  original_provider: string;
  original_model: string;
  fallback_provider: string;
  fallback_model: string;
  reason: string;
  count: number;
  last_occurrence: Date;
  avg_latency_increase: number;
}

export async function getFallbackTracking(
  userId: string,
  dateRange: { startDate: string; endDate: string },
): Promise<FallbackData[]> {
  const { startDate, endDate } = dateRange;

  const fallbacks = await db.aIModelUsage.findMany({
    where: {
      user_id: userId,
      status: "fallback",
      created_at: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    },
    orderBy: { created_at: "desc" },
  });

  // Group fallbacks by agent and reason
  const fallbackMap = new Map<string, FallbackData>();

  fallbacks.forEach(item => {
    const key = `${item.agent_id}:${item.provider}:${item.model}:${item.error_message || 'unknown'}`;
    
    if (fallbackMap.has(key)) {
      const existing = fallbackMap.get(key)!;
      existing.count++;
      if (item.created_at > existing.last_occurrence) {
        existing.last_occurrence = item.created_at;
      }
    } else {
      fallbackMap.set(key, {
        id: item.id,
        agent_id: item.agent_id,
        original_provider: item.provider,
        original_model: item.model,
        fallback_provider: item.provider,
        fallback_model: item.model,
        reason: item.error_message || "Unknown fallback reason",
        count: 1,
        last_occurrence: item.created_at,
        avg_latency_increase: 0,
      });
    }
  });

  return Array.from(fallbackMap.values()).sort((a, b) => b.count - a.count);
}

// ============================================
// ALERT DETECTION
// ============================================

export interface AlertData {
  id: string;
  type: 'consecutive_failures' | 'high_latency' | 'cost_spike' | 'provider_down';
  provider: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  threshold: string;
  currentValue: number;
  triggered_at: Date;
  acknowledged: boolean;
}

export async function detectAlerts(
  userId: string,
  dateRange: { startDate: string; endDate: string },
): Promise<AlertData[]> {
  const { startDate, endDate } = dateRange;
  const alerts: AlertData[] = [];

  // Check for consecutive failures
  const recentFailures = await db.aIModelUsage.findMany({
    where: {
      user_id: userId,
      status: "failed",
      created_at: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    },
    orderBy: { created_at: "desc" },
    take: 10,
  });

  // Group consecutive failures by provider
  const failureByProvider = new Map<string, { count: number; recent: Date }>();
  recentFailures.forEach(failure => {
    const existing = failureByProvider.get(failure.provider);
    if (!existing || failure.created_at.getTime() > existing.recent.getTime()) {
      failureByProvider.set(failure.provider, { count: 1, recent: failure.created_at });
    } else {
      existing.count++;
      existing.recent = failure.created_at;
    }
  });

  failureByProvider.forEach((data, provider) => {
    if (data.count >= 5) {
      alerts.push({
        id: `alert-fail-${provider}-${Date.now()}`,
        type: 'consecutive_failures',
        provider,
        severity: data.count >= 10 ? 'critical' : data.count >= 7 ? 'high' : 'medium',
        message: `${provider} has experienced ${data.count} consecutive failures`,
        threshold: '5 failures',
        currentValue: data.count,
        triggered_at: data.recent,
        acknowledged: false,
      });
    }
  });

  // Check for high latency
  const latencyData = await db.aIModelUsage.groupBy({
    by: ["provider"],
    where: {
      user_id: userId,
      created_at: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    },
    _avg: {
      latency_ms: true,
    },
  });

  latencyData.forEach(item => {
    if ((item._avg.latency_ms || 0) > 30000) { // 30 seconds
      alerts.push({
        id: `alert-latency-${item.provider}-${Date.now()}`,
        type: 'high_latency',
        provider: item.provider,
        severity: (item._avg.latency_ms || 0) > 60000 ? 'critical' : 'high',
        message: `${item.provider} has high average latency: ${Math.round(item._avg.latency_ms!)}ms`,
        threshold: '30000ms',
        currentValue: Math.round(item._avg.latency_ms!),
        triggered_at: new Date(),
        acknowledged: false,
      });
    }
  });

  // Check for cost spikes
  const costData = await db.aIModelUsage.groupBy({
    by: ["provider"],
    where: {
      user_id: userId,
      created_at: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    },
    _sum: {
      cost_usd: true,
    },
  });

  costData.forEach(item => {
    const totalCost = item._sum.cost_usd || 0;
    if (totalCost > 10) {
      alerts.push({
        id: `alert-cost-${item.provider}-${Date.now()}`,
        type: 'cost_spike',
        provider: item.provider,
        severity: totalCost > 50 ? 'critical' : totalCost > 25 ? 'high' : 'medium',
        message: `${item.provider} has high cost: $${totalCost.toFixed(2)} in the period`,
        threshold: '$10',
        currentValue: totalCost,
        triggered_at: new Date(),
        acknowledged: false,
      });
    }
  });

  return alerts;
}

// ============================================
// COST PROJECTION
// ============================================

export interface CostProjection {
  currentDailyAvg: number;
  projectedWeekly: number;
  projectedMonthly: number;
  projectedYearly: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  percentChange: number;
}

export async function getCostProjection(
  userId: string,
  dateRange: { startDate: string; endDate: string },
): Promise<CostProjection> {
  const { startDate, endDate } = dateRange;

  // Get current period cost
  const currentCost = await db.aIModelUsage.aggregate({
    where: {
      user_id: userId,
      created_at: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    },
    _sum: {
      cost_usd: true,
    },
  });

  // Get previous period for trend comparison
  const start = new Date(startDate);
  const end = new Date(endDate);
  const periodLength = end.getTime() - start.getTime();
  const previousStart = new Date(start.getTime() - periodLength);
  const previousEnd = new Date(end.getTime() - periodLength);

  const previousCost = await db.aIModelUsage.aggregate({
    where: {
      user_id: userId,
      created_at: {
        gte: previousStart,
        lte: previousEnd,
      },
    },
    _sum: {
      cost_usd: true,
    },
  });

  const currentTotal = currentCost._sum.cost_usd || 0;
  const previousTotal = previousCost._sum.cost_usd || 0;
  
  const currentDays = Math.max(1, periodLength / (1000 * 60 * 60 * 24));
  const currentDailyAvg = currentTotal / currentDays;

  // Calculate trend
  let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
  let percentChange = 0;
  
  if (previousTotal > 0) {
    percentChange = ((currentTotal - previousTotal) / previousTotal) * 100;
    if (percentChange > 10) trend = 'increasing';
    else if (percentChange < -10) trend = 'decreasing';
  }

  return {
    currentDailyAvg: Math.round(currentDailyAvg * 100) / 100,
    projectedWeekly: Math.round(currentDailyAvg * 7 * 100) / 100,
    projectedMonthly: Math.round(currentDailyAvg * 30 * 100) / 100,
    projectedYearly: Math.round(currentDailyAvg * 365 * 100) / 100,
    trend,
    percentChange: Math.round(percentChange * 100) / 100,
  };
}
