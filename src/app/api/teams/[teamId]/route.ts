import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity-log";

/**
 * GET /api/teams/[teamId]
 * Get a specific team
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> },
) {
  try {
    const user = await requireAuth(request);
    const { teamId } = await params;
    const { prisma } = await import("@/server-lib/prisma");

    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        OR: [
          { owner_id: user.id },
          { members: { some: { user_id: user.id } } },
        ],
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true, image: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
      },
    });

    if (!team) {
      return NextResponse.json(
        { error: "Team not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: team,
    });
  } catch (error) {
    console.error("Failed to fetch team:", error);
    return NextResponse.json(
      { error: "Failed to fetch team", code: "TEAM_FETCH_FAILED" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/teams/[teamId]
 * Update a team
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> },
) {
  try {
    const user = await requireAuth(request);
    const { teamId } = await params;
    const body = await request.json();
    const { name, description, slug, website, logo_url } = body;

    const { prisma } = await import("@/server-lib/prisma");

    // Check if user has permission to update the team
    const membership = await prisma.teamMember.findFirst({
      where: {
        team_id: teamId,
        user_id: user.id,
        role: { in: ["owner", "admin"] },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Insufficient permissions to update team", code: "FORBIDDEN" },
        { status: 403 },
      );
    }

    const team = await prisma.team.update({
      where: { id: teamId },
      data: {
        name,
        description,
        slug,
        website,
        logo_url,
      },
    });

    // Log the activity
    await logActivity({
      userId: user.id,
      type: "TEAM_UPDATE",
      description: `Updated team: ${team.name}`,
      resourceType: "team",
      resourceId: team.id,
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
    });

    return NextResponse.json({
      success: true,
      data: team,
      message: "Team updated successfully",
    });
  } catch (error) {
    console.error("Failed to update team:", error);
    return NextResponse.json(
      { error: "Failed to update team", code: "TEAM_UPDATE_FAILED" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/teams/[teamId]
 * Delete a team
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> },
) {
  try {
    const user = await requireAuth(request);
    const { teamId } = await params;
    const { prisma } = await import("@/server-lib/prisma");

    // Check if user is the owner
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        owner_id: user.id,
      },
    });

    if (!team) {
      return NextResponse.json(
        {
          error: "Team not found or you don't have permission to delete it",
          code: "FORBIDDEN",
        },
        { status: 403 },
      );
    }

    await prisma.team.delete({
      where: { id: teamId },
    });

    // Log the activity
    await logActivity({
      userId: user.id,
      type: "TEAM_DELETE",
      description: `Deleted team: ${team.name}`,
      resourceType: "team",
      resourceId: teamId,
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
    });

    return NextResponse.json({
      success: true,
      message: "Team deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete team:", error);
    return NextResponse.json(
      { error: "Failed to delete team", code: "TEAM_DELETE_FAILED" },
      { status: 500 },
    );
  }
}
