import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { handleApiError } from "@/lib/api-errors";
import axios from "axios";
import { z } from "zod";
import { prisma } from "@/server-lib/prisma";
import type {
  CrustdataEnrichmentApiQueryParams,
  CrustdataEnrichmentApiResponse,
  CrustdataPersonProfile,
} from "@/shared/models/built-in-integrations/crustdata";

// Validation schema for query parameters
const CrustdataQuerySchema = z
  .object({
    linkedin_profile_url: z.string().optional(),
    business_email: z.string().optional(),
    enrich_realtime: z
      .string()
      .transform((val) => val === "true")
      .optional(),
    fields: z.string().optional(),
  })
  .refine((data) => data.linkedin_profile_url || data.business_email, {
    message: "Either linkedin_profile_url or business_email must be provided",
    path: ["linkedin_profile_url"], // Point to the first field for the error
  });

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuth(request);

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryData = {
      linkedin_profile_url:
        searchParams.get("linkedin_profile_url") || undefined,
      business_email: searchParams.get("business_email") || undefined,
      enrich_realtime: searchParams.get("enrich_realtime") || undefined,
      fields: searchParams.get("fields") || undefined,
    };

    const validatedParams = CrustdataQuerySchema.parse(queryData);

    // Check if Crustdata API key is configured
    const crustdataApiKey = process.env.CRUSTDATA_API_KEY;
    if (!crustdataApiKey) {
      return NextResponse.json(
        {
          error: "Crustdata API key not configured",
          code: "INTEGRATION_NOT_CONFIGURED",
        },
        { status: 503 },
      );
    }

    // Build query parameters for Crustdata API
    const crustdataParams: Record<string, string> = {};

    if (validatedParams.linkedin_profile_url) {
      crustdataParams.linkedin_profile_url =
        validatedParams.linkedin_profile_url;
    }

    if (validatedParams.business_email) {
      crustdataParams.business_email = validatedParams.business_email;
    }

    if (validatedParams.enrich_realtime) {
      crustdataParams.enrich = "true";
    }

    if (validatedParams.fields) {
      crustdataParams.fields = validatedParams.fields;
    }

    // Make request to Crustdata API
    const crustdataResponse = await axios.get<CrustdataEnrichmentApiResponse>(
      "https://api.crustdata.com/screener/person/search",
      {
        headers: {
          Authorization: `Bearer ${crustdataApiKey}`,
          "Content-Type": "application/json",
        },
        params: crustdataParams,
        timeout: 30000, // 30 second timeout
      },
    );

    // Log the API usage for analytics
    await prisma.activityLog.create({
      data: {
        user_id: user.id,
        type: "AGENT_RUN",
        description: "Crustdata person enrichment API call",
        metadata: {
          integration: "crustdata",
          endpoint: "enrich-person",
          linkedin_url: validatedParams.linkedin_profile_url,
          business_email: validatedParams.business_email,
          realtime: validatedParams.enrich_realtime,
          profiles_returned: crustdataResponse.data.profiles?.length || 0,
        },
      },
    });

    return NextResponse.json(crustdataResponse.data);
  } catch (error) {
    console.error("Crustdata API error:", error);

    // Handle specific error types
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          code: "VALIDATION_ERROR",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        return NextResponse.json(
          {
            error: "Invalid Crustdata API key",
            code: "AUTHENTICATION_ERROR",
          },
          { status: 401 },
        );
      }

      if (error.response?.status === 429) {
        return NextResponse.json(
          {
            error: "Crustdata API rate limit exceeded",
            code: "RATE_LIMIT_EXCEEDED",
          },
          { status: 429 },
        );
      }

      if (error.response?.status === 404) {
        return NextResponse.json(
          {
            error: "Person not found in Crustdata",
            code: "NOT_FOUND",
          },
          { status: 404 },
        );
      }
    }

    return handleApiError(error);
  }
}
