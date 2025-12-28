"use client";

import { useState } from "react";
import { Calendar, Plus, Clock, User, Video, Check, X, Loader2 } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppointments, useLeads, createAppointment } from "@/client-lib/api-client";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30",
  completed: "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30",
  cancelled: "bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30",
  "no-show": "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
};

export default function AppointmentsPage() {
  const { data: appointments, isLoading } = useAppointments(undefined, true);
  const { data: leads } = useLeads();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newAppointment, setNewAppointment] = useState({
    lead_id: "",
    title: "",
    description: "",
    scheduled_at: "",
    duration_minutes: "30",
    meeting_link: "",
    notes: "",
  });

  const handleCreateAppointment = async () => {
    if (!newAppointment.lead_id || !newAppointment.title || !newAppointment.scheduled_at) {
      toast.error("Lead, title, and scheduled time are required");
      return;
    }

    setIsSubmitting(true);
    try {
      await createAppointment({
        lead_id: newAppointment.lead_id,
        title: newAppointment.title,
        description: newAppointment.description || undefined,
        scheduled_at: new Date(newAppointment.scheduled_at).toISOString(),
        duration_minutes: parseInt(newAppointment.duration_minutes),
        meeting_link: newAppointment.meeting_link || undefined,
        notes: newAppointment.notes || undefined,
      });
      toast.success("Appointment created successfully");
      setIsDialogOpen(false);
      setNewAppointment({ lead_id: "", title: "", description: "", scheduled_at: "", duration_minutes: "30", meeting_link: "", notes: "" });
    } catch {
      toast.error("Failed to create appointment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const formatTime = (dateString: string) => new Date(dateString).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const getLeadName = (leadId: string) => leads?.find((l) => l.id === leadId)?.name ?? "Unknown Lead";

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Calendar className="h-12 w-12 animate-pulse text-primary" />
          <p className="text-muted-foreground">Loading appointments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col p-6 gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8 text-primary" />
            Appointments
          </h1>
          <p className="text-muted-foreground mt-1">Manage scheduled meetings and consultations</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Schedule Appointment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Schedule New Appointment</DialogTitle>
                <DialogDescription>Create a new meeting with a lead</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="lead">Lead *</Label>
                  <Select value={newAppointment.lead_id} onValueChange={(v) => setNewAppointment((p) => ({ ...p, lead_id: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a lead" />
                    </SelectTrigger>
                    <SelectContent>
                      {leads?.map((lead) => (
                        <SelectItem key={lead.id} value={lead.id}>{lead.name} - {lead.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input id="title" placeholder="e.g., Discovery Call" value={newAppointment.title} onChange={(e) => setNewAppointment((p) => ({ ...p, title: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="scheduled_at">Date & Time *</Label>
                    <Input id="scheduled_at" type="datetime-local" value={newAppointment.scheduled_at} onChange={(e) => setNewAppointment((p) => ({ ...p, scheduled_at: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration</Label>
                    <Select value={newAppointment.duration_minutes} onValueChange={(v) => setNewAppointment((p) => ({ ...p, duration_minutes: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="45">45 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="90">1.5 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meeting_link">Meeting Link</Label>
                  <Input id="meeting_link" placeholder="https://zoom.us/j/..." value={newAppointment.meeting_link} onChange={(e) => setNewAppointment((p) => ({ ...p, meeting_link: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" placeholder="Meeting agenda or notes..." value={newAppointment.description} onChange={(e) => setNewAppointment((p) => ({ ...p, description: e.target.value }))} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateAppointment} disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Schedule
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" asChild><Link href="/">Back to Dashboard</Link></Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Upcoming</p><p className="text-2xl font-bold text-blue-600">{appointments?.filter((a) => a.status === "scheduled").length ?? 0}</p></div><Calendar className="h-8 w-8 text-blue-600" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Completed</p><p className="text-2xl font-bold text-green-600">{appointments?.filter((a) => a.status === "completed").length ?? 0}</p></div><Check className="h-8 w-8 text-green-600" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Cancelled</p><p className="text-2xl font-bold text-red-600">{appointments?.filter((a) => a.status === "cancelled").length ?? 0}</p></div><X className="h-8 w-8 text-red-600" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">No-Shows</p><p className="text-2xl font-bold text-yellow-600">{appointments?.filter((a) => a.status === "no-show").length ?? 0}</p></div><User className="h-8 w-8 text-yellow-600" /></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Appointments</CardTitle>
          <CardDescription>{appointments?.length ?? 0} appointments scheduled</CardDescription>
        </CardHeader>
        <CardContent>
          {appointments && appointments.length > 0 ? (
            <div className="space-y-4">
              {appointments.map((appointment) => (
                <div key={appointment.id} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center"><Calendar className="h-6 w-6 text-primary" /></div>
                    <div>
                      <p className="font-medium">{appointment.title}</p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><User className="h-3 w-3" />{getLeadName(appointment.lead_id)}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{appointment.duration_minutes} min</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right"><p className="font-medium">{formatDate(appointment.scheduled_at)}</p><p className="text-sm text-muted-foreground">{formatTime(appointment.scheduled_at)}</p></div>
                    <Badge variant="outline" className={statusColors[appointment.status]}>{appointment.status}</Badge>
                    {appointment.meeting_link && (
                      <Button variant="outline" size="sm" asChild><a href={appointment.meeting_link} target="_blank" rel="noopener noreferrer"><Video className="h-4 w-4 mr-2" />Join</a></Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No appointments scheduled</p>
              <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>Schedule your first appointment</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
