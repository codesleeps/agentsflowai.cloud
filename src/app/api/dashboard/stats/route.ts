import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server-lib/prisma";
import { Lead } from "@prisma/client";
import { requireAuth } from "@/lib/auth-helpers";
import { handleApiError } from "@/lib/api-errors";
import type { DashboardStats, Lead as AppLead } from "@/shared/models/types";

// Date range type for filtering
interface DateRange {
  start: Date;
  end: Date;
}

// Helper function to parse date range from query params
function parseDateRange(searchParams: URLSearchParams): DateRange {
  const startParam = searchParams.get("startDate");
  const endParam = searchParams.get("endDate");

  const today = new Date();

  if (startParam && endParam) {
    return {
      start: new Date(startParam),
      end: new Date(endParam),
    };
  }

  // Default to current month
  return {
    start: new Date(today.getFullYear(), today.getMonth(), 1),
    end: new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59),
  };
}

// Helper function to get comparison period
function getComparisonPeriod(dateRange: DateRange): DateRange {
  const rangeLength = dateRange.end.getTime() - dateRange.start.getTime();
  const comparisonStart = new Date(dateRange.start.getTime() - rangeLength);
  const comparisonEnd = new Date(dateRange.start.getTime() - 1);

  return {
    start: comparisonStart,
    end: comparisonEnd,
  };
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuth(request);

    // Parse date range from query params
    const { searchParams } = new URL(request.url);
    const dateRange = parseDateRange(searchParams);
    const comparisonRange = getComparisonPeriod(dateRange);

    // Get total leads for the date range
    const totalLeads = await prisma.lead.count({
      where: {
        created_at: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      },
    });

    // Get qualified leads (qualified, proposal, won) for the date range
    const qualifiedLeads = await prisma.lead.count({
      where: {
        status: {
          in: ["qualified", "proposal", "won"],
        },
        created_at: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      },
    });

    // Get active conversations
    const activeConversations = await prisma.conversation.count({
      where: {
        status: "active",
      },
    });

    // Get upcoming appointments
    const upcomingAppointments = await prisma.appointment.count({
      where: {
        status: "scheduled",
        scheduled_at: {
          gt: new Date(),
        },
      },
    });

    // Calculate revenue from won leads in the date range
    const wonLeads = await prisma.lead.count({
      where: {
        status: "won",
        created_at: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      },
    });
    const revenue = wonLeads * 4999; // Estimated based on enterprise package

    // Get leads by status for the date range
    const leadsByStatusData = await prisma.lead.groupBy({
      by: ["status"],
      where: {
        created_at: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
    });

    // Get leads by source for the date range
    const leadsBySourceData = await prisma.lead.groupBy({
      by: ["source"],
      where: {
        created_at: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
    });

    // Get recent leads for the date range
    const recentLeads = await prisma.lead.findMany({
      where: {
        created_at: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      },
      orderBy: {
        created_at: "desc",
      },
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
        phone: true,
        source: true,
        status: true,
        score: true,
        created_at: true,
      },
    });

    // Get additional analytics with date range comparison

    // Period comparison for growth calculation
    const currentPeriodLeads = totalLeads;

    const previousPeriodLeads = await prisma.lead.count({
      where: {
        created_at: {
          gte: comparisonRange.start,
          lte: comparisonRange.end,
        },
      },
    });

    // AI Model Usage Stats for the date range
    const aiUsageThisPeriod = await prisma.aIModelUsage.count({
      where: {
        created_at: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      },
    });

    // Email campaign performance for the date range
    const emailCampaigns = await prisma.emailCampaign.findMany({
      where: {
        created_at: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      },
      select: {
        id: true,
        emails_sent: true,
        emails_opened: true,
        emails_clicked: true,
        conversion_count: true,
      },
    });

    const totalEmailsSent = emailCampaigns.reduce(
      (sum, campaign) => sum + campaign.emails_sent,
      0,
    );
    const totalEmailsOpened = emailCampaigns.reduce(
      (sum, campaign) => sum + campaign.emails_opened,
      0,
    );
    const totalEmailsClicked = emailCampaigns.reduce(
      (sum, campaign) => sum + campaign.emails_clicked,
      0,
    );

    const stats: DashboardStats = {
      totalLeads,
      qualifiedLeads,
      conversionRate:
        totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : 0,
      activeConversations,
      upcomingAppointments,
      revenue,
      leadsByStatus: leadsByStatusData.map((item) => ({
        status: item.status,
        count: item._count.id,
      })),
      leadsBySource: leadsBySourceData.map((item) => ({
        source: item.source,
        count: item._count.id,
      })),
      recentLeads: recentLeads.map((lead) => ({
        ...lead,
        budget: null,
        timeline: null,
        interests: [],
        notes: null,
        qualified_at: null,
        updated_at: lead.created_at.toISOString(),
        status: lead.status as AppLead["status"],
        source: lead.source as AppLead["source"],
        created_at: lead.created_at.toISOString(),
      })),
      // Enhanced analytics with period comparison
      periodComparison: {
        current: {
          leads: currentPeriodLeads,
          startDate: dateRange.start.toISOString(),
          endDate: dateRange.end.toISOString(),
        },
        previous: {
          leads: previousPeriodLeads,
          startDate: comparisonRange.start.toISOString(),
          endDate: comparisonRange.end.toISOString(),
        },
        growthPercentage:
          previousPeriodLeads > 0
            ? Math.round(
              ((currentPeriodLeads - previousPeriodLeads) /
                previousPeriodLeads) *
              100,
            )
            : 0,
      },
      aiUsage: {
        requestsThisPeriod: aiUsageThisPeriod,
      },
      emailMetrics: {
        totalSent: totalEmailsSent,
        totalOpened: totalEmailsOpened,
        totalClicked: totalEmailsClicked,
        openRate:
          totalEmailsSent > 0
            ? Math.round((totalEmailsOpened / totalEmailsSent) * 100)
            : 0,
        clickRate:
          totalEmailsSent > 0
            ? Math.round((totalEmailsClicked / totalEmailsSent) * 100)
            : 0,
      },
      dateRange: {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
      },
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return handleApiError(error);
  }
}
