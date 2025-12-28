import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity-log";

// Team role type
export type TeamRole = "owner" | "admin" | "member" | "viewer";

/**
 * GET /api/teams
 * Get all teams for current user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { prisma } = await import("@/server-lib/prisma");

    const teams = await prisma.team.findMany({
      where: {
        OR: [
          { owner_id: user.id },
          { members: { some: { user_id: user.id } } },
        ],
        is_active: true,
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
        _count: {
          select: { members: true },
        },
      },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: teams,
    });
  } catch (error) {
    console.error("Failed to fetch teams:", error);
    return NextResponse.json(
      { error: "Failed to fetch teams", code: "TEAMS_FETCH_FAILED" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/teams
 * Create a new team
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const { name, description, slug, website } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: "Team name and slug are required", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const { prisma } = await import("@/server-lib/prisma");

    // Check if slug is already taken
    const existingTeam = await prisma.team.findUnique({
      where: { slug },
    });

    if (existingTeam) {
      return NextResponse.json(
        { error: "Team slug is already taken", code: "SLUG_TAKEN" },
        { status: 400 },
      );
    }

    // Create team with current user as owner
    const team = await prisma.team.create({
      data: {
        name,
        description,
        slug,
        website,
        owner_id: user.id,
        members: {
          create: {
            user_id: user.id,
            role: "owner" as TeamRole,
            joined_at: new Date(),
          },
        },
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

    // Log the activity
    await logActivity({
      userId: user.id,
      type: "TEAM_CREATE",
      description: `Created team: ${name}`,
      resourceType: "team",
      resourceId: team.id,
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
    });

    return NextResponse.json({
      success: true,
      data: team,
      message: "Team created successfully",
    });
  } catch (error) {
    console.error("Failed to create team:", error);
    return NextResponse.json(
      { error: "Failed to create team", code: "TEAM_CREATE_FAILED" },
      { status: 500 },
    );
  }
}
