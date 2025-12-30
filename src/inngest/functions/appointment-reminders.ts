import { inngest } from "../client";
import { processPendingReminders } from "@/lib/notifications";

export const appointmentRemindersCron = inngest.createFunction(
  {
    id: "appointment-reminders-processor",
    name: "Process Appointment Reminders",
  },
  { cron: "*/10 * * * *" }, // Every 10 minutes
  async ({ step }) => {
    const processedCount = await step.run(
      "process-pending-reminders",
      async () => {
        return await processPendingReminders();
      },
    );

    return {
      success: true,
      processedCount,
      timestamp: new Date().toISOString(),
    };
  },
);
