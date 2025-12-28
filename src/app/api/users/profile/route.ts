import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity-log";

/**
 * GET /api/users/profile
 * Get current user's profile
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch profile", code: "PROFILE_FETCH_FAILED" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/users/profile
 * Update current user's profile
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const {
      name,
      image,
      bio,
      phone,
      timezone,
      locale,
      website,
      linkedin_url,
      twitter_handle,
    } = body;

    // Import prisma dynamically to avoid import issues
    const { prisma } = await import("@/server-lib/prisma");

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        name,
        image,
        bio,
        phone,
        timezone,
        locale,
        website,
        linkedin_url,
        twitter_handle,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        bio: true,
        phone: true,
        timezone: true,
        locale: true,
        website: true,
        linkedin_url: true,
        twitter_handle: true,
        created_at: true,
        updated_at: true,
      },
    });

    // Log the activity
    await logActivity({
      userId: user.id,
      type: "USER_UPDATE_PROFILE",
      description: "Updated user profile",
      metadata: { updatedFields: Object.keys(body) },
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
    });

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Failed to update profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile", code: "PROFILE_UPDATE_FAILED" },
      { status: 500 },
    );
  }
}
