// AgentsFlowAI Types

export interface Service {
  id: string;
  name: string;
  description: string;
  tier: "basic" | "growth" | "enterprise";
  price: number;
  features: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  status: "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";
  score: number;
  source: "website" | "chat" | "referral" | "ads";
  budget: "low" | "medium" | "high" | "enterprise" | null;
  timeline: "immediate" | "1-3months" | "3-6months" | "exploring" | null;
  interests: string[];
  notes: string | null;
  qualified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  lead_id: string | null;
  status: "active" | "closed" | "transferred";
  channel:
    | "chat"
    | "email"
    | "phone"
    | "whatsapp"
    | "sms"
    | "messenger"
    | "instagram";
  started_at: string;
  ended_at: string | null;
  summary: string | null;
  sentiment: "positive" | "neutral" | "negative" | null;
  created_at: string;
  whatsapp_id?: string | null;
  sms_id?: string | null;
  messenger_id?: string | null;
  instagram_id?: string | null;
  channel_metadata?: Record<string, unknown>;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Appointment {
  id: string;
  lead_id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number;
  status: "scheduled" | "completed" | "cancelled" | "no-show";
  meeting_link: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsEvent {
  id: string;
  event_type: string;
  event_data: Record<string, unknown>;
  lead_id: string | null;
  session_id: string | null;
  created_at: string;
}

// ============================================
// DASHBOARD & ANALYTICS TYPES
// ============================================

export interface DashboardStats {
  totalLeads: number;
  qualifiedLeads: number;
  conversionRate: number;
  activeConversations: number;
  upcomingAppointments: number;
  revenue: number;
  leadsByStatus: { status: string; count: number }[];
  leadsBySource: { source: string; count: number }[];
  recentLeads: Lead[];
  // Additional analytics
  monthlyGrowth?: {
    current: number;
    previous: number;
    percentage: number;
  };
  aiUsage?: {
    requestsThisMonth: number;
  };
  emailMetrics?: {
    totalSent: number;
    totalOpened: number;
    totalClicked: number;
    openRate: number;
    clickRate: number;
  };
}

export interface ComprehensiveAnalytics {
  // Lead Analytics
  leadTrends: {
    monthly: { month: string; leads: number; qualified: number; won: number }[];
    statusDistribution: { status: string; count: number; percentage: number }[];
    sourceAnalysis: { source: string; count: number; conversionRate: number }[];
    scoreDistribution: { range: string; count: number }[];
  };

  // Conversation Analytics
  conversationMetrics: {
    totalConversations: number;
    activeConversations: number;
    avgResponseTime: number;
    sentimentAnalysis: { sentiment: string; count: number }[];
    channelPerformance: {
      channel: string;
      conversations: number;
      satisfaction: number;
    }[];
  };

  // AI Performance
  aiMetrics: {
    totalRequests: number;
    successfulRequests: number;
    avgResponseTime: number;
    costAnalysis: { provider: string; requests: number; cost: number }[];
    modelUsage: { model: string; requests: number; avgTokens: number }[];
  };

  // Revenue Analytics
  revenueData: {
    totalRevenue: number;
    monthlyRevenue: { month: string; revenue: number; deals: number }[];
    averageDealSize: number;
    revenueBySource: { source: string; revenue: number; deals: number }[];
  };

  // Email Campaign Performance
  emailAnalytics: {
    totalCampaigns: number;
    totalEmailsSent: number;
    openRate: number;
    clickRate: number;
    conversionRate: number;
    topPerformingCampaigns: {
      name: string;
      openRate: number;
      conversionRate: number;
    }[];
  };

  // Appointment Analytics
  appointmentMetrics: {
    totalAppointments: number;
    upcomingAppointments: number;
    completionRate: number;
    noShowRate: number;
    avgDuration: number;
    leadToAppointmentRate: number;
  };

  // Activity Tracking
  userActivity: {
    totalActivities: number;
    activityByType: { type: string; count: number }[];
    recentActivities: {
      type: string;
      description: string;
      created_at: string;
    }[];
  };

  // Predictive Analytics
  predictions: {
    nextMonthLeads: number;
    projectedRevenue: number;
    conversionProbability: number;
    churnRisk: number;
  };
}

export interface LeadQualificationResult {
  score: number;
  budget: "low" | "medium" | "high" | "enterprise";
  timeline: "immediate" | "1-3months" | "3-6months" | "exploring";
  recommendedServices: string[];
  nextSteps: string[];
  summary: string;
}

export interface ServiceRecommendation {
  service: Service;
  matchScore: number;
  reasons: string[];
}

export interface Notification {
  id: string;
  type: "lead" | "appointment" | "conversation" | "system" | "ai";
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface AIMessage {
  id: string;
  agentId: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  metadata?: {
    model?: string;
    tokensUsed?: number;
    generationTime?: number;
  };
}

// ============================================
// LEAD ENRICHMENT TYPES
// ============================================

export interface LeadEnrichment {
  id: string;
  lead_id: string;
  source: "people_data_labs" | "forager" | "crustdata";
  enrichment_data: Record<string, unknown>;
  confidence_score?: number;
  company_name?: string;
  company_size?: string;
  company_industry?: string;
  company_website?: string;
  company_linkedin_url?: string;
  company_funding?: string;
  job_title?: string;
  linkedin_url?: string;
  twitter_url?: string;
  github_url?: string;
  tech_stack?: string[];
  skills?: string[];
  social_profiles?: Record<string, unknown>;
  enriched_at: string;
  created_at: string;
  updated_at: string;
}

export interface EnrichmentSource {
  id: string;
  name: "people_data_labs" | "forager" | "crustdata";
  api_key_configured: boolean;
  is_active: boolean;
  priority: number;
  rate_limit_per_minute?: number;
  cost_per_request?: number;
  last_used_at?: string;
  created_at: string;
  updated_at: string;
}

export interface IntentSignal {
  id: string;
  lead_id: string;
  signal_type:
    | "website_visit"
    | "email_open"
    | "email_click"
    | "form_submit"
    | "chat_message"
    | "social_interaction";
  signal_data: Record<string, unknown>;
  score_impact: number;
  created_at: string;
}

// ============================================
// EMAIL CAMPAIGN TYPES
// ============================================

export interface EmailCampaign {
  id: string;
  name: string;
  description?: string;
  status: "draft" | "active" | "paused" | "completed";
  target_audience?: Record<string, unknown>;
  created_by?: string;
  total_recipients: number;
  emails_sent: number;
  emails_opened: number;
  emails_clicked: number;
  conversion_count: number;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  category?: string;
  is_ai_generated: boolean;
  ab_test_variant?: string;
  performance_score?: number;
  created_at: string;
  updated_at: string;
}

export interface EmailSequenceStep {
  id: string;
  campaign_id: string;
  template_id: string;
  step_number: number;
  delay_hours: number;
  condition?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface EmailSent {
  id: string;
  campaign_id: string;
  lead_id: string;
  template_id: string;
  step_number: number;
  recipient_email: string;
  subject: string;
  body: string;
  status:
    | "queued"
    | "sent"
    | "delivered"
    | "opened"
    | "clicked"
    | "bounced"
    | "failed";
  sent_at?: string;
  opened_at?: string;
  clicked_at?: string;
  click_count: number;
  tracking_id: string;
  error_message?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// ============================================
// WORKFLOW AUTOMATION TYPES
// ============================================

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  status: "draft" | "active" | "paused" | "archived";
  is_template: boolean;
  template_category?: string;
  created_by?: string;
  execution_count: number;
  success_count: number;
  failure_count: number;
  last_executed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowTrigger {
  id: string;
  workflow_id: string;
  trigger_type:
    | "lead_created"
    | "lead_status_changed"
    | "email_opened"
    | "email_clicked"
    | "form_submitted"
    | "appointment_scheduled"
    | "time_based"
    | "webhook";
  trigger_config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowAction {
  id: string;
  workflow_id: string;
  action_type:
    | "send_email"
    | "update_lead"
    | "create_task"
    | "call_webhook"
    | "run_ai_agent"
    | "wait"
    | "condition";
  action_config: Record<string, unknown>;
  order: number;
  parent_action_id?: string;
  condition?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  trigger_type: string;
  trigger_data: Record<string, unknown>;
  status: "running" | "completed" | "failed" | "cancelled";
  started_at: string;
  completed_at?: string;
  error_message?: string;
  created_at: string;
}

export interface WorkflowExecutionLog {
  id: string;
  execution_id: string;
  action_id?: string;
  action_type: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  input_data?: Record<string, unknown>;
  output_data?: Record<string, unknown>;
  error_message?: string;
  duration_ms?: number;
  created_at: string;
}

// ============================================
// MULTI-CHANNEL TYPES
// ============================================

export interface ChannelConfig {
  id: string;
  channel_type: "whatsapp" | "sms" | "messenger" | "instagram" | "email";
  is_active: boolean;
  provider: string;
  api_credentials: Record<string, unknown>;
  webhook_url?: string;
  phone_number?: string;
  page_id?: string;
  rate_limit_per_minute?: number;
  created_at: string;
  updated_at: string;
}
