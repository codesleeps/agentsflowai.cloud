import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server-lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { handleApiError } from "@/lib/api-errors";

interface AnalyticsData {
  // Lead Analytics
  leadTrends: {
    monthly: { month: string; leads: number; qualified: number; won: number }[];
    statusDistribution: { status: string; count: number; percentage: number }[];
    sourceAnalysis: { source: string; count: number; conversionRate: number }[];
    scoreDistribution: { range: string; count: number }[];
  };

  // Conversation Analytics
  conversationMetrics: {
    totalConversations: number;
    activeConversations: number;
    avgResponseTime: number;
    sentimentAnalysis: { sentiment: string; count: number }[];
    channelPerformance: {
      channel: string;
      conversations: number;
      satisfaction: number;
    }[];
  };

  // AI Performance
  aiMetrics: {
    totalRequests: number;
    successfulRequests: number;
    avgResponseTime: number;
    costAnalysis: { provider: string; requests: number; cost: number }[];
    modelUsage: { model: string; requests: number; avgTokens: number }[];
  };

  // Revenue Analytics
  revenueData: {
    totalRevenue: number;
    monthlyRevenue: { month: string; revenue: number; deals: number }[];
    averageDealSize: number;
    revenueBySource: { source: string; revenue: number; deals: number }[];
  };

  // Email Campaign Performance
  emailAnalytics: {
    totalCampaigns: number;
    totalEmailsSent: number;
    openRate: number;
    clickRate: number;
    conversionRate: number;
    topPerformingCampaigns: {
      name: string;
      openRate: number;
      conversionRate: number;
    }[];
  };

  // Appointment Analytics
  appointmentMetrics: {
    totalAppointments: number;
    upcomingAppointments: number;
    completionRate: number;
    noShowRate: number;
    avgDuration: number;
    leadToAppointmentRate: number;
  };

  // Activity Tracking
  userActivity: {
    totalActivities: number;
    activityByType: { type: string; count: number }[];
    recentActivities: {
      type: string;
      description: string;
      created_at: string;
    }[];
  };

  // Predictive Analytics
  predictions: {
    nextMonthLeads: number;
    projectedRevenue: number;
    conversionProbability: number;
    churnRisk: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);

    const now = new Date();
    const sixMonthsAgo = new Date(
      now.getFullYear(),
      now.getMonth() - 6,
      now.getDate(),
    );
    const oneYearAgo = new Date(
      now.getFullYear() - 1,
      now.getMonth(),
      now.getDate(),
    );

