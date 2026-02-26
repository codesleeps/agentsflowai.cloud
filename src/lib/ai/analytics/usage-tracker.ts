/**
 * AI Usage Tracking & Cost Analytics
 * Tracks token usage, costs, and provides analytics for AI operations
 */

import { prisma } from "@/lib/prisma";
import type { AIProvider } from "@/lib/provider-config";

// ==================== PRICING DATA ====================

interface PricingTier {
  input: number;  // per 1M tokens
  output: number; // per 1M tokens
}

export const MODEL_PRICING: Record<string, PricingTier> = {
  // OpenAI
  "gpt-4o": { input: 2.50, output: 10.00 },
  "gpt-4o-mini": { input: 0.15, output: 0.60 },
  "gpt-4-turbo": { input: 10.00, output: 30.00 },
  "gpt-3.5-turbo": { input: 0.50, output: 1.50 },
  "text-embedding-3-small": { input: 0.02, output: 0.02 },
  "text-embedding-3-large": { input: 0.13, output: 0.13 },
  
  // Anthropic
  "claude-3-5-sonnet-20241022": { input: 3.00, output: 15.00 },
  "claude-3-opus-20240229": { input: 15.00, output: 75.00 },
  "claude-3-haiku-20240307": { input: 0.25, output: 1.25 },
  
  // DeepSeek
  "deepseek-chat": { input: 0.14, output: 0.28 },
  "deepseek-coder": { input: 0.14, output: 0.28 },
  "deepseek-reasoner": { input: 0.55, output: 2.19 },
  
  // Google
  "gemini-2.0-flash": { input: 0.075, output: 0.30 },
  "gemini-2.0-pro": { input: 1.25, output: 5.00 },
  "gemini-1.5-flash": { input: 0.075, output: 0.30 },
  "gemini-1.5-pro": { input: 1.25, output: 5.00 },
  
  // OpenRouter (approximate, varies by model)
  "openrouter": { input: 1.00, output: 3.00 },
};

// ==================== TYPES ====================

export interface UsageRecord {
  userId: string;
  provider: AIProvider;
  model: string;
  agentId?: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  latencyMs: number;
  success: boolean;
}

export interface UsageStats {
  totalTokens: number;
  totalCost: number;
  requestCount: number;
  averageLatency: number;
  successRate: number;
}

export interface TimeSeriesData {
  date: string;
  tokens: number;
  cost: number;
  requests: number;
}

// ==================== COST CALCULATION ====================

export function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING["openrouter"];
  
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  
  return inputCost + outputCost;
}

export function getModelPricing(model: string): PricingTier | undefined {
  return MODEL_PRICING[model];
}

// ==================== USAGE TRACKING ====================

export async function trackUsage(record: UsageRecord): Promise<void> {
  try {
    // Store in database
    await prisma.aIModelUsage.create({
      data: {
        user_id: record.userId,
        provider: record.provider,
        model: record.model,
        agent_id: record.agentId || "",
        prompt_tokens: record.inputTokens,
        completion_tokens: record.outputTokens,
        total_tokens: record.totalTokens,
        cost_usd: record.costUsd,
        latency_ms: record.latencyMs,
        status: record.success ? "success" : "failed",
      },
    });
  } catch (error) {
    console.error("Failed to track usage:", error);
    // Don't throw - tracking failures shouldn't break the app
  }
}

// ==================== ANALYTICS QUERIES ====================

export async function getUserUsageStats(
  userId: string,
  timeRange: { start: Date; end: Date }
): Promise<UsageStats> {
  const usages = await prisma.aIModelUsage.findMany({
    where: {
      user_id: userId,
      created_at: {
        gte: timeRange.start,
        lte: timeRange.end,
      },
    },
  });

  const totalTokens = usages.reduce((sum, u) => sum + u.total_tokens, 0);
  const totalCost = usages.reduce((sum, u) => sum + u.cost_usd, 0);
  const totalLatency = usages.reduce((sum, u) => sum + u.latency_ms, 0);
  const successfulRequests = usages.filter((u) => u.status === 'success').length;

  return {
    totalTokens,
    totalCost,
    requestCount: usages.length,
    averageLatency: usages.length > 0 ? totalLatency / usages.length : 0,
    successRate: usages.length > 0 ? (successfulRequests / usages.length) * 100 : 0,
  };
}

export async function getTimeSeriesData(
  userId: string,
  days: number = 30
): Promise<TimeSeriesData[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const usages = await prisma.aIModelUsage.findMany({
    where: {
      user_id: userId,
      created_at: {
        gte: startDate,
      },
    },
    orderBy: {
      created_at: "asc",
    },
  });

  // Group by date
  const grouped = usages.reduce((acc, usage) => {
    const date = usage.created_at.toISOString().split("T")[0];
    if (!acc[date]) {
      acc[date] = { tokens: 0, cost: 0, requests: 0 };
    }
    acc[date].tokens += usage.total_tokens;
    acc[date].cost += usage.cost_usd;
    acc[date].requests += 1;
    return acc;
  }, {} as Record<string, { tokens: number; cost: number; requests: number }>);

  // Fill in missing dates
  const result: TimeSeriesData[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const data = grouped[dateStr] || { tokens: 0, cost: 0, requests: 0 };
    result.unshift({
      date: dateStr,
      tokens: data.tokens,
      cost: data.cost,
      requests: data.requests,
    });
  }

  return result;
}

