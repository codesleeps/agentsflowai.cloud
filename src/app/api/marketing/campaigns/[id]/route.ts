import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { handleApiError } from "@/lib/api-errors";
import { db } from "@/server-lib/prisma";

/**
 * GET /api/marketing/campaigns/[id]
 * Get a specific campaign with all its steps
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    const campaign = await db.marketingCampaign.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        steps: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ campaign });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/marketing/campaigns/[id]
 * Update campaign details
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const { id } = await params;

    const campaign = await db.marketingCampaign.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    const updated = await db.marketingCampaign.update({
      where: { id },
      data: {
        name: body.name,
        topic: body.topic,
        targetAudience: body.targetAudience,
        goal: body.goal,
        brandVoice: body.brandVoice,
        status: body.status,
      },
      include: {
        steps: true,
      },
    });

    return NextResponse.json({
      campaign: updated,
      message: "Campaign updated successfully",
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/marketing/campaigns/[id]
 * Delete a campaign
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    const campaign = await db.marketingCampaign.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    await db.marketingCampaign.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Campaign deleted successfully",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
