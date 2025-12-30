import nodemailer from "nodemailer";
import twilio from "twilio";
import { prisma } from "@/server-lib/prisma";

// Notification types
export type NotificationType = "email" | "sms";
export type ReminderTiming = "24h" | "1h" | "15m" | "custom";

export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  name: string;
  subject?: string; // For email only
  body: string;
  variables: string[]; // Available template variables
}

export interface NotificationConfig {
  enabled?: boolean;
  timing: ReminderTiming;
  customMinutes?: number; // For custom timing
  templateId: string;
}

export interface AppointmentReminder {
  appointmentId: string;
  leadId: string;
  leadName: string;
  leadEmail: string;
  leadPhone?: string;
  appointmentTitle: string;
  scheduledAt: Date;
  duration: number;
  meetingLink?: string;
  reminderTiming: ReminderTiming;
  notificationType: NotificationType;
}

// Email templates
const EMAIL_TEMPLATES: NotificationTemplate[] = [
  {
    id: "appointment_reminder_24h",
    type: "email",
    name: "Appointment Reminder (24 hours)",
    subject: "Appointment Reminder: {{appointment_title}} Tomorrow",
    body: `Hi {{lead_name}},

This is a friendly reminder about your upcoming appointment:

📅 **Appointment:** {{appointment_title}}
🕐 **Date & Time:** {{appointment_datetime}}
⏱️ **Duration:** {{appointment_duration}} minutes
{{meeting_link_section}}

We're looking forward to speaking with you!

If you need to reschedule or have any questions, please don't hesitate to contact us.

Best regards,
{{company_name}}`,
    variables: [
      "lead_name",
      "appointment_title",
      "appointment_datetime",
      "appointment_duration",
      "meeting_link_section",
      "company_name",
    ],
  },
  {
    id: "appointment_reminder_1h",
    type: "email",
    name: "Appointment Reminder (1 hour)",
    subject: "Your appointment starts in 1 hour: {{appointment_title}}",
    body: `Hi {{lead_name}},

Your appointment is coming up in just 1 hour!

📅 **Appointment:** {{appointment_title}}
🕐 **Time:** {{appointment_time}} ({{appointment_datetime}})
⏱️ **Duration:** {{appointment_duration}} minutes
{{meeting_link_section}}

If you're running late or need to reschedule, please let us know as soon as possible.

We're excited to connect with you!

Best regards,
{{company_name}}`,
    variables: [
      "lead_name",
      "appointment_title",
      "appointment_time",
      "appointment_datetime",
      "appointment_duration",
      "meeting_link_section",
      "company_name",
    ],
  },
  {
    id: "appointment_reminder_15m",
    type: "email",
    name: "Appointment Reminder (15 minutes)",
    subject: "Your appointment starts in 15 minutes",
    body: `Hi {{lead_name}},

Your appointment starts in just 15 minutes!

📅 **Appointment:** {{appointment_title}}
🕐 **Time:** {{appointment_time}}
{{meeting_link_section}}

See you soon!

Best regards,
{{company_name}}`,
    variables: [
      "lead_name",
      "appointment_title",
      "appointment_time",
      "meeting_link_section",
      "company_name",
    ],
  },
];

// SMS templates
const SMS_TEMPLATES: NotificationTemplate[] = [
  {
    id: "appointment_reminder_sms_24h",
    type: "sms",
    name: "Appointment Reminder SMS (24 hours)",
    body: `Hi {{lead_name}}, reminder: {{appointment_title}} tomorrow at {{appointment_time}}. Duration: {{appointment_duration}}min. {{meeting_link_short}}`,
    variables: [
      "lead_name",
      "appointment_title",
      "appointment_time",
      "appointment_duration",
      "meeting_link_short",
    ],
  },
  {
    id: "appointment_reminder_sms_1h",
    type: "sms",
    name: "Appointment Reminder SMS (1 hour)",
    body: `Hi {{lead_name}}, your {{appointment_title}} starts in 1 hour at {{appointment_time}}. {{meeting_link_short}}`,
    variables: [
      "lead_name",
      "appointment_title",
      "appointment_time",
      "meeting_link_short",
    ],
  },
  {
    id: "appointment_reminder_sms_15m",
    type: "sms",
    name: "Appointment Reminder SMS (15 minutes)",
    body: `Hi {{lead_name}}, {{appointment_title}} starts in 15 min at {{appointment_time}}. {{meeting_link_short}}`,
    variables: [
      "lead_name",
      "appointment_title",
      "appointment_time",
      "meeting_link_short",
    ],
  },
];

const ALL_TEMPLATES = [...EMAIL_TEMPLATES, ...SMS_TEMPLATES];

// Email transporter (configured once)
let emailTransporter: nodemailer.Transporter | null = null;

// Twilio client (configured once)
let twilioClient: twilio.Twilio | null = null;

