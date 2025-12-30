import type { Appointment } from "@/shared/models/types";

let appointmentCounter = 1;

export const createMockAppointment = (
  overrides: Partial<Appointment> = {},
): Appointment => ({
  id: `appointment-${appointmentCounter++}`,
  lead_id: "lead-123",
  title: "Initial Consultation",
  description: "Discuss project requirements and timeline",
  scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
  duration_minutes: 60,
  status: "scheduled",
  meeting_link: "https://meet.google.com/abc-defg-hij",
  notes: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const createMockAppointments = (
  count: number,
  overrides: Partial<Appointment>[] | Partial<Appointment> = {},
): Appointment[] => {
  return Array.from({ length: count }, (_, index) => {
    const appointmentOverrides = Array.isArray(overrides)
      ? overrides[index] || {}
      : overrides;
    return createMockAppointment({
      id: `appointment-${index + 1}`,
      scheduled_at: new Date(
        Date.now() + (index + 1) * 24 * 60 * 60 * 1000,
      ).toISOString(),
      ...appointmentOverrides,
    });
  });
};

export const createMockCompletedAppointment = (
  overrides: Partial<Appointment> = {},
): Appointment => {
  return createMockAppointment({
    status: "completed",
    scheduled_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
    ...overrides,
  });
};

export const createMockUpcomingAppointment = (
  overrides: Partial<Appointment> = {},
): Appointment => {
  return createMockAppointment({
    scheduled_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
    ...overrides,
  });
};
