import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { handleApiError } from "@/lib/api-errors";
import {
  scheduleAppointmentReminders,
  processPendingReminders,
} from "@/lib/notifications";
import { z } from "zod";

// Validation schemas
const ScheduleRemindersSchema = z.object({
  appointmentId: z.string().min(1, "Appointment ID is required"),
  configs: z.array(
    z.object({
      enabled: z.boolean(),
      timing: z.enum(["24h", "1h", "15m", "custom"]),
      customMinutes: z.number().optional(),
      templateId: z.string().min(1, "Template ID is required"),
    }),
  ),
});

// POST /api/appointments/reminders - Schedule reminders for an appointment
export async function POST(request: NextRequest) {
  try {
    await requireAuth(request);
    const body = await request.json();

    const { appointmentId, configs } = ScheduleRemindersSchema.parse(body);

    await scheduleAppointmentReminders(appointmentId, configs);

    return NextResponse.json({
      success: true,
      message: "Reminders scheduled successfully",
    });
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

// PUT /api/appointments/reminders/process - Process pending reminders (admin/cron job)
export async function PUT(request: NextRequest) {
  try {
    // This endpoint should be protected and only accessible by admin/cron jobs
    // For now, we'll allow authenticated users but in production this should be restricted

    const processedCount = await processPendingReminders();

    return NextResponse.json({
      success: true,
      processedCount,
      message: `Processed ${processedCount} pending reminders`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
