import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { handleApiError } from "@/lib/api-errors";
import { db } from "@/server-lib/prisma";
import { z } from "zod";

const CreateCampaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  topic: z.string().min(1, "Topic is required"),
  targetAudience: z.string().optional(),
  goal: z.string().optional(),
  brandVoice: z.string().optional(),
});

/**
 * GET /api/marketing/campaigns
 * List all campaigns for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const campaigns = await db.marketingCampaign.findMany({
      where: {
        userId: user.id,
      },
      include: {
        steps: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      campaigns,
      total: campaigns.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/marketing/campaigns
 * Create a new marketing campaign
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();

    const validatedData = CreateCampaignSchema.parse(body);

    const campaign = await db.marketingCampaign.create({
      data: {
        userId: user.id,
        name: validatedData.name,
        topic: validatedData.topic,
        targetAudience: validatedData.targetAudience,
        goal: validatedData.goal,
        brandVoice: validatedData.brandVoice,
        status: "draft",
      },
      include: {
        steps: true,
      },
    });

    return NextResponse.json(
      {
        campaign,
        message: "Campaign created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
