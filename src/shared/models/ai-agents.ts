// AI Agent Types for AgentsFlowAI

export type AIProvider =
  | "ollama"
  | "openai"
  | "anthropic"
  | "openrouter";

export interface ModelFallbackConfig {
  provider: AIProvider;
  model: string;
  priority: number; // 1 = primary, 2 = secondary
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
    provider: AIProvider;
    model: string;
    priority: number;
  }>;
  defaultProvider: AIProvider;
  costTier: "free" | "low" | "medium" | "high";
  isActive: boolean;
  usage_count?: number;
  ollamaModelSize?: 'small' | 'medium' | 'large'; // For timeout estimation
  temperature?: number; // Controls output randomness
  maxTokens?: number; // Caps response length
}

export type AIAgentCategory =
  | "web-development"
  | "analytics"
  | "content-creation"
  | "marketing"
  | "social-media"
  | "seo"
  | "fast-chat";

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
    model: "deepseek/deepseek-chat",
    provider: "openrouter",
    defaultProvider: "openrouter",
    costTier: "low",
    isActive: true,
    ollamaModelSize: 'large',
    temperature: 0.2,
    maxTokens: 4000,
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
        provider: "openrouter",
        model: "deepseek/deepseek-chat",
        priority: 1,
      },
      {
        provider: "openrouter",
        model: "deepseek/deepseek-chat:free",
        priority: 2,
      },
      {
        provider: "openai",
        model: "gpt-4o-mini",
        priority: 3,
      },
      {
        provider: "ollama",
        model: "deepseek-coder:6.7b",
        priority: 3,
      },
      {
        provider: "ollama",
        model: "codellama:7b",
        priority: 4,
      },
    ],
    systemPrompt: `You are an expert web development assistant specializing in modern web technologies. You help users build production-ready applications using:

**Core Technologies:**
- React 19 with Server Components and Suspense
- Next.js 15 with App Router architecture
- TypeScript for type-safe development
- Tailwind CSS for styling

**Best Practices:**
- Generate clean, maintainable, and type-safe code
- Use Server Components by default, Client Components when needed
- Implement Server Actions for data mutations
- Follow Next.js 15 conventions (app directory, route handlers, metadata API)
- Optimize performance with code splitting and lazy loading
- Write accessible components following WCAG guidelines
- Include comprehensive error handling and loading states

**Capabilities:**
- Generate React/Next.js components with proper TypeScript types
- Debug JavaScript/TypeScript code effectively
- Create API route handlers with proper validation
- Write unit tests using Jest and React Testing Library
- Optimize bundle size and runtime performance
- Explain complex concepts clearly with examples

Always prioritize developer experience, maintainability, and production readiness. Provide complete, working code examples that follow current best practices.`,
  },
  {
    id: "analytics-agent",
    name: "Analytics Agent",
    description:
      "Data analysis, insights generation, and business intelligence",
    icon: "📊",
    category: "analytics",
    model: "z-ai/glm-4.5-air",
    provider: "openrouter",
    defaultProvider: "openrouter",
    costTier: "low",
    isActive: true,
    ollamaModelSize: 'large',
    temperature: 0.3,
    maxTokens: 3000,
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
        provider: "openrouter",
        model: "z-ai/glm-4.5-air",
        priority: 1,
      },
      {
        provider: "openrouter",
        model: "deepseek/deepseek-chat",
        priority: 2,
      },
      {
        provider: "ollama",
        model: "mistral:7b",
        priority: 3,
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
    model: "z-ai/glm-4.5-air",
    provider: "openrouter",
    defaultProvider: "openrouter",
    costTier: "medium",
    isActive: true,
    ollamaModelSize: 'medium',
    temperature: 0.8,
    maxTokens: 3000,
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
        provider: "openrouter",
        model: "z-ai/glm-4.5-air",
        priority: 1,
      },
      {
        provider: "openrouter",
        model: "deepseek/deepseek-chat",
        priority: 2,
      },
      {
        provider: "openai",
        model: "gpt-4o-mini",
        priority: 3,
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
    model: "z-ai/glm-4.5-air",
    provider: "openrouter",
    defaultProvider: "openrouter",
    costTier: "medium",
    isActive: true,
    ollamaModelSize: 'medium',
    temperature: 0.75,
    maxTokens: 2500,
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
        provider: "openrouter",
        model: "z-ai/glm-4.5-air",
        priority: 1,
      },
      {
        provider: "openrouter",
        model: "deepseek/deepseek-chat",
        priority: 2,
      },
      {
        provider: "ollama",
        model: "mistral:7b",
        priority: 3,
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
    model: "z-ai/glm-4.5-air",
    provider: "openrouter",
    defaultProvider: "openrouter",
    costTier: "low",
    isActive: true,
    ollamaModelSize: 'medium',
    temperature: 0.8,
    maxTokens: 1500,
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
        provider: "openrouter",
        model: "z-ai/glm-4.5-air",
        priority: 1,
      },
      {
        provider: "openrouter",
        model: "deepseek/deepseek-chat:free",
        priority: 2,
      },
      {
        provider: "ollama",
        model: "mistral:7b",
        priority: 3,
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
    model: "z-ai/glm-4.5-air",
    provider: "openrouter",
    defaultProvider: "openrouter",
    costTier: "medium",
    isActive: true,
    ollamaModelSize: 'medium',
    temperature: 0.3,
    maxTokens: 2000,
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
        provider: "openrouter",
        model: "z-ai/glm-4.5-air",
        priority: 1,
      },
      {
        provider: "openrouter",
        model: "deepseek/deepseek-chat",
        priority: 2,
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
      "High-speed responses using cost-effective Chinese models for quick answers and chat",
    icon: "⚡",
    category: "fast-chat",
    model: "deepseek/deepseek-chat:free",
    provider: "openrouter",
    defaultProvider: "openrouter",
    costTier: "low",
    isActive: true,
    ollamaModelSize: 'small',
    temperature: 0.7,
    maxTokens: 1000,
    capabilities: [
      "Rapid responses",
      "General knowledge",
      "Brainstorming",
      "Quick summaries",
      "Chat and conversation",
    ],
    supportedProviders: [
      {
        provider: "openrouter",
        model: "deepseek/deepseek-chat:free",
        priority: 1
      },
      {
        provider: "openrouter",
        model: "z-ai/glm-4.5-air:free",
        priority: 2
      },
      {
        provider: "ollama",
        model: "mistral:7b",
        priority: 3
      },
    ],
    systemPrompt: `You are a helpful, fast, and efficient AI assistant powered by cost-effective Chinese models.
- Keep answers concise and to the point.
- Prioritize speed and clarity.
- Be friendly and conversational.
- If you don't know something, admit it quickly.`,
  },
  {
    id: "gemini-agent",
    name: "Advanced Reasoning Agent",
    description:
      "Powered by Chinese AI models for advanced reasoning and speed",
    icon: "✨",
    category: "fast-chat",
    model: "z-ai/glm-4.5-air",
    provider: "openrouter",
    defaultProvider: "openrouter",
    costTier: "low",
    isActive: true,
    ollamaModelSize: 'medium',
    temperature: 0.7,
    maxTokens: 4000,
    capabilities: [
      "Advanced reasoning",
      "Code generation",
      "Large context analysis",
      "Creative writing",
      "Multimodal understanding",
    ],
    supportedProviders: [
      {
        provider: "openrouter",
        model: "z-ai/glm-4.5-air",
        priority: 1
      },
      {
        provider: "openrouter",
        model: "deepseek/deepseek-chat",
        priority: 2
      },
      {
        provider: "ollama",
        model: "gemma2:9b",
        priority: 3
      },
    ],
    systemPrompt: `You are an advanced AI assistant powered by cost-effective Chinese models with reasoning capabilities.
- Leverage your advanced reasoning capabilities for complex problems.
- Provide detailed, high-quality responses.
- You have a large context window, so feel free to reference previous parts of the conversation in detail.
- Be helpful, harmless, and honest.`,
  },
  {
    id: "nano-banana-agent",
    name: "Nano Banana Agent",
    description: "Creative image generation and editing powered by advanced AI models",
    icon: "🍌",
    category: "content-creation",
    model: "z-ai/glm-4.5-air",
    provider: "openrouter",
    defaultProvider: "openrouter",
    costTier: "medium",
    isActive: true,
    ollamaModelSize: 'medium',
    temperature: 0.9,
    maxTokens: 2000,
    capabilities: [
      "Text-to-image generation",
      "Consistent subject editing",
      "Image merging and transformation",
      "Context-aware image changes",
      "Rapid creative iteration",
    ],
    supportedProviders: [
      {
        provider: "openrouter",
        model: "z-ai/glm-4.5-air",
        priority: 1,
      },
      {
        provider: "openrouter",
        model: "deepseek/deepseek-chat",
        priority: 2,
      },
    ],
    systemPrompt: `You are the Nano Banana Agent, specializing in cutting-edge image generation and editing using advanced AI models. You help users:
- Generate high-quality images from text descriptions
- Perform consistent edits across multiple images
- Transform and merge existing images with natural language
- Provide creative inspiration and technical guidance for image creation

Always aim for photorealism and artistic excellence. If a user asks for an image, describe how you would generate it and provide the prompt you'll use.`,
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
