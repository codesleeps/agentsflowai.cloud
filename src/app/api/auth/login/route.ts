import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { handleApiError, createSuccessResponse } from "@/lib/api-errors";
import { validateAndSanitize, LoginSchema } from "@/lib/validation-schemas";
import { ZodError } from "zod";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate login data
    const validatedData = validateAndSanitize(LoginSchema, body);

    // Sign in using Better Auth
    // Note: TypeScript may not recognize signIn in auth.api types, but it exists
    const signInResult = await (auth.api as any).signIn({
      body: {
        email: validatedData.email,
        password: validatedData.password,
      },
    });

    // Return success response
    return createSuccessResponse(
      {
        user: {
          id: signInResult.user.id,
          email: signInResult.user.email,
          name: signInResult.user.name,
        },
        session: {
          token: signInResult.session.token,
          expiresAt: signInResult.session.expiresAt,
        },
      },
      "Login successful",
    );
  } catch (error) {
    // Handle Better Auth errors
    if (error && typeof error === "object" && "status" in error) {
      const authError = error as { status?: number; message?: string };
      if (authError.status === 400 || authError.status === 401) {
        return NextResponse.json(
          {
            error: authError.message || "Invalid credentials",
            code: "AUTH_ERROR",
          },
          { status: authError.status },
        );
      }
    }

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return handleApiError(error as Error);
  }
}
