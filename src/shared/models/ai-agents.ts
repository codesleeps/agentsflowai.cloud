// AI Agent Types for AgentsFlowAI

export type AIProvider =
  | "ollama"
  | "google"
  | "anthropic"
  | "openai"
  | "openrouter";

export interface ModelFallbackConfig {
  provider: AIProvider;
  model: string;
  priority: number; // 1 = primary, 2 = secondary, 3 = tertiary
  maxRetries: number;
}

export interface AIAgent {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AIAgentCategory;
  systemPrompt: string;
  capabilities: string[];
  model: string;
  provider?: AIProvider;
  supportedProviders: Array<{
    provider: string;
    model: string;
    priority: number;
  }>;
  defaultProvider: string;
  costTier: "free" | "low" | "medium" | "high";
  isActive: boolean;
}

export type AIAgentCategory =
  | "web-development"
  | "analytics"
  | "content-creation"
  | "marketing"
  | "social-media"
  | "seo"
  | "fast-chat";

// ... (keep intermediate interfaces as they are, but since I'm only replacing AIAgent definition and AI_AGENTS list, I need to include them in the chunk or use logic. Wait, replace_file_content requires a single contiguous block.
// I will rewrite the AIAgent interface and then use a separate call or a very large block to update AI_AGENTS if they are far apart.
// Actually, they are far apart (lines 3-13 vs 145-301). I should use MULTI_REPLACE.

// WAIT, I only have replace_file_content or multi_replace.
// I will use multi_replace.

export interface AIAgentMessage {
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

export interface AIAgentConversation {
  id: string;
  agentId: string;
  title: string;
  messages: AIAgentMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  system?: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
    stop?: string[];
  };
}

export interface OllamaGenerateResponse {
  model: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    format: string;
    family: string;
    parameter_size: string;
    quantization_level: string;
  };
}

export interface ContentGenerationRequest {
  type:
    | "blog-post"
    | "social-post"
    | "ad-copy"
    | "email"
    | "seo-content"
    | "code";
  topic: string;
  tone?: string;
  length?: "short" | "medium" | "long";
  keywords?: string[];
  targetAudience?: string;
  additionalContext?: string;
}

export interface SEOAnalysisRequest {
  url?: string;
  content?: string;
  targetKeywords?: string[];
  competitors?: string[];
}

export interface SEOAnalysisResult {
  score: number;
  keywords: {
    keyword: string;
    density: number;
    suggestions: string[];
  }[];
  metaTags: {
    title: string;
    description: string;
    suggestions: string[];
  };
  contentSuggestions: string[];
  technicalIssues: string[];
}

export interface SocialMediaPost {
  platform: "twitter" | "linkedin" | "instagram" | "facebook";
  content: string;
  hashtags: string[];
  scheduledAt?: Date;
  imagePrompt?: string;
}

export interface MarketingCampaign {
  name: string;
  objective: string;
  targetAudience: string;
  channels: string[];
  budget?: number;
  duration: string;
  keyMessages: string[];
  callToAction: string;
}

export interface AnalyticsInsight {
  title: string;
  description: string;
  type: "trend" | "anomaly" | "opportunity" | "recommendation";
  confidence: number;
  data?: Record<string, unknown>;
  actionItems: string[];
}

