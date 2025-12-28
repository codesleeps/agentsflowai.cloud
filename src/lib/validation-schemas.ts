import { z } from "zod";

// Enums for validation
const LeadSourceEnum = z.enum(["website", "chat", "referral", "ads"]);
const LeadStatusEnum = z.enum([
  "new",
  "contacted",
  "qualified",
  "proposal",
  "closed_won",
  "closed_lost",
]);
const LeadBudgetEnum = z.enum([
  "under_5k",
  "5k_25k",
  "25k_100k",
  "100k_500k",
  "500k_plus",
]);
const LeadTimelineEnum = z.enum([
  "immediate",
  "1_3_months",
  "3_6_months",
  "6_12_months",
  "12_plus_months",
]);
const ChannelEnum = z.enum([
  "chat",
  "email",
  "phone",
  "whatsapp",
  "sms",
  "messenger",
  "instagram",
]);
const EnrichmentSourceEnum = z.enum([
  "people_data_labs",
  "forager",
  "crustdata",
]);
const EmailCampaignStatusEnum = z.enum([
  "draft",
  "active",
  "paused",
  "completed",
]);
const EmailSentStatusEnum = z.enum([
  "queued",
  "sent",
  "delivered",
  "opened",
  "clicked",
  "bounced",
  "failed",
]);
const WorkflowStatusEnum = z.enum(["draft", "active", "paused", "archived"]);
const WorkflowTriggerTypeEnum = z.enum([
  "lead_created",
  "lead_status_changed",
  "email_opened",
  "email_clicked",
  "form_submitted",
  "appointment_scheduled",
  "time_based",
  "webhook",
]);
const WorkflowActionTypeEnum = z.enum([
  "send_email",
  "update_lead",
  "create_task",
  "call_webhook",
  "run_ai_agent",
  "wait",
  "condition",
]);
const IntentSignalTypeEnum = z.enum([
  "website_visit",
  "email_open",
  "email_click",
  "form_submit",
  "chat_message",
  "social_interaction",
]);
const RoleEnum = z.enum(["user", "assistant", "system"]);
const ServiceTierEnum = z.enum(["basic", "growth", "enterprise"]);
const OllamaActionEnum = z.enum(["generate", "chat", "models", "pull"]);
const AIProviderEnum = z.enum([
  "ollama",
  "google",
  "anthropic",
  "openai",
  "openrouter",
]);

// Phone number regex (basic international format)
const phoneRegex = /^\+?[\d\s\-\(\)]{7,}$/;

// Lead validation schemas
export const LeadCreateSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  email: z.string().email("Invalid email format"),
  company: z
    .string()
    .max(100, "Company name must be less than 100 characters")
    .optional(),
  phone: z.string().regex(phoneRegex, "Invalid phone number format").optional(),
  source: LeadSourceEnum,
  budget: LeadBudgetEnum.optional(),
  timeline: LeadTimelineEnum.optional(),
  notes: z
    .string()
    .max(1000, "Notes must be less than 1000 characters")
    .optional(),
});

export const LeadUpdateSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters")
    .optional(),
  email: z.string().email("Invalid email format").optional(),
  company: z
    .string()
    .max(100, "Company name must be less than 100 characters")
    .optional(),
  phone: z.string().regex(phoneRegex, "Invalid phone number format").optional(),
  source: LeadSourceEnum.optional(),
  budget: LeadBudgetEnum.optional(),
  timeline: LeadTimelineEnum.optional(),
  notes: z
    .string()
    .max(1000, "Notes must be less than 1000 characters")
    .optional(),
  status: LeadStatusEnum.optional(),
  score: z.number().min(0).max(100).optional(),
  interests: z.array(z.string()).optional(),
});

// Appointment validation schemas
export const AppointmentCreateSchema = z.object({
  lead_id: z.string().uuid("Invalid lead ID format"),
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters"),
  description: z
    .string()
    .max(1000, "Description must be less than 1000 characters")
    .optional(),
  scheduled_at: z.string().datetime("Invalid date format"),
  duration_minutes: z
    .number()
    .min(15, "Duration must be at least 15 minutes")
    .max(480, "Duration cannot exceed 8 hours"),
  meeting_link: z.string().url("Invalid meeting link format").optional(),
  notes: z
    .string()
    .max(1000, "Notes must be less than 1000 characters")
    .optional(),
});

