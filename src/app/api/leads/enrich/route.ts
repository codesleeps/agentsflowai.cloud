import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { handleApiError } from "@/lib/api-errors";
import { enrichLead, batchEnrichLeads } from "@/lib/lead-enrichment";
import { z } from "zod";

// Validation schemas
const EnrichLeadSchema = z.object({
  leadId: z.string().min(1, "Lead ID is required"),
  forceRefresh: z.boolean().optional().default(false),
});

const BatchEnrichSchema = z.object({
  leadIds: z
    .array(z.string().min(1))
    .min(1, "At least one lead ID is required"),
  forceRefresh: z.boolean().optional().default(false),
});

// POST /api/leads/enrich - Enrich a single lead
export async function POST(request: NextRequest) {
  try {
    await requireAuth(request);
    const body = await request.json();

    const { leadId, forceRefresh } = EnrichLeadSchema.parse(body);

    const result = await enrichLead(leadId, forceRefresh);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: error.errors,
        },
        { status: 400 },
      );
    }
    return handleApiError(error);
  }
}