    // Lead Trends Analysis
    const leadTrends = await Promise.all([
      // Monthly lead data for the last 6 months
      ...Array.from({ length: 6 }, async (_, i) => {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

        const [total, qualified, won] = await Promise.all([
          prisma.lead.count({
            where: { created_at: { gte: monthStart, lte: monthEnd } },
          }),
          prisma.lead.count({
            where: {
              created_at: { gte: monthStart, lte: monthEnd },
              status: "qualified",
            },
          }),
          prisma.lead.count({
            where: {
              created_at: { gte: monthStart, lte: monthEnd },
              status: "won",
            },
          }),
        ]);

        return {
          month: monthStart.toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
          }),
          leads: total,
          qualified,
          won,
        };
      }),
    ]).then((results) => results.reverse());

    // Lead Status Distribution
    const statusCounts = await prisma.lead.groupBy({
      by: ["status"],
      _count: { id: true },
    });
    const totalLeads = statusCounts.reduce(
      (sum, item) => sum + item._count.id,
      0,
    );

    const statusDistribution = statusCounts.map((item) => ({
      status: item.status,
      count: item._count.id,
      percentage:
        totalLeads > 0 ? Math.round((item._count.id / totalLeads) * 100) : 0,
    }));

    // Lead Source Analysis
    const sourceData = await prisma.lead.groupBy({
      by: ["source"],
      _count: { id: true },
    });

    const sourceAnalysis = await Promise.all(
      sourceData.map(async (source) => {
        const totalForSource = source._count.id;
        const qualifiedForSource = await prisma.lead.count({
          where: {
            source: source.source,
            status: { in: ["qualified", "proposal", "won"] },
          },
        });

        return {
          source: source.source,
          count: totalForSource,
          conversionRate:
            totalForSource > 0
              ? Math.round((qualifiedForSource / totalForSource) * 100)
              : 0,
        };
      }),
    );

    // Lead Score Distribution
    const allLeads = await prisma.lead.findMany({
      select: { score: true },
    });

    const scoreRanges = [
      { range: "0-20", min: 0, max: 20 },
      { range: "21-40", min: 21, max: 40 },
      { range: "41-60", min: 41, max: 60 },
      { range: "61-80", min: 61, max: 80 },
      { range: "81-100", min: 81, max: 100 },
    ];

    const scoreDistribution = scoreRanges.map((range) => ({
      range: range.range,
      count: allLeads.filter(
        (lead) => lead.score >= range.min && lead.score <= range.max,
      ).length,
    }));

    // Conversation Metrics
    const [totalConversations, activeConversations] = await Promise.all([
      prisma.conversation.count(),
      prisma.conversation.count({ where: { status: "active" } }),
    ]);

    const sentimentData = await prisma.conversation.groupBy({
      by: ["sentiment"],
      _count: { id: true },
    });

    const sentimentAnalysis = sentimentData
      .filter((item) => item.sentiment)
      .map((item) => ({
        sentiment: item.sentiment!,
        count: item._count.id,
      }));

    const channelData = await prisma.conversation.groupBy({
      by: ["channel"],
      _count: { id: true },
    });

    const channelPerformance = channelData.map((channel) => ({
      channel: channel.channel,
      conversations: channel._count.id,
      satisfaction: Math.floor(Math.random() * 20) + 80, // Placeholder for actual satisfaction calculation
    }));

    // AI Metrics
    const aiUsage = await prisma.aIModelUsage.findMany({
      where: { created_at: { gte: oneYearAgo } },
    });

    const totalRequests = aiUsage.length;
    const successfulRequests = aiUsage.filter(
      (usage) => usage.status === "success",
    ).length;
    const avgResponseTime =
      aiUsage.length > 0
        ? Math.round(
            aiUsage.reduce((sum, usage) => sum + usage.latency_ms, 0) /
              aiUsage.length,
          )
        : 0;

    const providerCosts = await prisma.aIProviderCost.findMany();
    const costAnalysis = providerCosts.map((provider) => ({
      provider: provider.provider,
      requests: aiUsage.filter((usage) => usage.provider === provider.provider)
        .length,
      cost:
        provider.input_cost_per_1k_tokens * 0.001 +
        provider.output_cost_per_1k_tokens * 0.001, // Simplified calculation
    }));

    const modelUsage = aiUsage.reduce(
      (acc, usage) => {
        const existing = acc.find((item) => item.model === usage.model);
        if (existing) {
          existing.requests += 1;
          existing.avgTokens = Math.round(
            (existing.avgTokens + usage.total_tokens) / 2,
          );
        } else {
          acc.push({
            model: usage.model,
            requests: 1,
            avgTokens: usage.total_tokens,
          });
        }
        return acc;
      },
      [] as { model: string; requests: number; avgTokens: number }[],
    );

    // Revenue Analytics
    const wonLeads = await prisma.lead.findMany({
      where: { status: "won" },
      select: { created_at: true },
    });

    const totalRevenue = wonLeads.length * 4999; // Enterprise package price

    // Monthly revenue for the last 6 months
    const monthlyRevenue = await Promise.all(
      Array.from({ length: 6 }, async (_, i) => {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

        const dealsInMonth = await prisma.lead.count({
          where: {
            status: "won",
            created_at: { gte: monthStart, lte: monthEnd },
          },
        });

        return {
          month: monthStart.toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
          }),
          revenue: dealsInMonth * 4999,
          deals: dealsInMonth,
        };
      }),
    ).then((results) => results.reverse());

    const averageDealSize =
      wonLeads.length > 0 ? totalRevenue / wonLeads.length : 0;

    // Revenue by source (simplified)
    const revenueBySource = sourceAnalysis.map((source) => ({
      source: source.source,
      revenue: source.count * 4999 * (source.conversionRate / 100),
      deals: Math.round(source.count * (source.conversionRate / 100)),
    }));

    // Email Campaign Analytics
    const campaigns = await prisma.emailCampaign.findMany({
      include: {
        emailsSent: true,
      },
    });

    const totalEmailsSent = campaigns.reduce(
      (sum, campaign) => sum + campaign.emails_sent,
      0,
    );
    const totalEmailsOpened = campaigns.reduce(
      (sum, campaign) => sum + campaign.emails_opened,
      0,
    );
    const totalEmailsClicked = campaigns.reduce(
      (sum, campaign) => sum + campaign.emails_clicked,
      0,
    );
    const totalConversions = campaigns.reduce(
      (sum, campaign) => sum + campaign.conversion_count,
      0,
    );

    const openRate =
      totalEmailsSent > 0
        ? Math.round((totalEmailsOpened / totalEmailsSent) * 100)
        : 0;
    const clickRate =
      totalEmailsSent > 0
        ? Math.round((totalEmailsClicked / totalEmailsSent) * 100)
        : 0;
    const conversionRate =
      totalEmailsSent > 0
        ? Math.round((totalConversions / totalEmailsSent) * 100)
        : 0;

    const topPerformingCampaigns = campaigns.slice(0, 5).map((campaign) => ({
      name: campaign.name,
      openRate:
        campaign.emails_sent > 0
          ? Math.round((campaign.emails_opened / campaign.emails_sent) * 100)
          : 0,
      conversionRate:
        campaign.emails_sent > 0
          ? Math.round((campaign.conversion_count / campaign.emails_sent) * 100)
          : 0,
    }));

    // Appointment Analytics
    const [totalAppointments, upcomingAppointments] = await Promise.all([
      prisma.appointment.count(),
      prisma.appointment.count({
        where: {
          status: "scheduled",
          scheduled_at: { gt: now },
        },
      }),
    ]);

    const completedAppointments = await prisma.appointment.count({
      where: { status: "completed" },
    });
    const noShowAppointments = await prisma.appointment.count({
      where: { status: "no-show" },
    });

    const completionRate =
      totalAppointments > 0
        ? Math.round((completedAppointments / totalAppointments) * 100)
        : 0;
    const noShowRate =
      totalAppointments > 0
        ? Math.round((noShowAppointments / totalAppointments) * 100)
        : 0;

    const appointments = await prisma.appointment.findMany();
    const avgDuration =
      appointments.length > 0
        ? Math.round(
            appointments.reduce((sum, apt) => sum + apt.duration_minutes, 0) /
              appointments.length,
          )
        : 0;

    const leadToAppointmentRate =
      totalLeads > 0 ? Math.round((totalAppointments / totalLeads) * 100) : 0;

    // User Activity
    const totalActivities = await prisma.activityLog.count();
    const activityByTypeData = await prisma.activityLog.groupBy({
      by: ["type"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    const activityByType = activityByTypeData.map((activity) => ({
      type: activity.type,
      count: activity._count.id,
    }));

    const recentActivitiesRaw = await prisma.activityLog.findMany({
      orderBy: { created_at: "desc" },
      take: 10,
      select: { type: true, description: true, created_at: true },
    });

    const recentActivities = recentActivitiesRaw.map((activity) => ({
      type: activity.type,
      description: activity.description,
      created_at: activity.created_at.toISOString(),
    }));

    // Predictive Analytics (simplified calculations)
    const currentMonthLeads = leadTrends[leadTrends.length - 1]?.leads || 0;
    const previousMonthLeads = leadTrends[leadTrends.length - 2]?.leads || 0;
    const growthRate =
      previousMonthLeads > 0
        ? (currentMonthLeads - previousMonthLeads) / previousMonthLeads
        : 0;

    const nextMonthLeads = Math.round(currentMonthLeads * (1 + growthRate));
    const projectedRevenue = nextMonthLeads * 0.4 * 4999; // Assuming 40% conversion rate

    const totalQualifiedLeads = statusDistribution
      .filter((item) => ["qualified", "proposal", "won"].includes(item.status))
      .reduce((sum, item) => sum + item.count, 0);

    const predictions = {
      nextMonthLeads,
      projectedRevenue,
      conversionProbability:
        totalLeads > 0
          ? Math.round((totalQualifiedLeads / totalLeads) * 100)
          : 0,
      churnRisk: Math.random() * 10, // Placeholder for actual churn calculation
    };

    const analyticsData: AnalyticsData = {
      leadTrends: {
        monthly: leadTrends,
        statusDistribution,
        sourceAnalysis,
        scoreDistribution,
      },
      conversationMetrics: {
        totalConversations,
        activeConversations,
        avgResponseTime,
        sentimentAnalysis,
        channelPerformance,
      },
      aiMetrics: {
        totalRequests,
        successfulRequests,
        avgResponseTime,
        costAnalysis,
        modelUsage,
      },
      revenueData: {
        totalRevenue,
        monthlyRevenue,
        averageDealSize,
        revenueBySource,
      },
      emailAnalytics: {
        totalCampaigns: campaigns.length,
        totalEmailsSent,
        openRate,
        clickRate,
        conversionRate,
        topPerformingCampaigns,
      },
      appointmentMetrics: {
        totalAppointments,
        upcomingAppointments,
        completionRate,
        noShowRate,
        avgDuration,
        leadToAppointmentRate,
      },
      userActivity: {
        totalActivities,
        activityByType,
        recentActivities,
      },
      predictions,
    };

    return NextResponse.json(analyticsData);
  } catch (error) {
    console.error("Analytics error:", error);
    return handleApiError(error);
  }
}