// Conversation validation schemas
export const ConversationCreateSchema = z.object({
  lead_id: z.string().uuid("Invalid lead ID format").optional(),
  channel: ChannelEnum,
});

export const MessageCreateSchema = z.object({
  role: RoleEnum,
  content: z
    .string()
    .min(1, "Content is required")
    .max(10000, "Content must be less than 10,000 characters"),
  metadata: z.record(z.any()).optional(),
});

// Service validation schemas
export const ServiceCreateSchema = z.object({
  name: z
    .string()
    .min(1, "Service name is required")
    .max(100, "Service name must be less than 100 characters"),
  description: z
    .string()
    .max(1000, "Description must be less than 1000 characters")
    .optional(),
  tier: ServiceTierEnum,
  price: z.number().min(0, "Price must be non-negative"),
  features: z.array(z.string()).min(1, "At least one feature is required"),
});

// AI/Ollama validation schemas
export const OllamaRequestSchema = z.object({
  action: OllamaActionEnum,
  model: z.string().optional(),
  prompt: z.string().optional(),
  messages: z
    .array(
      z.object({
        role: RoleEnum,
        content: z.string().min(1, "Message content is required"),
      }),
    )
    .optional(),
  options: z.record(z.any()).optional(),
});

export const AIAgentRequestSchema = z.object({
  agentId: z.string().min(1, "Agent ID is required"),
  message: z
    .string()
    .min(1, "Message is required")
    .max(5000, "Message must be less than 5000 characters"),
  conversationHistory: z
    .array(
      z.object({
        role: RoleEnum,
        content: z.string().min(1, "Message content is required"),
      }),
    )
    .optional(),
  preferredProvider: AIProviderEnum.optional(),
});

export const ModelConfigSchema = z.object({
  agentId: z.string(),
  primaryProvider: AIProviderEnum,
  primaryModel: z.string(),
  fallbackChain: z.array(
    z.object({
      provider: AIProviderEnum,
      model: z.string(),
      priority: z.number(),
    }),
  ),
});

export const UsageQuerySchema = z.object({
  userId: z.string().uuid(),
  dateRange: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
  }),
});

// Query parameter schemas
export const PaginationSchema = z.object({
  page: z
    .string()
    .transform(Number)
    .refine((val) => val > 0, "Page must be greater than 0")
    .optional(),
  limit: z
    .string()
    .transform(Number)
    .refine((val) => val > 0 && val <= 100, "Limit must be between 1 and 100")
    .optional(),
  search: z.string().optional(),
  status: LeadStatusEnum.optional(),
  source: LeadSourceEnum.optional(),
});

// ============================================
// LEAD ENRICHMENT VALIDATION SCHEMAS
// ============================================

export const LeadEnrichmentCreateSchema = z.object({
  lead_id: z.string().uuid("Invalid lead ID format"),
  source: EnrichmentSourceEnum,
  enrichment_data: z.record(z.any()),
  confidence_score: z.number().min(0).max(1).optional(),
  company_name: z.string().max(200).optional(),
  company_size: z.string().max(100).optional(),
  company_industry: z.string().max(100).optional(),
  company_website: z.string().url().optional(),
  job_title: z.string().max(200).optional(),
  linkedin_url: z.string().url().optional(),
  tech_stack: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
});

export const IntentSignalCreateSchema = z.object({
  lead_id: z.string().uuid("Invalid lead ID format"),
  signal_type: IntentSignalTypeEnum,
  signal_data: z.record(z.any()),
  score_impact: z.number(),
});

// ============================================
// EMAIL CAMPAIGN VALIDATION SCHEMAS
// ============================================

export const EmailCampaignCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  target_audience: z.record(z.any()).optional(),
});

export const EmailCampaignUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  status: EmailCampaignStatusEnum.optional(),
});

