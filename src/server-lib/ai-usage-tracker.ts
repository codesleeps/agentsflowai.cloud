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
    const cost = await calculateCost(
      params.provider,
      params.model,
      params.prompt_tokens,
      params.completion_tokens,
    );

    const { user_id, ...rest } = params;
    const total_tokens = params.prompt_tokens + params.completion_tokens;

    await db.aIModelUsage.create({
      data: {
        ...rest,
        user: { connect: { id: user_id } },
        total_tokens,
        cost_usd: cost,
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

export async function logIntegrationError(
  userId: string,
  endpoint: string,
  error: Error,
  prompt: string,
) {
  try {
    await db.aIModelUsage.create({
      data: {
        user: { connect: { id: userId } },
        agent_id: "integration-endpoint",
        provider: "integration",
        model: endpoint,
        prompt_tokens: 0,
        completion_tokens: 0,
        cost_usd: 0,
        latency_ms: 0,
        status: "failed",
        error_message: error.message,
        total_tokens: 0,
      },
    });
  } catch (logError) {
    console.error("Failed to log integration error:", logError);
  }
}
