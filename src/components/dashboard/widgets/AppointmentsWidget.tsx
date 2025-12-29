"use client";

interface AppointmentsWidgetProps {
  stats: any;
}

export function AppointmentsWidget({ stats }: AppointmentsWidgetProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Upcoming Appointments</span>
        <span className="text-2xl font-bold">
          {stats?.upcomingAppointments ?? 0}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        Scheduled meetings and consultations
      </p>
    </div>
  );
}
