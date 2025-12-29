"use client";

import { useState, useMemo } from "react";
import { Calendar, dateFnsLocalizer, View, Views } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import {
  CalendarIcon,
  Clock,
  User,
  Video,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAppointments, useLeads } from "@/client-lib/api-client";

// Setup the localizer for react-big-calendar
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: {
    "en-US": enUS,
  },
});

// Custom toolbar component
const CustomToolbar = ({ label, onNavigate, onView, view }: any) => {
  const navigate = (action: string) => {
    onNavigate(action);
  };

  return (
    <div className="mb-4 flex items-center justify-between rounded-lg bg-muted/50 p-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate("PREV")}>
          ‹
        </Button>
        <h2 className="text-xl font-semibold">{label}</h2>
        <Button variant="outline" size="sm" onClick={() => navigate("NEXT")}>
          ›
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate("TODAY")}>
          Today
        </Button>
      </div>
      <div className="flex gap-2">
        <Button
          variant={view === "month" ? "default" : "outline"}
          size="sm"
          onClick={() => onView("month")}
        >
          Month
        </Button>
        <Button
          variant={view === "week" ? "default" : "outline"}
          size="sm"
          onClick={() => onView("week")}
        >
          Week
        </Button>
        <Button
          variant={view === "day" ? "default" : "outline"}
          size="sm"
          onClick={() => onView("day")}
        >
          Day
        </Button>
        <Button
          variant={view === "agenda" ? "default" : "outline"}
          size="sm"
          onClick={() => onView("agenda")}
        >
          Agenda
        </Button>
      </div>
    </div>
  );
};

// Custom event component
const CustomEvent = ({ event }: any) => {
  const statusColors = {
    scheduled: "bg-blue-500",
    completed: "bg-green-500",
    cancelled: "bg-red-500",
    "no-show": "bg-yellow-500",
  };

  return (
    <div className="truncate p-1 text-xs text-white">
      <div className="truncate font-medium">{event.title}</div>
      <div className="truncate opacity-90">{event.leadName}</div>
    </div>
  );
};

// Custom event wrapper for styling
const CustomEventWrapper = ({ event, children }: any) => {
  const statusColors = {
    scheduled: "border-blue-500 bg-blue-50",
    completed: "border-green-500 bg-green-50",
    cancelled: "border-red-500 bg-red-50",
    "no-show": "border-yellow-500 bg-yellow-50",
  };

  return (
    <div
      className={`rounded border-l-4 ${statusColors[event.status]} p-1`}
      style={{ height: "100%" }}
    >
      {children}
    </div>
  );
};

interface AppointmentCalendarProps {
  onCreateAppointment?: () => void;
}

export function AppointmentCalendar({
  onCreateAppointment,
}: AppointmentCalendarProps) {
  const { data: appointments, isLoading } = useAppointments(undefined, true);
  const { data: leads } = useLeads();
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [view, setView] = useState<View>(Views.MONTH);

  // Convert appointments to calendar events
  const calendarEvents = useMemo(() => {
    if (!appointments) return [];

    return appointments.map((appointment) => {
      const startDate = new Date(appointment.scheduled_at);
      const endDate = new Date(
        startDate.getTime() + appointment.duration_minutes * 60000,
      );

      const lead = leads?.find((l) => l.id === appointment.lead_id);

      return {
        id: appointment.id,
        title: appointment.title,
        start: startDate,
        end: endDate,
        resource: appointment,
        leadName: lead?.name || "Unknown Lead",
        status: appointment.status,
        description: appointment.description,
        meetingLink: appointment.meeting_link,
        duration: appointment.duration_minutes,
        lead: lead,
      };
    });
  }, [appointments, leads]);

  const handleSelectEvent = (event: any) => {
    setSelectedEvent(event);
  };

  const handleSelectSlot = ({ start }: any) => {
    // Could open appointment creation dialog with pre-filled date/time
    if (onCreateAppointment) {
      onCreateAppointment();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Clock className="h-4 w-4" />;
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      case "cancelled":
        return <XCircle className="h-4 w-4" />;
      case "no-show":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "text-blue-600";
      case "completed":
        return "text-green-600";
      case "cancelled":
        return "text-red-600";
      case "no-show":
        return "text-yellow-600";
      default:
        return "text-gray-600";
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <CalendarIcon className="mx-auto mb-4 h-12 w-12 animate-pulse text-primary" />
          <p className="text-muted-foreground">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Calendar */}
      <div className="h-[600px] rounded-lg border bg-white p-4">
        <Calendar
          localizer={localizer}
          events={calendarEvents}
          startAccessor="start"
          endAccessor="end"
          style={{ height: "100%" }}
          views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
          view={view}
          onView={setView}
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          selectable
          components={{
            toolbar: CustomToolbar,
            event: CustomEvent,
            eventWrapper: CustomEventWrapper,
          }}
          eventPropGetter={(event) => {
            const statusColors = {
              scheduled: "#3b82f6",
              completed: "#10b981",
              cancelled: "#ef4444",
              "no-show": "#f59e0b",
            };

            return {
              style: {
                backgroundColor:
                  statusColors[event.status as keyof typeof statusColors] ||
                  "#6b7280",
                borderRadius: "4px",
                opacity: 0.8,
                color: "white",
                border: "0px",
                display: "block",
              },
            };
          }}
          formats={{
            timeGutterFormat: "HH:mm",
            eventTimeRangeFormat: ({ start, end }, culture, local) =>
              `${local.format(start, "HH:mm", culture)} - ${local.format(end, "HH:mm", culture)}`,
            agendaTimeFormat: "HH:mm",
            agendaDateFormat: "MMM dd, yyyy",
          }}
        />
      </div>

      {/* Legend */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-blue-500"></div>
              <span className="text-sm">Scheduled</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-green-500"></div>
              <span className="text-sm">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-red-500"></div>
              <span className="text-sm">Cancelled</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-yellow-500"></div>
              <span className="text-sm">No Show</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Event Details Dialog */}
      <Dialog
        open={!!selectedEvent}
        onOpenChange={() => setSelectedEvent(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEvent && getStatusIcon(selectedEvent.status)}
              {selectedEvent?.title}
            </DialogTitle>
            <DialogDescription>
              {selectedEvent && format(selectedEvent.start, "PPP 'at' p")}
            </DialogDescription>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`${getStatusColor(selectedEvent.status)} border-current`}
                >
                  {selectedEvent.status}
                </Badge>
              </div>

              {/* Lead */}
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <strong>Lead:</strong> {selectedEvent.leadName}
                </span>
              </div>

              {/* Duration */}
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <strong>Duration:</strong> {selectedEvent.duration} minutes
                </span>
              </div>

              {/* Meeting Link */}
              {selectedEvent.meetingLink && (
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={selectedEvent.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Join Meeting
                  </a>
                </div>
              )}

              {/* Description */}
              {selectedEvent.description && (
                <div>
                  <p className="mb-1 text-sm text-muted-foreground">
                    <strong>Description:</strong>
                  </p>
                  <p className="rounded bg-muted p-2 text-sm">
                    {selectedEvent.description}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedEvent(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
