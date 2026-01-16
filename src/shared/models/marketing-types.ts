/**
 * Marketing Automation Agent Types
 * 
 * These types define the input/output contracts for marketing automation agents.
 * They are stored as JSON in the database (MarketingCampaignStep.input/output).
 */

// ============================================
// RESEARCH AGENT
// ============================================

export interface ResearchAgentInput {
  topic: string;
  targetAudience?: string;
  goal?: string;
  brandContext?: string;
}

export interface ResearchAgentOutput {
  summary: string;
  targetAudience: string;
  primaryGoal: string;
  keyMessages: string[];
  seoKeywords: {
    primary: string[];
    secondary: string[];
    longTail: string[];
  };
  suggestedHeadlines: string[];
  outline: {
    title: string;
    sections: Array<{
      heading: string;
      description: string;
    }>;
  };
  faqs: Array<{
    question: string;
    answer: string;
  }>;
}

// ============================================
// SEO CONTENT AGENT
// ============================================

export interface SEOContentAgentInput {
  topic: string;
  targetAudience: string;
  goal: string;
  brief: ResearchAgentOutput;
  desiredLength?: "short" | "medium" | "long";
  brandVoice?: string;
}

export interface SEOContentAgentOutput {
  title: string;
  slugSuggestion: string;
  meta: {
    description: string;
    keywords: string[];
  };
  contentSections: Array<{
    heading: string;
    body: string; // markdown format
  }>;
  callToAction: {
    text: string;
    urlSuggestion?: string;
  };
  socialSnippets: {
    twitter: string;
    linkedin: string;
    emailSubject: string;
    emailPreviewText: string;
  };
  estimatedReadTime: number; // minutes
}

// ============================================
// ANALYTICS AGENT (placeholder for future)
// ============================================

export interface AnalyticsAgentInput {
  contentUrl?: string;
  campaignId: string;
  metricsSource?: "google-analytics" | "custom";
}

export interface AnalyticsAgentOutput {
  performance: {
    views: number;
    clicks: number;
    conversions: number;
    ctr: number;
    conversionRate: number;
  };
  recommendations: string[];
  suggestedImprovements: Array<{
    area: string;
    suggestion: string;
    priority: "high" | "medium" | "low";
  }>;
}
