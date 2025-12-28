import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { handleApiError, createSuccessResponse } from "@/lib/api-errors";
import {
  validateAndSanitize,
  RegistrationSchema,
} from "@/lib/validation-schemas";
import { prisma } from "@/server-lib/prisma";
import { ZodError } from "zod";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate registration data
    const validatedData = validateAndSanitize(RegistrationSchema, body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          error: "An account with this email already exists",
          code: "USER_EXISTS",
        },
        { status: 409 },
      );
    }

    // Create user using Better Auth
    const signUpResult = await (auth.api as any).signUp({
      body: {
        email: validatedData.email,
        password: validatedData.password,
        name: validatedData.name,
      },
    });

    const userId = signUpResult.user.id;

    // Create default team for the user
    const teamName = `${validatedData.name || "User"}'s Team`;
    const teamSlug = `team-${userId.slice(0, 8)}`;

    // Create team and add user as owner
    const team = await prisma.team.create({
      data: {
        name: teamName,
        slug: teamSlug,
        owner_id: userId,
      },
    });

    // Add user as team owner
    await prisma.teamMember.create({
      data: {
        team_id: team.id,
        user_id: userId,
        role: "owner",
        status: "active",
        joined_at: new Date(),
      },
    });

    // Log the registration activity
    await prisma.activityLog.create({
      data: {
        user_id: userId,
        type: "USER_REGISTER",
        description: "User registered successfully",
        metadata: {
          email: validatedData.email,
          team_id: team.id,
        },
      },
    });

    // Return success response
    return createSuccessResponse(
      {
        user: {
          id: signUpResult.user.id,
          email: signUpResult.user.email,
          name: signUpResult.user.name,
          role: "user",
        },
        team: {
          id: team.id,
          name: team.name,
          slug: team.slug,
        },
      },
      "Account created successfully. Default team created.",
    );
  } catch (error) {
    // Handle Better Auth errors
    if (error && typeof error === "object" && "status" in error) {
      const authError = error as { status?: number; message?: string };
      if (authError.status === 400 || authError.status === 409) {
        return NextResponse.json(
          {
            error: authError.message || "Registration failed",
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