// Initialize email transporter
function getEmailTransporter() {
  if (!emailTransporter) {
    emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return emailTransporter;
}

// Initialize Twilio client
function getTwilioClient() {
  if (!twilioClient) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      throw new Error("Twilio credentials not configured");
    }

    twilioClient = twilio(accountSid, authToken);
  }
  return twilioClient;
}

// Get template by ID
export function getTemplate(
  templateId: string,
): NotificationTemplate | undefined {
  return ALL_TEMPLATES.find((template) => template.id === templateId);
}

// Get all templates by type
export function getTemplatesByType(
  type: NotificationType,
): NotificationTemplate[] {
  return ALL_TEMPLATES.filter((template) => template.type === type);
}

// Render template with variables
function renderTemplate(
  template: NotificationTemplate,
  variables: Record<string, string>,
): { subject?: string; body: string } {
  let body = template.body;
  let subject = template.subject;

  // Replace variables in body
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, "g");
    body = body.replace(regex, value);
  });

  // Replace variables in subject (for email)
  if (subject) {
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      subject = subject!.replace(regex, value);
    });
  }

  return { subject, body };
}

// Send email notification
async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<boolean> {
  try {
    const transporter = getEmailTransporter();

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Email sending failed:", error);
    return false;
  }
}

// Send SMS notification
async function sendSMS(to: string, message: string): Promise<boolean> {
  try {
    const client = getTwilioClient();
    const from = process.env.TWILIO_PHONE_NUMBER;

    if (!from) {
      throw new Error("Twilio phone number not configured");
    }

    await client.messages.create({
      body: message,
      from,
      to,
    });

    return true;
  } catch (error) {
    console.error("SMS sending failed:", error);
    return false;
  }
}

// Generate template variables for appointment
function generateAppointmentVariables(
  reminder: AppointmentReminder,
): Record<string, string> {
  const appointmentDate = new Date(reminder.scheduledAt);
  const now = new Date();

  const variables: Record<string, string> = {
    lead_name: reminder.leadName,
    appointment_title: reminder.appointmentTitle,
    appointment_datetime: appointmentDate.toLocaleString(),
    appointment_time: appointmentDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    appointment_duration: reminder.duration.toString(),
    company_name: process.env.COMPANY_NAME || "AgentsFlowAI",
  };

  // Meeting link section for email
  if (reminder.meetingLink) {
    variables.meeting_link_section = `\n🔗 **Meeting Link:** ${reminder.meetingLink}`;
    variables.meeting_link_short = `Join: ${reminder.meetingLink}`;
  } else {
    variables.meeting_link_section = "";
    variables.meeting_link_short = "";
  }

  return variables;
}

// Send appointment reminder
export async function sendAppointmentReminder(
  reminder: AppointmentReminder,
  templateId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const template = getTemplate(templateId);
    if (!template) {
      return { success: false, error: "Template not found" };
    }

    // Check if we have the required contact information
    if (template.type === "email" && !reminder.leadEmail) {
      return {
        success: false,
        error: "Email address required for email notifications",
      };
    }

    if (template.type === "sms" && !reminder.leadPhone) {
      return {
        success: false,
        error: "Phone number required for SMS notifications",
      };
    }

    // Generate template variables
    const variables = generateAppointmentVariables(reminder);
    const { subject, body } = renderTemplate(template, variables);

    let success = false;

    if (template.type === "email" && subject) {
      // Convert plain text to HTML for email
      const htmlBody = body.replace(/\n/g, "<br>");
      success = await sendEmail(
        reminder.leadEmail!,
        subject,
        `<div>${htmlBody}</div>`,
      );
    } else if (template.type === "sms") {
      success = await sendSMS(reminder.leadPhone!, body);
    }

    // Log the notification attempt
    await prisma.notificationLog.create({
      data: {
        type: template.type,
        recipient:
          template.type === "email" ? reminder.leadEmail! : reminder.leadPhone!,
        template_id: templateId,
        appointment_id: reminder.appointmentId,
        lead_id: reminder.leadId,
        status: success ? "sent" : "failed",
        sent_at: new Date(),
        metadata: {
          reminder_timing: reminder.reminderTiming,
          appointment_title: reminder.appointmentTitle,
          scheduled_at: reminder.scheduledAt.toISOString(),
        },
      },
    });

    return { success };
  } catch (error) {
    console.error("Reminder sending failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Schedule appointment reminders
export async function scheduleAppointmentReminders(
  appointmentId: string,
  configs: NotificationConfig[],
): Promise<void> {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { lead: true },
    });

    if (!appointment || !appointment.lead) {
      throw new Error("Appointment or lead not found");
    }

    const appointmentDate = new Date(appointment.scheduled_at);
    const now = new Date();

    // Delete existing reminder schedules for this appointment
    await prisma.appointmentReminder.deleteMany({
      where: { appointment_id: appointmentId },
    });

    // Schedule new reminders
    for (const config of configs) {
      if (!config.enabled) continue;

      const template = getTemplate(config.templateId);
      if (!template) continue;

      // Calculate reminder time
      let reminderTime: Date;
      switch (config.timing) {
        case "24h":
          reminderTime = new Date(
            appointmentDate.getTime() - 24 * 60 * 60 * 1000,
          );
          break;
        case "1h":
          reminderTime = new Date(appointmentDate.getTime() - 60 * 60 * 1000);
          break;
        case "15m":
          reminderTime = new Date(appointmentDate.getTime() - 15 * 60 * 1000);
          break;
        case "custom":
          reminderTime = new Date(
            appointmentDate.getTime() -
            (config.customMinutes || 60) * 60 * 1000,
          );
          break;
        default:
          continue;
      }

      // Only schedule if reminder time is in the future
      if (reminderTime > now) {
        await prisma.appointmentReminder.create({
          data: {
            appointment_id: appointmentId,
            reminder_type: template.type,
            timing: config.timing,
            custom_minutes: config.customMinutes,
            template_id: config.templateId,
            scheduled_for: reminderTime,
            status: "pending",
          },
        });
      }
    }
  } catch (error) {
    console.error("Failed to schedule appointment reminders:", error);
    throw error;
  }
}

