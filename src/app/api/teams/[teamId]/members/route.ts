import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity-log";

/**
 * GET /api/teams/[teamId]/members
 * Get all members of a team
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> },
) {
  try {
    const user = await requireAuth(request);
    const { teamId } = await params;
    const { prisma } = await import("@/server-lib/prisma");

    const members = await prisma.teamMember.findMany({
      where: { team_id: teamId },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { joined_at: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: members,
    });
  } catch (error) {
    console.error("Failed to fetch team members:", error);
    return NextResponse.json(
      { error: "Failed to fetch team members", code: "MEMBERS_FETCH_FAILED" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/teams/[teamId]/members
 * Invite a new member to the team
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> },
) {
  try {
    const user = await requireAuth(request);
    const { teamId } = await params;
    const body = await request.json();
    const { email, role } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const { prisma } = await import("@/server-lib/prisma");

    // Check if user has permission to invite members
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
          error: "Insufficient permissions to invite members",
          code: "FORBIDDEN",
        },
        { status: 403 },
      );
    }

    // Find the user by email
    const invitedUser = await prisma.user.findUnique({
      where: { email },
    });

    if (!invitedUser) {
      return NextResponse.json(
        { error: "User with this email not found", code: "USER_NOT_FOUND" },
        { status: 404 },
      );
    }

    // Check if user is already a member
    const existingMember = await prisma.teamMember.findUnique({
      where: {
        team_id_user_id: {
          team_id: teamId,
          user_id: invitedUser.id,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: "User is already a team member", code: "ALREADY_MEMBER" },
        { status: 400 },
      );
    }

    const teamMember = await prisma.teamMember.create({
      data: {
        team_id: teamId,
        user_id: invitedUser.id,
        role: role || "member",
        status: "active",
        invited_by: user.id,
        joined_at: new Date(),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    // Log the activity
    await logActivity({
      userId: user.id,
      type: "TEAM_INVITE_MEMBER",
      description: `Invited ${email} to team`,
      resourceType: "team",
      resourceId: teamId,
      metadata: { invitedUserId: invitedUser.id, role },
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
    });

    return NextResponse.json({
      success: true,
      data: teamMember,
      message: "Member invited successfully",
    });
  } catch (error) {
    console.error("Failed to invite team member:", error);
    return NextResponse.json(
      { error: "Failed to invite team member", code: "MEMBER_INVITE_FAILED" },
      { status: 500 },
    );
  }
}
