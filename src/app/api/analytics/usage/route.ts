/**
 * Usage Analytics API
 * Provides endpoints for retrieving AI usage statistics
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import {
  getUserUsageStats,
  getTimeSeriesData,
  getProviderBreakdown,
  getModelBreakdown,
  getAgentUsageStats,
  checkBudgetAlerts,
  exportUsageToCSV,
} from "@/lib/ai/analytics/usage-tracker";

// GET /api/analytics/usage
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    
    const type = searchParams.get("type") || "stats";
    const days = parseInt(searchParams.get("days") || "30");
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    switch (type) {
      case "stats": {
        const stats = await getUserUsageStats(user.id, {
          start: startDate,
          end: endDate,
        });
        return NextResponse.json({ stats });
      }

      case "timeseries": {
        const data = await getTimeSeriesData(user.id, days);
        return NextResponse.json({ data });
      }

      case "providers": {
        const breakdown = await getProviderBreakdown(user.id, {
          start: startDate,
          end: endDate,
        });
        return NextResponse.json({ breakdown });
      }

      case "models": {
        const breakdown = await getModelBreakdown(user.id, {
          start: startDate,
          end: endDate,
        });
        return NextResponse.json({ breakdown });
      }

      case "agents": {
        const stats = await getAgentUsageStats(user.id, {
          start: startDate,
          end: endDate,
        });
        return NextResponse.json({ stats });
      }

      case "alerts": {
        const dailyBudget = parseFloat(searchParams.get("dailyBudget") || "0");
        const monthlyBudget = parseFloat(searchParams.get("monthlyBudget") || "0");
        
        const alerts = await checkBudgetAlerts(user.id, {
          daily: dailyBudget || undefined,
          monthly: monthlyBudget || undefined,
        });
        return NextResponse.json({ alerts });
      }

      default:
        return NextResponse.json(
          { error: "Invalid type parameter" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Analytics API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

// POST /api/analytics/usage/export
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const { days = 30 } = body;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get raw usage data
    const { prisma } = await import("@/lib/prisma");
    const usages = await prisma.aIModelUsage.findMany({
      where: {
        user_id: user.id,
        created_at: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    // Export to CSV
    const csv = exportUsageToCSV(usages as unknown as import("@/lib/ai/analytics/usage-tracker").UsageExportRow[]);

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="usage-export-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export API error:", error);
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 }
    );
  }
}
