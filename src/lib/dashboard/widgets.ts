// Dashboard Widget System
import {
  TrendingUp,
  Bot,
  Users,
  Zap,
  Sparkles,
  Calendar,
  MessageSquare,
  Mail,
  Target,
} from "lucide-react";

// Widget interface
export interface DashboardWidget {
  id: string;
  title: string;
  description: string;
  icon: any; // LucideIcon
  component: string; // Component name to render
  defaultSize: "small" | "medium" | "large";
  configurable: boolean;
  category: "analytics" | "leads" | "ai" | "appointments" | "communications";
  order: number;
  enabled: boolean;
}

// Widget configuration for user preferences
export interface WidgetConfig {
  id: string;
  enabled: boolean;
  position: number;
  size: "small" | "medium" | "large";
  settings?: Record<string, any>;
}

// Available widgets registry
export const WIDGETS_REGISTRY: Record<string, Omit<DashboardWidget, "id">> = {
  statsOverview: {
    title: "Stats Overview",
    description: "Key performance metrics at a glance",
    icon: TrendingUp,
    component: "StatsOverviewWidget",
    defaultSize: "large",
    configurable: true,
    category: "analytics",
    order: 1,
    enabled: true,
  },
  aiUsageAnalytics: {
    title: "AI Usage Analytics",
    description: "AI model usage, performance, and cost tracking",
    icon: Bot,
    component: "AIUsageAnalyticsWidget",
    defaultSize: "medium",
    configurable: true,
    category: "ai",
    order: 2,
    enabled: true,
  },
  leadConversionAnalytics: {
    title: "Lead Conversion Analytics",
    description: "Conversion rates, source performance, and funnel analysis",
    icon: Target,
    component: "LeadConversionAnalyticsWidget",
    defaultSize: "large",
    configurable: true,
    category: "leads",
    order: 3,
    enabled: true,
  },
  appointmentStatistics: {
    title: "Appointment Statistics",
    description:
      "Appointment metrics, completion rates, and scheduling insights",
    icon: Calendar,
    component: "AppointmentStatisticsWidget",
    defaultSize: "medium",
    configurable: true,
    category: "appointments",
    order: 4,
    enabled: true,
  },
  chatAnalytics: {
    title: "Chat Analytics",
    description:
      "Conversation metrics, sentiment analysis, and channel performance",
    icon: MessageSquare,
    component: "ChatAnalyticsWidget",
    defaultSize: "medium",
    configurable: true,
    category: "communications",
    order: 5,
    enabled: true,
  },
  aiAgents: {
    title: "AI Agents Status",
    description: "Current status of AI automation agents",
    icon: Bot,
    component: "AIAgentsWidget",
    defaultSize: "medium",
    configurable: true,
    category: "ai",
    order: 6,
    enabled: true,
  },
  leadPipeline: {
    title: "Lead Pipeline",
    description: "Leads categorized by status",
    icon: Users,
    component: "LeadPipelineWidget",
    defaultSize: "medium",
    configurable: true,
    category: "leads",
    order: 7,
    enabled: true,
  },
  leadSources: {
    title: "Lead Sources",
    description: "Where your leads are coming from",
    icon: Zap,
    component: "LeadSourcesWidget",
    defaultSize: "medium",
    configurable: true,
    category: "leads",
    order: 8,
    enabled: true,
  },
  recentLeads: {
    title: "Recent Leads",
    description: "Latest incoming leads",
    icon: Users,
    component: "RecentLeadsWidget",
    defaultSize: "large",
    configurable: true,
    category: "leads",
    order: 9,
    enabled: true,
  },
  quickActions: {
    title: "Quick Actions",
    description: "Common tasks and shortcuts",
    icon: Sparkles,
    component: "QuickActionsWidget",
    defaultSize: "small",
    configurable: true,
    category: "analytics",
    order: 10,
    enabled: true,
  },
  appointments: {
    title: "Upcoming Appointments",
    description: "Scheduled appointments and meetings",
    icon: Calendar,
    component: "AppointmentsWidget",
    defaultSize: "medium",
    configurable: true,
    category: "appointments",
    order: 11,
    enabled: true,
  },
  conversations: {
    title: "Active Conversations",
    description: "Current chat and conversation status",
    icon: MessageSquare,
    component: "ConversationsWidget",
    defaultSize: "medium",
    configurable: true,
    category: "communications",
    order: 12,
    enabled: true,
  },
  emailMetrics: {
    title: "Email Performance",
    description: "Email campaign metrics and open rates",
    icon: Mail,
    component: "EmailMetricsWidget",
    defaultSize: "medium",
    configurable: true,
    category: "communications",
    order: 13,
    enabled: true,
  },
  aiUsage: {
    title: "AI Usage Summary",
    description: "Basic AI usage statistics",
    icon: Bot,
    component: "AIUsageWidget",
    defaultSize: "small",
    configurable: true,
    category: "ai",
    order: 14,
    enabled: false, // Disabled by default since we have the more detailed analytics
  },
};

// Helper functions
export function getWidgetDefinition(widgetId: string): DashboardWidget | null {
  const definition = WIDGETS_REGISTRY[widgetId];
  if (!definition) return null;

  return {
    id: widgetId,
    ...definition,
  };
}

export function getAllWidgets(): DashboardWidget[] {
  return Object.entries(WIDGETS_REGISTRY).map(([id, definition]) => ({
    id,
    ...definition,
  }));
}

export function getWidgetsByCategory(
  category: DashboardWidget["category"],
): DashboardWidget[] {
  return getAllWidgets().filter((widget) => widget.category === category);
}

export function getDefaultWidgetConfig(): WidgetConfig[] {
  return getAllWidgets().map((widget) => ({
    id: widget.id,
    enabled: widget.enabled,
    position: widget.order,
    size: widget.defaultSize,
    settings: {},
  }));
}
