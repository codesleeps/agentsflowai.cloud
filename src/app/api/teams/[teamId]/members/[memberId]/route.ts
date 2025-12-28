import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity-log";

/**
 * PATCH /api/teams/[teamId]/members/[memberId]
 * Update a team member's role
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; memberId: string }> },
) {
  try {
    const user = await requireAuth(request);
    const { teamId, memberId } = await params;
    const body = await request.json();
    const { role } = body;

    if (!role) {
      return NextResponse.json(
        { error: "Role is required", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const { prisma } = await import("@/server-lib/prisma");

    // Check if user has permission to update members
    const membership = await prisma.teamMember.findFirst({
      where: {
        team_id: teamId,
        user_id: user.id,
        role: { in: ["owner", "admin"] },
      },
    });

    if (!membership) {
      return NextResponse.json(
        {
          error: "Insufficient permissions to update team members",
          code: "FORBIDDEN",
        },
        { status: 403 },
      );
    }

    // Get the member being updated
    const memberToUpdate = await prisma.teamMember.findUnique({
      where: { id: memberId },
      include: { user: true },
    });

    if (!memberToUpdate || memberToUpdate.team_id !== teamId) {
      return NextResponse.json(
        { error: "Team member not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    // Prevent changing the owner's role
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (team?.owner_id === memberToUpdate.user_id && role !== "owner") {
      return NextResponse.json(
        { error: "Cannot change the owner's role", code: "FORBIDDEN" },
        { status: 403 },
      );
    }

    const updatedMember = await prisma.teamMember.update({
      where: { id: memberId },
      data: { role },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    // Log the activity
    await logActivity({
      userId: user.id,
      type: "TEAM_UPDATE_MEMBER_ROLE",
      description: `Updated ${memberToUpdate.user.name || memberToUpdate.user.email}'s role to ${role}`,
      resourceType: "team",
      resourceId: teamId,
      metadata: { memberId, oldRole: memberToUpdate.role, newRole: role },
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
    });

    return NextResponse.json({
      success: true,
      data: updatedMember,
      message: "Member role updated successfully",
    });
  } catch (error) {
    console.error("Failed to update team member:", error);
    return NextResponse.json(
      { error: "Failed to update team member", code: "MEMBER_UPDATE_FAILED" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/teams/[teamId]/members/[memberId]
 * Remove a team member
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; memberId: string }> },
) {
  try {
    const user = await requireAuth(request);
    const { teamId, memberId } = await params;
    const { prisma } = await import("@/server-lib/prisma");

    // Get the member to be removed
    const memberToRemove = await prisma.teamMember.findUnique({
      where: { id: memberId },
      include: { user: true, team: true },
    });

    if (!memberToRemove || memberToRemove.team_id !== teamId) {
      return NextResponse.json(
        { error: "Team member not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    // Check permissions
    const isSelf = memberToRemove.user_id === user.id;
    const isOwner = memberToRemove.team.owner_id === user.id;
    const isAdmin = await prisma.teamMember.findFirst({
      where: {
        team_id: teamId,
        user_id: user.id,
        role: { in: ["owner", "admin"] },
      },
    });

    if (!isSelf && !isAdmin) {
      return NextResponse.json(
        {
          error: "Insufficient permissions to remove team members",
          code: "FORBIDDEN",
        },
        { status: 403 },
      );
    }

    // Prevent removing the owner
    if (isOwner) {
      return NextResponse.json(
        { error: "Cannot remove the team owner", code: "FORBIDDEN" },
        { status: 403 },
      );
    }

    await prisma.teamMember.delete({
      where: { id: memberId },
    });

    // Log the activity
    await logActivity({
      userId: user.id,
      type: "TEAM_REMOVE_MEMBER",
      description: `Removed ${memberToRemove.user.name || memberToRemove.user.email} from team`,
      resourceType: "team",
      resourceId: teamId,
      metadata: { removedUserId: memberToRemove.user_id },
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
    });

    return NextResponse.json({
      success: true,
      message: "Team member removed successfully",
    });
  } catch (error) {
    console.error("Failed to remove team member:", error);
    return NextResponse.json(
      { error: "Failed to remove team member", code: "MEMBER_REMOVE_FAILED" },
      { status: 500 },
    );
  }
}
