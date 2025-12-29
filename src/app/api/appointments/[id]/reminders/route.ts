import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { handleApiError } from "@/lib/api-errors";
import {
  getAppointmentReminders,
  getAppointmentNotificationLogs,
  getTemplatesByType,
} from "@/lib/notifications";

// GET /api/appointments/[id]/reminders - Get reminders and logs for an appointment
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await requireAuth(request);

    const [reminders, logs, emailTemplates, smsTemplates] = await Promise.all([
      getAppointmentReminders(params.id),
      getAppointmentNotificationLogs(params.id),
      Promise.resolve(getTemplatesByType("email")),
      Promise.resolve(getTemplatesByType("sms")),
    ]);

    return NextResponse.json({
      reminders,
      logs,
      templates: {
        email: emailTemplates,
        sms: smsTemplates,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
