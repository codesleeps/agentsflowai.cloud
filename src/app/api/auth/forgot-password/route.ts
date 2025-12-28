import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { handleApiError, createSuccessResponse } from "@/lib/api-errors";
import { z } from "zod";

const ForgotPasswordSchema = z.object({
  email: z.string().email("Invalid email format"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate email
    const validatedData = ForgotPasswordSchema.parse(body);

    // Send password reset email using Better Auth
    await auth.api.forgetPassword({
      body: {
        email: validatedData.email,
      },
    });

    // Return success (don't reveal if email exists)
    return createSuccessResponse(
      { message: "If an account exists, a password reset link has been sent" },
      "Password reset email sent",
    );
  } catch (error) {
    // Handle Better Auth errors
    if (error && typeof error === "object" && "status" in error) {
      const authError = error as { status?: number; message?: string };
      if (authError.status === 404) {
        // Don't reveal if email exists
        return createSuccessResponse(
          {
            message:
              "If an account exists, a password reset link has been sent",
          },
          "Password reset email sent",
        );
      }
    }

    return handleApiError(error as Error);
  }
}