// Process pending reminders (to be called by a cron job or background task)
export async function processPendingReminders(): Promise<number> {
  try {
    const now = new Date();

    // Find reminders that should be sent now
    const pendingReminders = await prisma.appointmentReminder.findMany({
      where: {
        status: "pending",
        scheduled_for: {
          lte: now,
        },
      },
      include: {
        appointment: {
          include: {
            lead: true,
          },
        },
      },
    });

    let processedCount = 0;

    for (const reminder of pendingReminders) {
      if (!reminder.appointment || !reminder.appointment.lead) continue;

      const appointmentData: AppointmentReminder = {
        appointmentId: reminder.appointment_id,
        leadId: reminder.appointment.lead_id,
        leadName: reminder.appointment.lead.name,
        leadEmail: reminder.appointment.lead.email,
        leadPhone: reminder.appointment.lead.phone || undefined,
        appointmentTitle: reminder.appointment.title,
        scheduledAt: reminder.appointment.scheduled_at,
        duration: reminder.appointment.duration_minutes,
        meetingLink: reminder.appointment.meeting_link || undefined,
        reminderTiming: reminder.timing as ReminderTiming,
        notificationType: reminder.reminder_type as NotificationType,
      };

      const result = await sendAppointmentReminder(
        appointmentData,
        reminder.template_id,
      );

      // Update reminder status
      await prisma.appointmentReminder.update({
        where: { id: reminder.id },
        data: {
          status: result.success ? "sent" : "failed",
          sent_at: result.success ? now : undefined,
          error_message: result.error,
        },
      });

      if (result.success) {
        processedCount++;
      }
    }

    return processedCount;
  } catch (error) {
    console.error("Failed to process pending reminders:", error);
    return 0;
  }
}

// Get notification logs for an appointment
export async function getAppointmentNotificationLogs(appointmentId: string) {
  return prisma.notificationLog.findMany({
    where: { appointment_id: appointmentId },
    orderBy: { sent_at: "desc" },
  });
}

// Get reminder schedule for an appointment
export async function getAppointmentReminders(appointmentId: string) {
  return prisma.appointmentReminder.findMany({
    where: { appointment_id: appointmentId },
    orderBy: { scheduled_for: "asc" },
  });
}

// Test notification delivery
export async function testNotification(
  type: NotificationType,
  recipient: string,
  templateId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const template = getTemplate(templateId);
    if (!template) {
      return { success: false, error: "Template not found" };
    }

    if (template.type !== type) {
      return { success: false, error: "Template type mismatch" };
    }

    // Create a test reminder object
    const testReminder: AppointmentReminder = {
      appointmentId: "test",
      leadId: "test",
      leadName: "Test User",
      leadEmail: type === "email" ? recipient : "test@example.com",
      leadPhone: type === "sms" ? recipient : "+1234567890",
      appointmentTitle: "Test Appointment",
      scheduledAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      duration: 30,
      meetingLink: "https://zoom.us/test",
      reminderTiming: "1h",
      notificationType: type,
    };

    const variables = generateAppointmentVariables(testReminder);
    variables.lead_name = "Test Recipient"; // Override for test

    const { subject, body } = renderTemplate(template, variables);

    let success = false;

    if (type === "email" && subject) {
      const htmlBody = body.replace(/\n/g, "<br>");
      success = await sendEmail(
        recipient,
        `[TEST] ${subject}`,
        `<div>${htmlBody}</div>`,
      );
    } else if (type === "sms") {
      success = await sendSMS(recipient, `[TEST] ${body}`);
    }

    return { success };
  } catch (error) {
    console.error("Test notification failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
