import { prisma } from "../src/server-lib/prisma";
import { processPendingReminders } from "../src/lib/notifications";
import { v4 as uuidv4 } from 'uuid';

async function main() {
    console.log("🧪 Starting Inngest Appointment Reminder Verification");

    // 1. Create a dummy lead
    const leadEmail = `test-${Date.now()}@example.com`;
    console.log(`Creating test lead: ${leadEmail}`);
    const lead = await prisma.lead.create({
        data: {
            name: "Test User",
            email: leadEmail,
            phone: "+15555555555",
            status: "New",
            source: "Manual"
        }
    });

    // 2. Create a dummy appointment scheduled for 55 minutes from now (should trigger 1h reminder)
    // Note: processing logic checks for scheduled_for <= now. 
    // We need to simulate a reminder that IS due.
    // The scheduleAppointmentReminders function calculates "scheduled_for" based on the appointment time.
    // If we want a 1h reminder to be valid NOW, the appointment must be 1h from now (or slightly less).
    // Let's create an appointment for 1 hour from now.

    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
    console.log(`Creating test appointment for: ${oneHourFromNow.toISOString()}`);

    const appointment = await prisma.appointment.create({
        data: {
            lead_id: lead.id,
            title: "Test Inngest Reminder Appointment",
            scheduled_at: oneHourFromNow,
            duration_minutes: 30,
            status: "Scheduled"
        }
    });

    // 3. Manually create a pending reminder that is "due"
    // If the policy is "1h before", and the appointment is 1h from now, the reminder time is NOW.
    const reminderTime = new Date();

    // Use a known template ID from the code we read
    const templateId = "appointment_reminder_1h";

    console.log(`Creating pending reminder scheduled for: ${reminderTime.toISOString()}`);
    await prisma.appointmentReminder.create({
        data: {
            appointment_id: appointment.id,
            reminder_type: "email",
            timing: "1h",
            template_id: templateId,
            scheduled_for: reminderTime,
            status: "pending"
        }
    });

    // 4. Trigger the processing logic
    console.log("Triggering processPendingReminders()...");
    const processedCount = await processPendingReminders();
    console.log(`Processed count: ${processedCount}`);

    // 5. Verify the reminder was processed
    const updatedReminder = await prisma.appointmentReminder.findFirst({
        where: {
            appointment_id: appointment.id,
            timing: "1h"
        }
    });

    if (updatedReminder?.status === 'sent') {
        console.log("✅ SUCCESS: Reminder status updated to 'sent'");
    } else {
        console.error(`❌ FAILURE: Reminder status is '${updatedReminder?.status}'`);
        console.log("Check logs for errors.");
    }

    // Cleanup
    console.log("Cleaning up test data...");
    await prisma.appointmentReminder.deleteMany({ where: { appointment_id: appointment.id } });
    await prisma.appointment.delete({ where: { id: appointment.id } });
    await prisma.lead.delete({ where: { id: lead.id } });

    console.log("Done.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
