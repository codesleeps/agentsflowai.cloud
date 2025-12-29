import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { handleApiError } from "@/lib/api-errors";
import axios from "axios";
import { z } from "zod";
import { prisma } from "@/server-lib/prisma";
import type {
  ForagerPersonalEmailLookupInput,
  ForagerPersonalEmailLookup,
} from "@/shared/models/built-in-integrations/forager";

// Validation schema for query parameters
const ForagerQuerySchema = z.object({
  person_id: z.string().optional(),
  linkedin_public_identifier: z.string(),
});

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuth(request);

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryData = {
      person_id: searchParams.get("person_id") || undefined,
      linkedin_public_identifier: searchParams.get(
        "linkedin_public_identifier",
      )!,
    };

    const validatedParams = ForagerQuerySchema.parse(queryData);

    // Check if Forager API key is configured
    const foragerApiKey = process.env.FORAGER_API_KEY;
    if (!foragerApiKey) {
      return NextResponse.json(
        {
          error: "Forager API key not configured",
          code: "INTEGRATION_NOT_CONFIGURED",
        },
        { status: 503 },
      );
    }

    // Build request payload for Forager API
    const foragerPayload: ForagerPersonalEmailLookupInput = {
      linkedin_public_identifier: validatedParams.linkedin_public_identifier,
    };

    if (validatedParams.person_id) {
      foragerPayload.person_id = validatedParams.person_id;
    }

    // Make request to Forager API
    const foragerResponse = await axios.post<ForagerPersonalEmailLookup[]>(
      "https://api.forager.ai/v1/personal_email_lookup",
      foragerPayload,
      {
        headers: {
          Authorization: `Bearer ${foragerApiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 30000, // 30 second timeout
      },
    );

    // Log the API usage for analytics
    await prisma.activityLog.create({
      data: {
        user_id: user.id,
        type: "AGENT_RUN",
        description: "Forager personal email lookup API call",
        metadata: {
          integration: "forager",
          endpoint: "personal-email",
          linkedin_identifier: validatedParams.linkedin_public_identifier,
          person_id: validatedParams.person_id,
          emails_returned: foragerResponse.data?.length || 0,
        },
      },
    });

    return NextResponse.json(foragerResponse.data);
  } catch (error) {
    console.error("Forager API error:", error);

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
            error: "Invalid Forager API key",
            code: "AUTHENTICATION_ERROR",
          },
          { status: 401 },
        );
      }

      if (error.response?.status === 429) {
        return NextResponse.json(
          {
            error: "Forager API rate limit exceeded",
            code: "RATE_LIMIT_EXCEEDED",
          },
          { status: 429 },
        );
      }

      if (error.response?.status === 404) {
        return NextResponse.json(
          {
            error: "Person not found in Forager",
            code: "NOT_FOUND",
          },
          { status: 404 },
        );
      }

      // Handle Forager-specific error responses
      if (error.response?.data?.error) {
        return NextResponse.json(
          {
            error: error.response.data.error,
            code: "FORAGER_API_ERROR",
          },
          { status: error.response.status },
        );
      }
    }

    return handleApiError(error);
  }
}