export const EmailTemplateCreateSchema = z.object({
  name: z.string().min(1).max(200),
  subject: z.string().min(1).max(500),
  body: z.string().min(1),
  variables: z.array(z.string()),
  category: z.string().optional(),
  is_ai_generated: z.boolean().optional(),
});

export const EmailSequenceStepCreateSchema = z.object({
  campaign_id: z.string().uuid("Invalid campaign ID format"),
  template_id: z.string().uuid("Invalid template ID format"),
  step_number: z.number().int().min(1),
  delay_hours: z.number().int().min(0),
  condition: z.record(z.any()).optional(),
});

// ============================================
// WORKFLOW AUTOMATION VALIDATION SCHEMAS
// ============================================

export const WorkflowCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  status: WorkflowStatusEnum.optional(),
  is_template: z.boolean().optional(),
  template_category: z.string().optional(),
});

export const WorkflowUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  status: WorkflowStatusEnum.optional(),
});

export const WorkflowTriggerCreateSchema = z.object({
  workflow_id: z.string().uuid("Invalid workflow ID format"),
  trigger_type: WorkflowTriggerTypeEnum,
  trigger_config: z.record(z.any()),
  is_active: z.boolean().optional(),
});

export const WorkflowActionCreateSchema = z.object({
  workflow_id: z.string().uuid("Invalid workflow ID format"),
  action_type: WorkflowActionTypeEnum,
  action_config: z.record(z.any()),
  order: z.number().int().min(0),
  parent_action_id: z.string().uuid().optional(),
  condition: z.record(z.any()).optional(),
});

// ============================================
// MULTI-CHANNEL VALIDATION SCHEMAS
// ============================================

export const ChannelConfigCreateSchema = z.object({
  channel_type: z.enum(["whatsapp", "sms", "messenger", "instagram", "email"]),
  is_active: z.boolean().optional(),
  provider: z.string(),
  api_credentials: z.record(z.any()).optional(),
  webhook_url: z.string().url().optional(),
  phone_number: z.string().optional(),
  page_id: z.string().optional(),
});

// Utility function to sanitize strings
export function sanitizeString(input: string): string {
  return input.trim().replace(/\0/g, "");
}

// Utility function to validate and sanitize input
export function validateAndSanitize<T>(schema: z.ZodSchema<T>, data: any): T {
  const validated = schema.parse(data);

  // Apply sanitization to string fields
  if (typeof validated === "object" && validated !== null) {
    Object.keys(validated).forEach((key) => {
      if (typeof (validated as any)[key] === "string") {
        (validated as any)[key] = sanitizeString((validated as any)[key]);
      }
    });
  }

  return validated;
}

// New schema for AI text generation
export const GenerateTextRequestSchema = z.object({
  prompt: z
    .string()
    .min(1, "Prompt is required")
    .max(10000, "Prompt must be less than 10,000 characters"),
  enableWebSearch: z.boolean().optional().default(false),
  enableDeepResearch: z.boolean().optional().default(false),
  reasoningEffort: z.enum(["low", "medium", "high"]).optional().default("low"),
  modelProvider: z.enum(["openai", "google"]).optional().default("openai"),
});

// ============================================
// ONBOARDING VALIDATION SCHEMAS
// ============================================

export const OnboardingCompleteSchema = z.object({
  step: z.enum(["welcome", "profile", "features"]),
  profileData: z
    .object({
      company: z.string().max(100).optional(),
      role: z.string().max(100).optional(),
      teamSize: z.enum(["1", "2-10", "11-50", "51-200", "200+"]).optional(),
    })
    .optional(),
});

// ============================================
// REGISTRATION VALIDATION SCHEMAS
// ============================================

// Password strength validation function
function validatePasswordStrength(password: string): boolean {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special char
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
}

export const RegistrationSchema = z
  .object({
    name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name must be less than 100 characters"),
    email: z.string().email("Invalid email format"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must be less than 128 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => validatePasswordStrength(data.password), {
    message:
      "Password must contain uppercase, lowercase, number, and special character",
    path: ["password"],
  });

export const LoginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});
