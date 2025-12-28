import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { handleApiError, createSuccessResponse } from "@/lib/api-errors";
import { prisma } from "@/server-lib/prisma";
import {
  validateAndSanitize,
  OnboardingCompleteSchema,
} from "@/lib/validation-schemas";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();

    const validatedData = validateAndSanitize(OnboardingCompleteSchema, body);

    // Build update data
    const updateData: any = {
      onboarding_completed: true,
    };

    // Update profile fields if provided
    if (validatedData.profileData) {
      if (validatedData.profileData.company) {
        updateData.name = validatedData.profileData.company;
      }
    }

    // Update user in database
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    return createSuccessResponse(
      {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        // onboarding_completed is a custom field in better-auth config
        onboarding_completed: (updatedUser as any).onboarding_completed,
      },
      "Onboarding completed successfully",
    );
  } catch (error) {
    return handleApiError(error as Error);
  }
}
