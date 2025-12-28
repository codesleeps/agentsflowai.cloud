import { prisma } from "@/server-lib/prisma";

// Activity type string literals
export type ActivityType =
  | "USER_LOGIN"
  | "USER_LOGOUT"
  | "USER_REGISTER"
  | "USER_UPDATE_PROFILE"
  | "USER_CHANGE_PASSWORD"
  | "USER_DELETE_ACCOUNT"
  | "TEAM_CREATE"
  | "TEAM_UPDATE"
  | "TEAM_DELETE"
  | "TEAM_INVITE_MEMBER"
  | "TEAM_REMOVE_MEMBER"
  | "TEAM_UPDATE_MEMBER_ROLE"
  | "LEAD_CREATE"
  | "LEAD_UPDATE"
  | "LEAD_DELETE"
  | "LEAD_VIEW"
  | "AGENT_CREATE"
  | "AGENT_UPDATE"
  | "AGENT_DELETE"
  | "AGENT_RUN"
  | "APIKEY_CREATE"
  | "APIKEY_REVOKE"
  | "SETTINGS_UPDATE"
  | "PAGE_VIEW"
  | "EXPORT_DATA";

export interface LogActivityParams {
  userId?: string;
  type: ActivityType;
  description: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  resourceType?: string;
  resourceId?: string;
}

/**
 * Log a user activity to the database
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        userId: params.userId,
        type: params.type,
        description: params.description,
        metadata: params.metadata || {},
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
      },
    });
  } catch (error) {
    // Log to console but don't throw - activity logging should not break the main flow
    console.error("Failed to log activity:", error);
  }
}

/**
 * Get recent activities for a user
 */
export async function getUserActivities(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    type?: ActivityType;
  },
) {
  return prisma.activityLog.findMany({
    where: {
      userId,
      ...(options?.type && { type: options.type }),
    },
    orderBy: {
      created_at: "desc",
    },
    take: options?.limit || 50,
    skip: options?.offset || 0,
  });
}

/**
 * Get activities for a team
 */
export async function getTeamActivities(
  teamId: string,
  options?: {
    limit?: number;
    offset?: number;
    type?: ActivityType;
  },
) {
  const teamMembers = await prisma.teamMember.findMany({
    where: { teamId },
    select: { userId: true },
  });

  const userIds = teamMembers.map((m) => m.userId);

  return prisma.activityLog.findMany({
    where: {
      userId: { in: userIds },
      ...(options?.type && { type: options.type }),
    },
    orderBy: {
      created_at: "desc",
    },
    take: options?.limit || 50,
    skip: options?.offset || 0,
  });
}

/**
 * Get all activities (admin only)
 */
export async function getAllActivities(options?: {
  limit?: number;
  offset?: number;
  type?: ActivityType;
  userId?: string;
  resourceType?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  return prisma.activityLog.findMany({
    where: {
      ...(options?.userId && { userId: options.userId }),
      ...(options?.type && { type: options.type }),
      ...(options?.resourceType && { resourceType: options.resourceType }),
      ...(options?.startDate && { created_at: { gte: options.startDate } }),
      ...(options?.endDate && { created_at: { lte: options.endDate } }),
    },
    orderBy: {
      created_at: "desc",
    },
    take: options?.limit || 100,
    skip: options?.offset || 0,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });
}

/**
 * Activity type descriptions for display
 */
export const ActivityTypeDescriptions: Record<ActivityType, string> = {
  USER_LOGIN: "User logged in",
  USER_LOGOUT: "User logged out",
  USER_REGISTER: "User registered",
  USER_UPDATE_PROFILE: "Updated profile",
  USER_CHANGE_PASSWORD: "Changed password",
  USER_DELETE_ACCOUNT: "Deleted account",
  TEAM_CREATE: "Created team",
  TEAM_UPDATE: "Updated team",
  TEAM_DELETE: "Deleted team",
  TEAM_INVITE_MEMBER: "Invited team member",
  TEAM_REMOVE_MEMBER: "Removed team member",
  TEAM_UPDATE_MEMBER_ROLE: "Updated member role",
  LEAD_CREATE: "Created lead",
  LEAD_UPDATE: "Updated lead",
  LEAD_DELETE: "Deleted lead",
  LEAD_VIEW: "Viewed lead",
  AGENT_CREATE: "Created AI agent",
  AGENT_UPDATE: "Updated AI agent",
  AGENT_DELETE: "Deleted AI agent",
  AGENT_RUN: "Ran AI agent",
  APIKEY_CREATE: "Created API key",
  APIKEY_REVOKE: "Revoked API key",
  SETTINGS_UPDATE: "Updated settings",
  PAGE_VIEW: "Viewed page",
  EXPORT_DATA: "Exported data",
};
