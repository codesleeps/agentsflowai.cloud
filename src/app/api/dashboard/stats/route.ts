import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server-lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { handleApiError } from "@/lib/api-errors";
import type { DashboardStats } from "@/shared/models/types";

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuth(request);

    // Get total leads
    const totalLeads = await prisma.lead.count();

    // Get qualified leads (qualified, proposal, won)
    const qualifiedLeads = await prisma.lead.count({
      where: {
        status: {
          in: ["qualified", "proposal", "won"],
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

    // Calculate revenue from won leads
    const wonLeads = await prisma.lead.count({
      where: {
        status: "won",
      },
    });
    const revenue = wonLeads * 4999; // Estimated based on enterprise package

    // Get leads by status
    const leadsByStatusData = await prisma.lead.groupBy({
      by: ["status"],
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
    });

    // Get leads by source
    const leadsBySourceData = await prisma.lead.groupBy({
      by: ["source"],
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
    });

    // Get recent leads
    const recentLeads = await prisma.lead.findMany({
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

    // Get additional analytics
    const today = new Date();
    const lastMonth = new Date(
      today.getFullYear(),
      today.getMonth() - 1,
      today.getDate(),
    );

    // Monthly leads growth
    const currentMonthLeads = await prisma.lead.count({
      where: {
        created_at: {
          gte: new Date(today.getFullYear(), today.getMonth(), 1),
        },
      },
    });

    const lastMonthLeads = await prisma.lead.count({
      where: {
        created_at: {
          gte: lastMonth,
          lt: new Date(today.getFullYear(), today.getMonth(), 1),
        },
      },
    });

    // AI Model Usage Stats
    const aiUsageThisMonth = await prisma.aIModelUsage.count({
      where: {
        created_at: {
          gte: new Date(today.getFullYear(), today.getMonth(), 1),
        },
      },
    });

    // Email campaign performance
    const emailCampaigns = await prisma.emailCampaign.findMany({
      where: {
        created_at: {
          gte: new Date(today.getFullYear(), today.getMonth(), 1),
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
        status: lead.status as Lead["status"],
        source: lead.source as Lead["source"],
      })),
      // Additional analytics data
      monthlyGrowth: {
        current: currentMonthLeads,
        previous: lastMonthLeads,
        percentage:
          lastMonthLeads > 0
            ? Math.round(
                ((currentMonthLeads - lastMonthLeads) / lastMonthLeads) * 100,
              )
            : 0,
      },
      aiUsage: {
        requestsThisMonth: aiUsageThisMonth,
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
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return handleApiError(error);
  }
}
