import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server-lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { handleApiError } from "@/lib/api-errors";

interface Notification {
  id: string;
  type: "lead" | "appointment" | "conversation" | "system" | "ai";
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    // In a real implementation, you would have a notifications table
    // For now, we'll generate notifications based on recent activity

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get recent leads
    const recentLeads = await prisma.lead.findMany({
      where: {
        created_at: {
          gte: oneDayAgo,
        },
      },
      orderBy: {
        created_at: "desc",
      },
      take: 5,
    });

    // Get upcoming appointments
    const upcomingAppointments = await prisma.appointment.findMany({
      where: {
        status: "scheduled",
        scheduled_at: {
          gte: now,
          lte: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Next 24 hours
        },
      },
      include: {
        lead: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        scheduled_at: "asc",
      },
    });

    // Get active conversations
    const activeConversations = await prisma.conversation.findMany({
      where: {
        status: "active",
      },
      include: {
        lead: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      take: 3,
    });

    // Get recent AI usage
    const recentAiUsage = await prisma.aIModelUsage.findMany({
      where: {
        created_at: {
          gte: oneDayAgo,
        },
        status: "failed",
      },
      orderBy: {
        created_at: "desc",
      },
      take: 3,
    });

    // Generate notifications
    const notifications: Notification[] = [];

    // New leads notifications
    recentLeads.forEach((lead) => {
      notifications.push({
        id: `lead-${lead.id}`,
        type: "lead",
        title: "New Lead Created",
        message: `${lead.name} from ${lead.company || "Unknown Company"} just signed up`,
        data: { leadId: lead.id },
        read: false,
        created_at: lead.created_at.toISOString(),
      });
    });

    // Upcoming appointments notifications
    upcomingAppointments.forEach((appointment) => {
      const timeUntil =
        new Date(appointment.scheduled_at).getTime() - now.getTime();
      const hoursUntil = Math.round(timeUntil / (1000 * 60 * 60));

      notifications.push({
        id: `appointment-${appointment.id}`,
        type: "appointment",
        title: "Upcoming Appointment",
        message: `Appointment with ${appointment.lead.name} in ${hoursUntil} hours`,
        data: { appointmentId: appointment.id },
        read: false,
        created_at: appointment.created_at.toISOString(),
      });
    });

    // Active conversations notifications
    activeConversations.forEach((conversation) => {
      if (conversation.lead) {
        notifications.push({
          id: `conversation-${conversation.id}`,
          type: "conversation",
          title: "Active Conversation",
          message: `${conversation.lead.name} is waiting for a response`,
          data: { conversationId: conversation.id },
          read: false,
          created_at: conversation.created_at.toISOString(),
        });
      }
    });

    // AI errors notifications
    recentAiUsage.forEach((usage) => {
      notifications.push({
        id: `ai-error-${usage.id}`,
        type: "ai",
        title: "AI Request Failed",
        message: `AI request to ${usage.provider} failed: ${usage.error_message || "Unknown error"}`,
        data: { usageId: usage.id },
        read: false,
        created_at: usage.created_at.toISOString(),
      });
    });

    // System notifications based on metrics
    const totalLeads = await prisma.lead.count();
    if (totalLeads > 0 && totalLeads % 50 === 0) {
      notifications.push({
        id: `milestone-${totalLeads}`,
        type: "system",
        title: "Milestone Reached!",
        message: `Congratulations! You've reached ${totalLeads} total leads`,
        data: { milestone: totalLeads },
        read: false,
        created_at: now.toISOString(),
      });
    }

    // Sort by creation date (newest first)
    notifications.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    // Limit to latest 20 notifications
    const limitedNotifications = notifications.slice(0, 20);

    return NextResponse.json({
      notifications: limitedNotifications,
      unreadCount: limitedNotifications.filter((n) => !n.read).length,
    });
  } catch (error) {
    console.error("Notifications error:", error);
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request);

    const body = await request.json();
    const { notificationIds } = body;

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return NextResponse.json(
        { error: "Invalid notification IDs" },
        { status: 400 },
      );
    }

    // In a real implementation, you would update the notifications table
    // For now, we'll just return success since we're generating notifications dynamically

    return NextResponse.json({
      success: true,
      message: "Notifications marked as read",
    });
  } catch (error) {
    console.error("Mark notifications read error:", error);
    return handleApiError(error);
  }
}
