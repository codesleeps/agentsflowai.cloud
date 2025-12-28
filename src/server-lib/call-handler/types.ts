// AI Call Handler Types

export interface CallSession {
  id: string;
  phoneNumber: string;
  callerId: string;
  startTime: Date;
  endTime?: Date;
  status: string;
  transcript: CallTranscript[];
  aiResponses: CallResponse[];
  leadId?: string;
  agentId?: string;
  sentiment?: string;
  intent?: string;
  confidence?: number;
}

export interface CallTranscript {
  id: string;
  sessionId: string;
  speaker: string;
  content: string;
  timestamp: Date;
  confidence: number;
  duration?: number;
}

export interface CallResponse {
  id: string;
  sessionId: string;
  content: string;
  timestamp: Date;
  modelUsed?: string;
  responseTime?: number;
}

export interface CallIntent {
  type:
    | "sales"
    | "support"
    | "information"
    | "complaint"
    | "callback"
    | "unknown";
  confidence: number;
  keywords: string[];
  extractedData: {
    name?: string;
    company?: string;
    phone?: string;
    email?: string;
    budget?: string;
    timeline?: string;
    requirements?: string[];
  };
}

export interface CallAnalysis {
  sentiment: "positive" | "neutral" | "negative";
  urgency: "low" | "medium" | "high";
  complexity: "simple" | "medium" | "complex";
  recommendedAction:
    | "transfer_to_agent"
    | "schedule_callback"
    | "send_info"
    | "resolve_automatically";
  keyTopics: string[];
  followUpRequired: boolean;
}

export interface TwilioCallWebhook {
  CallSid: string;
  AccountSid: string;
  From: string;
  To: string;
  CallStatus:
    | "ringing"
    | "in-progress"
    | "completed"
    | "failed"
    | "busy"
    | "no-answer";
  Direction: "inbound" | "outbound-api" | "outbound-dial" | "outbound-client";
  FromCity?: string;
  FromState?: string;
  FromCountry?: string;
  ToCity?: string;
  ToState?: string;
  ToCountry?: string;
  ApiVersion: string;
  Timestamp: string;
  SequenceNumber: string;
}

export interface TwilioSpeechResult {
  account_sid: string;
  call_sid: string;
  confidence: number;
  final: boolean;
  speech_result: string;
  timestamp: number;
  track: "inbound" | "outbound";
}

export interface CallConfig {
  welcomeMessage: string;
  businessHours: {
    start: string; // "09:00"
    end: string; // "17:00"
    timezone: string; // "America/New_York"
  };
  maxCallDuration: number; // in seconds
  voicemailEnabled: boolean;
  transferOptions: {
    agentTransfer: boolean;
    callbackOption: boolean;
    emailFollowup: boolean;
  };
  aiSettings: {
    model: string;
    temperature: number;
    maxTokens: number;
    voice: string;
  };
}

export interface CallMetrics {
  totalCalls: number;
  answeredCalls: number;
  missedCalls: number;
  averageCallDuration: number;
  averageResponseTime: number;
  customerSatisfaction: number;
  conversionRate: number;
}
