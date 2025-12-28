import axios from "axios";
import useSWR, { mutate } from "swr";
import type {
  Lead,
  Service,
  DashboardStats,
  ComprehensiveAnalytics,
  Conversation,
  Message,
  Appointment,
} from "@/shared/models/types";

export const apiClient = axios.create({
  baseURL: "/api",
});

const fetcher = <T>(url: string) =>
  apiClient.get<T>(url).then((res) => res.data);

// Dashboard
export function useDashboardStats() {
  return useSWR<DashboardStats, Error>("/dashboard/stats", fetcher, {
    refreshInterval: 30000, // Refresh every 30 seconds
  });
}

// Comprehensive Analytics
export function useComprehensiveAnalytics() {
  return useSWR<ComprehensiveAnalytics, Error>(
    "/analytics/comprehensive",
    fetcher,
    {
      refreshInterval: 60000, // Refresh every minute
    },
  );
}

// Notifications
export function useNotifications() {
  return useSWR("/notifications", fetcher, {
    refreshInterval: 30000, // Refresh every 30 seconds
  });
}

export async function markNotificationsAsRead(notificationIds: string[]) {
  try {
    return await apiClient
      .post("/notifications", { notificationIds })
      .then((res) => res.data);
  } finally {
    await mutate("/notifications");
  }
}

// Leads
export function useLeads(status?: string, source?: string) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (source) params.set("source", source);
  const queryString = params.toString();
  const url = `/leads${queryString ? `?${queryString}` : ""}`;
  return useSWR<Lead[], Error>(url, fetcher);
}

export function useLead(id: string) {
  return useSWR<Lead, Error>(id ? `/leads/${id}` : null, fetcher);
}

export async function createLead(data: {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  source?: string;
  budget?: string;
  timeline?: string;
  notes?: string;
}) {
  try {
    return await apiClient.post<Lead>("/leads", data).then((res) => res.data);
  } finally {
    await mutate((key) => typeof key === "string" && key.startsWith("/leads"));
    await mutate("/dashboard/stats");
  }
}

export async function updateLead(id: string, data: Partial<Lead>) {
  try {
    return await apiClient
      .patch<Lead>(`/leads/${id}`, data)
      .then((res) => res.data);
  } finally {
    await mutate((key) => typeof key === "string" && key.startsWith("/leads"));
    await mutate("/dashboard/stats");
  }
}

export async function deleteLead(id: string) {
  try {
    return await apiClient.delete(`/leads/${id}`).then((res) => res.data);
  } finally {
    await mutate((key) => typeof key === "string" && key.startsWith("/leads"));
    await mutate("/dashboard/stats");
  }
}

// Services
export function useServices() {
  return useSWR<Service[], Error>("/services", fetcher);
}

export async function createService(data: {
  name: string;
  description?: string;
  tier: string;
  price: number;
  features?: string[];
}) {
  try {
    return await apiClient
      .post<Service>("/services", data)
      .then((res) => res.data);
  } finally {
    await mutate("/services");
  }
}

// Conversations
export function useConversations(leadId?: string, status?: string) {
  const params = new URLSearchParams();
  if (leadId) params.set("leadId", leadId);
  if (status) params.set("status", status);
  const queryString = params.toString();
  const url = `/conversations${queryString ? `?${queryString}` : ""}`;
  return useSWR<Conversation[], Error>(url, fetcher);
}

export async function createConversation(data: {
  lead_id?: string;
  channel?: string;
}) {
  try {
    return await apiClient
      .post<Conversation>("/conversations", data)
      .then((res) => res.data);
  } finally {
    await mutate(
      (key) => typeof key === "string" && key.startsWith("/conversations"),
    );
    await mutate("/dashboard/stats");
  }
}

// Messages
export function useMessages(conversationId: string) {
  return useSWR<Message[], Error>(
    conversationId ? `/conversations/${conversationId}/messages` : null,
    fetcher,
  );
}

export async function createMessage(
  conversationId: string,
  data: {
    role: string;
    content: string;
    metadata?: Record<string, unknown>;
  },
) {
  try {
    return await apiClient
      .post<Message>(`/conversations/${conversationId}/messages`, data)
      .then((res) => res.data);
  } finally {
    await mutate(`/conversations/${conversationId}/messages`);
  }
}

// Appointments
export function useAppointments(leadId?: string, upcoming?: boolean) {
  const params = new URLSearchParams();
  if (leadId) params.set("leadId", leadId);
  if (upcoming) params.set("upcoming", "true");
  const queryString = params.toString();
  const url = `/appointments${queryString ? `?${queryString}` : ""}`;
  return useSWR<Appointment[], Error>(url, fetcher);
}

export async function createAppointment(data: {
  lead_id: string;
  title: string;
  description?: string;
  scheduled_at: string;
  duration_minutes?: number;
  meeting_link?: string;
  notes?: string;
}) {
  try {
    return await apiClient
      .post<Appointment>("/appointments", data)
      .then((res) => res.data);
  } finally {
    await mutate(
      (key) => typeof key === "string" && key.startsWith("/appointments"),
    );
    await mutate("/dashboard/stats");
  }
}

// Onboarding
export async function completeOnboarding(data: {
  step: string;
  profileData?: {
    company?: string;
    role?: string;
    teamSize?: string;
  };
}) {
  const response = await fetch("/api/onboarding/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to complete onboarding");
  }

  return response.json();
}
