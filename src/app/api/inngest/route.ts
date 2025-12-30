import { serve } from "inngest/next";
import { appointmentRemindersCron, exampleCron } from "@/inngest";
import { inngest } from "@/inngest/client";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [appointmentRemindersCron, exampleCron],
  logLevel: "debug",
});
