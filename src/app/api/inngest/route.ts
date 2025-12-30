import { serve } from "inngest/next";
import { appointmentRemindersCron } from "@/inngest";
import { inngest } from "@/inngest/client";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [appointmentRemindersCron],
  logLevel: "debug",
});