// Agent configurations
export const AI_AGENTS: AIAgent[] = [
  {
    id: "web-dev-agent",
    name: "Web Development Agent",
    description:
      "Expert in web development, code generation, debugging, and optimization",
    icon: "💻",
    category: "web-development",
    model: "mistral:latest",
    provider: "ollama",
    defaultProvider: "ollama",
    costTier: "medium",
    isActive: true,
    capabilities: [
      "Generate React/Next.js components",
      "Debug JavaScript/TypeScript code",
      "Optimize performance",
      "Create API endpoints",
      "Write unit tests",
      "Write code to file",
      "Explain code concepts",
    ],
    supportedProviders: [
      {
        provider: "ollama",
        model: "mistral:latest",
        priority: 1,
      },
      {
        provider: "ollama",
        model: "llama3.1:8b",
        priority: 2,
      },
      {
        provider: "openrouter",
        model: "anthropic/claude-3.5-sonnet",
        priority: 3,
      },
      {
        provider: "google",
        model: "gemini-pro",
        priority: 4,
      },
      {
        provider: "openai",
        model: "gpt-4-turbo",
        priority: 5,
      },
    ],
    systemPrompt: `You are an expert web developer specializing in modern technologies including React, Next.js, Python, TypeScript, Node.js, and Tailwind CSS. You help users:
- Generate clean, maintainable code
- Debug issues and fix errors
- Optimize performance
- Follow best practices and design patterns
- Write comprehensive tests

Always provide code examples when relevant. Use TypeScript for type safety. Follow modern React patterns with hooks and functional components.`,
  },
  {
    id: "analytics-agent",
    name: "Analytics Agent",
    description:
      "Data analysis, insights generation, and business intelligence",
    icon: "📊",
    category: "analytics",
    model: "mistral:latest",
    provider: "ollama",
    defaultProvider: "ollama",
    costTier: "medium",
    isActive: true,
    capabilities: [
      "Analyze business metrics",
      "Identify trends and patterns",
      "Generate data insights",
      "Create forecasts",
      "Suggest optimizations",
      "Explain complex data",
    ],
    supportedProviders: [
      {
        provider: "ollama",
        model: "mistral:latest",
        priority: 1,
      },
      {
        provider: "ollama",
        model: "llama3.1:8b",
        priority: 2,
      },
      {
        provider: "openrouter",
        model: "anthropic/claude-3.5-sonnet",
        priority: 3,
      },
      {
        provider: "google",
        model: "gemini-pro",
        priority: 4,
      },
      {
        provider: "openai",
        model: "gpt-4-turbo",
        priority: 5,
      },
    ],
    systemPrompt: `You are a data analytics expert specializing in business intelligence and data-driven decision making. You help users:
- Analyze business metrics and KPIs
- Identify trends, patterns, and anomalies
- Generate actionable insights
- Create forecasts and predictions
- Suggest data-driven optimizations
- Explain complex data in simple terms

Always provide specific, actionable recommendations. Use data to support your insights. Consider both short-term and long-term implications.`,
  },
  {
    id: "content-agent",
    name: "Content Creation Agent",
    description: "Blog posts, articles, copy, and all types of written content",
    icon: "✍️",
    category: "content-creation",
    model: "mistral:latest",
    provider: "ollama",
    defaultProvider: "ollama",
    costTier: "medium",
    isActive: true,
    capabilities: [
      "Write blog posts and articles",
      "Create marketing copy",
      "Generate email content",
      "Craft product descriptions",
      "Edit and improve content",
      "Adapt tone and style",
    ],
    supportedProviders: [
      {
        provider: "ollama",
        model: "mistral:latest",
        priority: 1,
      },
      {
        provider: "ollama",
        model: "llama3.1:8b",
        priority: 2,
      },
      {
        provider: "openrouter",
        model: "anthropic/claude-3.5-sonnet",
        priority: 3,
      },
      {
        provider: "google",
        model: "gemini-pro",
        priority: 4,
      },
      {
        provider: "openai",
        model: "gpt-4-turbo",
        priority: 5,
      },
    ],
    systemPrompt: `You are an expert content creator and copywriter with years of experience in digital marketing. You help users:
- Write engaging blog posts and articles
- Create compelling marketing copy
- Generate email sequences
- Craft product descriptions
- Edit and improve existing content
- Adapt content for different audiences and tones

Always focus on clarity, engagement, and conversion. Use storytelling techniques. Optimize for readability while maintaining SEO best practices.`,
  },
  {
    id: "marketing-agent",
    name: "Marketing Agent",
    description:
      "Campaign strategies, ad copy, funnels, and marketing automation",
    icon: "📣",
    category: "marketing",
    model: "mistral:latest",
    provider: "ollama",
    defaultProvider: "ollama",
    costTier: "medium",
    isActive: true,
    capabilities: [
      "Create marketing strategies",
      "Design sales funnels",
      "Write ad copy",
      "Plan campaigns",
      "Analyze competitors",
      "Suggest optimizations",
    ],
    supportedProviders: [
      {
        provider: "ollama",
        model: "mistral:latest",
        priority: 1,
      },
      {
        provider: "ollama",
        model: "llama3.1:8b",
        priority: 2,
      },
      {
        provider: "openrouter",
        model: "anthropic/claude-3.5-sonnet",
        priority: 3,
      },
      {
        provider: "google",
        model: "gemini-pro",
        priority: 4,
      },
      {
        provider: "openai",
        model: "gpt-4-turbo",
        priority: 5,
      },
    ],
    systemPrompt: `You are a marketing strategist with expertise in digital marketing, growth hacking, and conversion optimization. You help users:
- Create comprehensive marketing strategies
- Design effective sales funnels
- Write high-converting ad copy
- Plan and execute campaigns
- Analyze competitor strategies
- Optimize marketing ROI

Always focus on measurable results and ROI. Consider the customer journey. Use proven marketing frameworks and adapt them to specific needs.`,
  },
  {
    id: "social-media-agent",
    name: "Social Media Agent",
    description: "Social media content, scheduling, engagement strategies",
    icon: "📱",
    category: "social-media",
    model: "mistral:latest",
    provider: "ollama",
    defaultProvider: "ollama",
    costTier: "medium",
    isActive: true,
    capabilities: [
      "Create social media posts",
      "Generate hashtag strategies",
      "Plan content calendars",
      "Write captions",
      "Suggest engagement tactics",
      "Analyze trends",
    ],
    supportedProviders: [
      {
        provider: "ollama",
        model: "mistral:latest",
        priority: 1,
      },
      {
        provider: "ollama",
        model: "llama3.1:8b",
        priority: 2,
      },
      {
        provider: "openrouter",
        model: "anthropic/claude-3.5-sonnet",
        priority: 3,
      },
      {
        provider: "google",
        model: "gemini-pro",
        priority: 4,
      },
      {
        provider: "openai",
        model: "gpt-4-turbo",
        priority: 5,
      },
    ],
    systemPrompt: `You are a social media expert with deep knowledge of all major platforms including Twitter/X, LinkedIn, Instagram, Facebook, and TikTok. You help users:
- Create engaging social media posts
- Develop hashtag strategies
- Plan content calendars
- Write platform-specific captions
- Suggest engagement tactics
- Analyze social media trends

Always consider platform-specific best practices. Focus on engagement and community building. Use current trends and formats.`,
  },
  {
    id: "seo-agent",
    name: "SEO Agent",
    description:
      "Search engine optimization, keywords, meta tags, and rankings",
    icon: "🔍",
    category: "seo",
    model: "mistral:latest",
    provider: "ollama",
    defaultProvider: "ollama",
    costTier: "medium",
    isActive: true,
    capabilities: [
      "Keyword research",
      "On-page SEO optimization",
      "Meta tag generation",
      "Content optimization",
      "Technical SEO advice",
      "Competitor analysis",
    ],
    supportedProviders: [
      {
        provider: "ollama",
        model: "mistral:latest",
        priority: 1,
      },
      {
        provider: "ollama",
        model: "llama3.1:8b",
        priority: 2,
      },
      {
        provider: "openrouter",
        model: "anthropic/claude-3.5-sonnet",
        priority: 3,
      },
      {
        provider: "google",
        model: "gemini-pro",
        priority: 4,
      },
      {
        provider: "openai",
        model: "gpt-4-turbo",
        priority: 5,
      },
    ],
    systemPrompt: `You are an SEO expert with comprehensive knowledge of search engine algorithms, keyword research, and content optimization. You help users:
- Conduct keyword research
- Optimize on-page SEO elements
- Generate meta tags and descriptions
- Improve content for search rankings
- Provide technical SEO recommendations
- Analyze competitor SEO strategies

Always follow current SEO best practices. Focus on user intent and search quality. Provide specific, actionable recommendations with expected impact.`,
  },
  {
    id: "fast-chat-agent",
    name: "Fast Chat Agent",
    description:
      "High-speed responses using local Ollama for quick answers and chat",
    icon: "⚡",
    category: "fast-chat",
    model: "mistral:latest",
    provider: "ollama",
    defaultProvider: "ollama",
    costTier: "free",
    isActive: true,
    capabilities: [
      "Rapid responses",
      "General knowledge",
      "Brainstorming",
      "Quick summaries",
      "Chat and conversation",
    ],
    supportedProviders: [
      { provider: "ollama", model: "mistral:latest", priority: 1 },
      { provider: "ollama", model: "llama3.1:8b", priority: 2 },
      { provider: "google", model: "gemini-2.0-flash", priority: 3 },
    ],
    systemPrompt: `You are a helpful, fast, and efficient AI assistant powered by Ollama's Mistral model.
- Keep answers concise and to the point.
- Prioritize speed and clarity.
- Be friendly and conversational.
- If you don't know something, admit it quickly.`,
  },
  {
    id: "gemini-agent",
    name: "Gemini Cloud Agent",
    description:
      "Powered by Google Gemini Flash for advanced reasoning and speed",
    icon: "✨",
    category: "fast-chat",
    model: "gemini-2.0-flash",
    provider: "google",
    defaultProvider: "google",
    costTier: "low",
    isActive: true,
    capabilities: [
      "Advanced reasoning",
      "Code generation",
      "Large context analysis",
      "Creative writing",
      "Multimodal understanding",
    ],
    supportedProviders: [
      { provider: "google", model: "gemini-2.0-flash", priority: 1 },
      {
        provider: "anthropic",
        model: "claude-3-5-sonnet-20241022",
        priority: 2,
      },
      { provider: "ollama", model: "mistral:latest", priority: 3 },
    ],
    systemPrompt: `You are an advanced AI assistant powered by Google's Gemini Flash model.
- Leverage your advanced reasoning capabilities for complex problems.
- Provide detailed, high-quality responses.
- You have a large context window, so feel free to reference previous parts of the conversation in detail.
- Be helpful, harmless, and honest.`,
  },
  {
    id: "openrouter-agent",
    name: "OpenRouter Unified Agent",
    description:
      "Access to 100+ models through OpenRouter including GPT-4, Claude, Gemini, Llama, and more",
    icon: "🌐",
    category: "fast-chat",
    model: "anthropic/claude-3.5-sonnet",
    provider: "openrouter",
    defaultProvider: "openrouter",
    costTier: "medium",
    isActive: true,
    capabilities: [
      "Access to 100+ models",
      "GPT-4, Claude, Gemini, Llama support",
      "Advanced reasoning",
      "Code generation",
      "Creative writing",
      "Multimodal capabilities",
      "Cost optimization",
    ],
    supportedProviders: [
      {
        provider: "openrouter",
        model: "anthropic/claude-3.5-sonnet",
        priority: 1,
      },
      {
        provider: "openai",
        model: "gpt-4-turbo",
        priority: 2,
      },
      {
        provider: "google",
        model: "gemini-pro",
        priority: 3,
      },
      {
        provider: "openrouter",
        model: "meta-llama/llama-3.1-70b-instruct",
        priority: 4,
      },
      {
        provider: "ollama",
        model: "mistral:latest",
        priority: 5,
      },
    ],
    systemPrompt: `You are an advanced AI assistant with access to multiple state-of-the-art models through OpenRouter. You can leverage the best models including GPT-4, Claude 3.5, Gemini Pro, and Llama 3.1.

Your capabilities include:
- Advanced reasoning and problem-solving
- Code generation in multiple languages
- Creative writing and content creation
- Data analysis and mathematical reasoning
- Multimodal understanding (text, images, audio)
- Access to cutting-edge AI models

Always provide:
- Clear, well-structured responses
- Code examples when relevant
- Step-by-step explanations for complex problems
- Creative solutions and alternative approaches
- Acknowledge when you're using specific model capabilities

You have access to extensive knowledge and can handle complex, multi-step tasks. Be helpful, accurate, and thorough in your responses.`,
  },
];

// Create a map of agent configurations for easy access
export const AI_AGENT_CONFIGS = AI_AGENTS.reduce(
  (acc, agent) => {
    acc[agent.id] = agent;
    return acc;
  },
  {} as Record<string, AIAgent>,
);
