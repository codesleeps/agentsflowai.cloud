import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import {
  getUserActivities,
  getAllActivities,
  ActivityTypeDescriptions,
} from "@/lib/activity-log";

/**
 * GET /api/activities
 * Get activity logs for the current user or team
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const type = searchParams.get("type") as ActivityType | null;
    const resourceType = searchParams.get("resourceType") || undefined;

    const activities = await getUserActivities(user.id, {
      limit,
      offset,
      type: type || undefined,
    });

    // Add human-readable descriptions
    const activitiesWithDescriptions = activities.map((activity) => ({
      ...activity,
      typeDescription:
        ActivityTypeDescriptions[activity.type as ActivityType] ||
        activity.type,
    }));

    return NextResponse.json({
      success: true,
      data: activitiesWithDescriptions,
      meta: {
        limit,
        offset,
        total: activities.length,
      },
    });
  } catch (error) {
    console.error("Failed to fetch activities:", error);
    return NextResponse.json(
      { error: "Failed to fetch activities", code: "ACTIVITIES_FETCH_FAILED" },
      { status: 500 },
    );
  }
}