export async function getProviderBreakdown(
  userId: string,
  timeRange: { start: Date; end: Date }
): Promise<Array<{ provider: string; tokens: number; cost: number; percentage: number }>> {
  const usages = await prisma.aIModelUsage.findMany({
    where: {
      user_id: userId,
      created_at: {
        gte: timeRange.start,
        lte: timeRange.end,
      },
    },
  });

  const grouped = usages.reduce((acc, usage) => {
    if (!acc[usage.provider]) {
      acc[usage.provider] = { tokens: 0, cost: 0 };
    }
    acc[usage.provider].tokens += usage.total_tokens;
    acc[usage.provider].cost += usage.cost_usd;
    return acc;
  }, {} as Record<string, { tokens: number; cost: number }>);

  const totalCost = Object.values(grouped).reduce((sum, p) => sum + p.cost, 0);

  return Object.entries(grouped).map(([provider, data]) => ({
    provider,
    tokens: data.tokens,
    cost: data.cost,
    percentage: totalCost > 0 ? (data.cost / totalCost) * 100 : 0,
  }));
}

export async function getModelBreakdown(
  userId: string,
  timeRange: { start: Date; end: Date }
): Promise<Array<{ model: string; tokens: number; cost: number; requests: number }>> {
  const usages = await prisma.aIModelUsage.findMany({
    where: {
      user_id: userId,
      created_at: {
        gte: timeRange.start,
        lte: timeRange.end,
      },
    },
  });

  const grouped = usages.reduce((acc, usage) => {
    if (!acc[usage.model]) {
      acc[usage.model] = { tokens: 0, cost: 0, requests: 0 };
    }
    acc[usage.model].tokens += usage.total_tokens;
    acc[usage.model].cost += usage.cost_usd;
    acc[usage.model].requests += 1;
    return acc;
  }, {} as Record<string, { tokens: number; cost: number; requests: number }>);

  return Object.entries(grouped)
    .map(([model, data]) => ({ model, ...data }))
    .sort((a, b) => b.cost - a.cost);
}

export async function getAgentUsageStats(
  userId: string,
  timeRange: { start: Date; end: Date }
): Promise<Array<{ agentId: string; tokens: number; cost: number; requests: number }>> {
  const usages = await prisma.aIModelUsage.findMany({
    where: {
      user_id: userId,
      agent_id: { not: "" },
      created_at: {
        gte: timeRange.start,
        lte: timeRange.end,
      },
    },
  });

  const grouped = usages.reduce((acc, usage) => {
    const agentId = usage.agent_id || "unknown";
    if (!acc[agentId]) {
      acc[agentId] = { tokens: 0, cost: 0, requests: 0 };
    }
    acc[agentId].tokens += usage.total_tokens;
    acc[agentId].cost += usage.cost_usd;
    acc[agentId].requests += 1;
    return acc;
  }, {} as Record<string, { tokens: number; cost: number; requests: number }>);

  return Object.entries(grouped)
    .map(([agentId, data]) => ({ agentId, ...data }))
    .sort((a, b) => b.cost - a.cost);
}

// ==================== BUDGET & ALERTS ====================

export interface BudgetAlert {
  type: "daily" | "monthly" | "total";
  threshold: number;
  current: number;
  percentage: number;
}

export async function checkBudgetAlerts(
  userId: string,
  budgets: {
    daily?: number;
    monthly?: number;
  }
): Promise<BudgetAlert[]> {
  const alerts: BudgetAlert[] = [];
  const now = new Date();

  // Check daily budget
  if (budgets.daily) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStats = await getUserUsageStats(userId, {
      start: today,
      end: now,
    });

    const percentage = (todayStats.totalCost / budgets.daily) * 100;
    if (percentage >= 80) {
      alerts.push({
        type: "daily",
        threshold: budgets.daily,
        current: todayStats.totalCost,
        percentage,
      });
    }
  }

  // Check monthly budget
  if (budgets.monthly) {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthStats = await getUserUsageStats(userId, {
      start: monthStart,
      end: now,
    });

    const percentage = (monthStats.totalCost / budgets.monthly) * 100;
    if (percentage >= 80) {
      alerts.push({
        type: "monthly",
        threshold: budgets.monthly,
        current: monthStats.totalCost,
        percentage,
      });
    }
  }

  return alerts;
}

// ==================== EXPORT FUNCTIONS ====================

export interface UsageExportRow {
  created_at: Date;
  provider: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
  latency_ms: number;
  status: string;
}

export function exportUsageToCSV(usages: UsageExportRow[]): string {
  const headers = [
    "Date",
    "Provider",
    "Model",
    "Input Tokens",
    "Output Tokens",
    "Total Tokens",
    "Cost (USD)",
    "Latency (ms)",
    "Status",
  ];

  const rows = usages.map((u) => [
    u.created_at.toISOString(),
    u.provider,
    u.model,
    u.prompt_tokens,
    u.completion_tokens,
    u.total_tokens,
    u.cost_usd,
    u.latency_ms,
    u.status,
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}
