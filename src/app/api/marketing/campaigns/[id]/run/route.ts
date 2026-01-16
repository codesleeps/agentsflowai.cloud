import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { handleApiError } from "@/lib/api-errors";
import { runNextCampaignStep } from "@/server-lib/marketing-agents";

/**
 * POST /api/marketing/campaigns/[id]/run
 * Run the next pending step in the campaign (research or content)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request);

    // Run next step (the function handles authorization checks)
    const result = await runNextCampaignStep(params.id);

    if (result.stepType === null) {
      return NextResponse.json({
        message: "No pending steps to run. Campaign is complete or needs review.",
        stepType: null,
      });
    }

    return NextResponse.json({
      message: `${result.stepType} step completed successfully`,
      stepType: result.stepType,
      output: result.output,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
