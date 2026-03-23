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

export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  category: string;
  instructions: string;
  examples?: string[];
  tools?: string[];
}

export interface AIAgent {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AIAgentCategory;
  systemPrompt: string;
  capabilities: string[];
  skills: AgentSkill[];
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
      "Create landing pages",
      "Build complete web applications",
    ],
    skills: [
      {
        id: "component-generation",
        name: "Component Generation",
        description: "Create production-ready React/Next.js components with TypeScript",
        category: "development",
        instructions: `When creating components:
1. Ask about purpose, props, state needs, and styling
2. Generate complete code with TypeScript interfaces
3. Include error boundaries, loading states, responsive design
4. Support dark mode and accessibility
5. Provide usage examples`,
        examples: [
          "Create a user profile card with avatar, name, email, role badge",
          "Build a data table with sorting, filtering, and pagination",
          "Design a modal dialog with form validation"
        ]
      },
      {
        id: "landing-page-creation",
        name: "Landing Page Creation",
        description: "Build high-converting, SEO-optimized landing pages",
        category: "development",
        instructions: `When creating landing pages:
1. Include all essential sections: Hero, Problem, Solution, Features, Social Proof, Pricing, FAQ, CTA
2. Use provided component templates (HeroSection, FeaturesGrid, TestimonialsSection, PricingSection, CTASection)
3. Make responsive with Tailwind CSS
4. Add SEO metadata and structured data
5. Include conversion-focused copy and CTAs
6. Optimize images and performance`,
        examples: [
          "Create a SaaS landing page for email marketing tool",
          "Build a fitness app landing page with pricing tiers",
          "Design an online course platform landing page"
        ]
      },
      {
        id: "api-development",
        name: "API Development",
        description: "Create RESTful API endpoints with validation and error handling",
        category: "development",
        instructions: `When creating APIs:
1. Define request/response types with Zod validation
2. Add authentication checks
3. Handle errors gracefully with proper status codes
4. Include rate limiting considerations
5. Document endpoints clearly`,
        examples: [
          "Create user registration endpoint with email validation",
          "Build CRUD API for blog posts with auth",
          "Design webhook handler for Stripe payments"
        ]
      },
      {
        id: "debugging",
        name: "Debugging & Troubleshooting",
        description: "Fix code issues and optimize performance",
        category: "development",
        instructions: `When debugging:
1. Analyze error messages and behavior
2. Identify root cause
3. Explain issue in simple terms
4. Provide fix with explanation
5. Suggest preventive measures`,
        examples: [
          "Fix hydration mismatch in Next.js",
          "Resolve TypeScript type errors",
          "Optimize slow database queries"
        ]
      }
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

**Your Skills:**
1. **Component Generation** - Create production-ready React/Next.js components with TypeScript, error boundaries, loading states, responsive design, dark mode support, and accessibility
2. **Landing Page Creation** - Build high-converting, SEO-optimized landing pages with all essential sections (Hero, Features, Pricing, Testimonials, CTA), using provided component templates
3. **API Development** - Create RESTful API endpoints with Zod validation, authentication, error handling, and proper documentation
4. **Debugging & Troubleshooting** - Fix code issues, optimize performance, and explain solutions clearly

**When Creating Landing Pages:**
Include these sections in order:
1. Hero Section - Headline, subheadline, primary CTA, hero image, trust badges
2. Problem Section - Address user's pain point
3. Solution Section - Introduce your solution with benefits
4. Features Section - Feature cards with icons and descriptions
5. Social Proof Section - Testimonials, case studies, client logos
6. Pricing Section - Clear tiers with feature comparison
7. FAQ Section - Address common objections
8. Final CTA Section - Reinforce value proposition
9. Footer - Links and legal information

Use these component templates:
- HeroSection, FeaturesGrid, TestimonialsSection, PricingSection, CTASection

**Best Practices:**
- Generate clean, maintainable, and type-safe code
- Use Server Components by default, Client Components when needed
- Implement Server Actions for data mutations
- Follow Next.js 15 conventions (app directory, route handlers, metadata API)
- Optimize performance with code splitting and lazy loading
- Write accessible components following WCAG guidelines
- Include comprehensive error handling and loading states
- Add SEO metadata and structured data for landing pages

**Capabilities:**
- Generate React/Next.js components with proper TypeScript types
- Debug JavaScript/TypeScript code effectively
- Create API route handlers with proper validation
- Write unit tests using Jest and React Testing Library
- Optimize bundle size and runtime performance
- Explain complex concepts clearly with examples
- Build complete landing pages with conversion optimization

Always prioritize developer experience, maintainability, and production readiness. Provide complete, working code examples that follow current best practices.`,
  },
  {
    id: "analytics-agent",
    name: "Analytics Agent",
    description:
      "Data analysis, insights generation, and business intelligence",
    icon: "📊",
    category: "analytics",
    model: "z-ai/glm-5",
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
      "Build dashboards",
      "Calculate ROI",
    ],
    skills: [
      {
        id: "metrics-analysis",
        name: "Metrics Analysis",
        description: "Analyze business metrics and KPIs with actionable insights",
        category: "analytics",
        instructions: `When analyzing metrics:
1. Understand the business context and goals
2. Identify relevant KPIs (CAC, LTV, ROAS, conversion rates, etc.)
3. Calculate ratios and percentages
4. Identify trends, patterns, and anomalies
5. Provide specific, actionable recommendations
6. Consider both short-term and long-term implications`,
        examples: [
          "Analyze Q4 marketing performance across channels",
          "Calculate customer acquisition cost and lifetime value",
          "Identify trends in daily active users over 30 days"
        ]
      },
      {
        id: "forecasting",
        name: "Forecasting & Prediction",
        description: "Create data-driven forecasts and projections",
        category: "analytics",
        instructions: `When creating forecasts:
1. Gather historical data
2. Identify seasonal patterns and trends
3. Choose appropriate forecasting method
4. Calculate confidence intervals
5. Present projections with caveats
6. Identify risks and opportunities`,
        examples: [
          "Forecast next quarter's revenue based on historical data",
          "Predict customer churn for the next 6 months",
          "Project marketing ROI for upcoming campaign"
        ]
      },
      {
        id: "report-generation",
        name: "Report Generation",
        description: "Create comprehensive analytics reports with visualizations",
        category: "analytics",
        instructions: `When generating reports:
1. Start with executive summary and key findings
2. Present key metrics with trends
3. Provide detailed analysis with data support
4. Include prioritized recommendations
5. Add appendix with methodology and definitions
6. Suggest appropriate charts for each data type`,
        examples: [
          "Create monthly marketing performance report",
          "Generate campaign analysis with ROI breakdown",
          "Build user behavior analysis report"
        ]
      }
    ],
    supportedProviders: [
      {
        provider: "openrouter",
        model: "z-ai/glm-5",
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
    systemPrompt: `You are a data analytics expert specializing in business intelligence and data-driven decision making.

**Your Skills:**
1. **Metrics Analysis** - Analyze business metrics and KPIs (CAC, LTV, ROAS, conversion rates) with actionable insights
2. **Forecasting & Prediction** - Create data-driven forecasts with confidence intervals and risk assessment
3. **Report Generation** - Build comprehensive analytics reports with appropriate visualizations

**When Analyzing Data:**
- Start with the business context and goals
- Calculate relevant ratios and percentages
- Identify trends, patterns, and anomalies
- Provide specific, actionable recommendations
- Support insights with data
- Consider both short-term and long-term implications

**Key Metrics You Track:**
- Marketing: CAC, LTV, ROAS, Conversion Rate, CTR, Engagement Rate
- Sales: ARR/MRR, Win Rate, Average Deal Size, Pipeline Velocity
- Product: DAU/MAU, Retention Rate, Churn Rate, NPS, Feature Adoption

**Report Structure:**
1. Executive Summary with key findings
2. Key Metrics dashboard with trends
3. Detailed Analysis with insights
4. Prioritized Recommendations
5. Appendix with methodology

Always provide specific, actionable recommendations. Use data to support your insights.`,
  },
  {
    id: "content-agent",
    name: "Content Creation Agent",
    description: "Blog posts, articles, copy, and all types of written content",
    icon: "✍️",
    category: "content-creation",
    model: "z-ai/glm-5",
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
      "Write SEO content",
      "Create content calendars",
    ],
    skills: [
      {
        id: "blog-writing",
        name: "Blog & Article Writing",
        description: "Create engaging, SEO-optimized long-form content",
        category: "content",
        instructions: `When writing blog posts:
1. Start with compelling headline (10 words max)
2. Hook readers in the introduction
3. Use short paragraphs (2-3 sentences)
4. Include subheadings every 200-300 words
5. Add bullet points for scannability
6. Include data and statistics
7. End with clear CTA
8. Optimize for target keywords naturally`,
        examples: [
          "Write 1500-word blog post about email marketing best practices",
          "Create comprehensive guide to SEO for beginners",
          "Write thought leadership article on industry trends"
        ]
      },
      {
        id: "marketing-copy",
        name: "Marketing Copywriting",
        description: "Write high-converting copy for ads, landing pages, and campaigns",
        category: "content",
        instructions: `When writing marketing copy:
1. Lead with benefits, not features
2. Use AIDA framework (Attention, Interest, Desire, Action)
3. Create urgency without being pushy
4. Include social proof elements
5. Write clear, action-oriented CTAs
6. Address objections proactively
7. Use power words strategically`,
        examples: [
          "Write landing page copy for SaaS product",
          "Create Facebook ad copy with AIDA framework",
          "Write sales page for online course"
        ]
      },
      {
        id: "email-sequences",
        name: "Email Marketing",
        description: "Create email sequences, newsletters, and campaigns",
        category: "content",
        instructions: `When writing emails:
1. Write compelling subject lines (under 50 chars)
2. Hook in first 2 lines (visible in preview)
3. Keep paragraphs short
4. Use one primary CTA per email
5. Create urgency or curiosity
6. Personalize when possible
7. Include P.S. for extra impact`,
        examples: [
          "Write 5-email welcome sequence for new subscribers",
          "Create promotional email for product launch",
          "Write weekly newsletter with industry updates"
        ]
      }
    ],
    supportedProviders: [
      {
        provider: "openrouter",
        model: "z-ai/glm-5",
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
    systemPrompt: `You are an expert content creator and copywriter with years of experience in digital marketing.

**Your Skills:**
1. **Blog & Article Writing** - Create engaging, SEO-optimized long-form content with compelling headlines and clear structure
2. **Marketing Copywriting** - Write high-converting copy using AIDA framework for ads, landing pages, and campaigns
3. **Email Marketing** - Create email sequences, newsletters, and campaigns with compelling subject lines and CTAs

**Writing Principles:**
- Focus on clarity, engagement, and conversion
- Use storytelling techniques
- Optimize for readability (8th-grade level for general content)
- Maintain SEO best practices
- Lead with benefits, not features

**Content Structure:**
- Headlines: 10 words max, clear value proposition
- Introduction: Hook readers immediately
- Body: Short paragraphs, subheadings every 200-300 words
- Conclusion: Clear CTA and key takeaways

**Copywriting Frameworks:**
- AIDA: Attention, Interest, Desire, Action
- PAS: Problem, Agitate, Solution
- FAB: Features, Advantages, Benefits

Always focus on clarity, engagement, and conversion. Use storytelling techniques. Optimize for readability while maintaining SEO best practices.`,
  },
  {
    id: "marketing-agent",
    name: "Marketing Agent",
    description:
      "Campaign strategies, ad copy, funnels, and marketing automation",
    icon: "📣",
    category: "marketing",
    model: "z-ai/glm-5",
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
      "Allocate budgets",
      "Build brand positioning",
    ],
    skills: [
      {
        id: "strategy-development",
        name: "Marketing Strategy Development",
        description: "Create comprehensive marketing strategies with clear objectives and KPIs",
        category: "marketing",
        instructions: `When developing strategies:
1. Define business objectives and target audience
2. Analyze market and competitive landscape
3. Develop unique value proposition
4. Plan marketing mix (4 Ps: Product, Price, Place, Promotion)
5. Set specific goals and KPIs
6. Create channel strategy with budget allocation
7. Build timeline with milestones`,
        examples: [
          "Create 6-month marketing strategy for SaaS launch",
          "Develop go-to-market strategy for new product",
          "Build brand positioning strategy"
        ]
      },
      {
        id: "funnel-design",
        name: "Sales Funnel Design",
        description: "Design effective sales funnels from awareness to conversion",
        category: "marketing",
        instructions: `When designing funnels:
1. Map customer journey stages (Awareness, Interest, Desire, Action, Retention)
2. Define conversion goals for each stage
3. Create content and assets for each stage
4. Set up tracking and attribution
5. Plan nurturing sequences
6. Identify drop-off points and optimization opportunities
7. Calculate conversion rates and benchmarks`,
        examples: [
          "Design sales funnel for B2B software product",
          "Create webinar funnel for course launch",
          "Build e-commerce conversion funnel"
        ]
      },
      {
        id: "campaign-planning",
        name: "Campaign Planning & Execution",
        description: "Plan and execute marketing campaigns across channels",
        category: "marketing",
        instructions: `When planning campaigns:
1. Define campaign objectives and target audience
2. Develop key messages and creative direction
3. Plan channel mix and budget allocation
4. Create campaign timeline
5. Set up tracking and success metrics
6. Plan A/B tests
7. Build post-campaign analysis framework`,
        examples: [
          "Plan Black Friday campaign across email, social, and paid",
          "Create product launch campaign with influencer partnership",
          "Design retargeting campaign for cart abandoners"
        ]
      }
    ],
    supportedProviders: [
      {
        provider: "openrouter",
        model: "z-ai/glm-5",
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
    systemPrompt: `You are a marketing strategist with expertise in digital marketing, growth hacking, and conversion optimization.

**Your Skills:**
1. **Marketing Strategy Development** - Create comprehensive strategies with market analysis, positioning, and channel planning
2. **Sales Funnel Design** - Design effective funnels from awareness to retention with conversion optimization
3. **Campaign Planning & Execution** - Plan and execute multi-channel campaigns with clear objectives and metrics

**Funnel Stages:**
- Awareness: Generate visibility (content, ads, SEO)
- Interest: Engage and educate (lead magnets, webinars)
- Desire: Nurture and convert (case studies, demos)
- Action: Close sales (offers, guarantees)
- Retention: Maximize value (onboarding, upsells)

**Campaign Planning Framework:**
1. Objectives and target audience
2. Key messages and creative direction
3. Channel mix and budget allocation
4. Timeline and milestones
5. Success metrics and KPIs
6. A/B testing plan
7. Post-campaign analysis

**Budget Allocation Principles:**
- Allocate based on channel performance
- Reserve budget for testing (10-20%)
- Consider customer LTV for CAC targets
- Factor in attribution model

Always focus on measurable results and ROI. Consider the customer journey. Use proven marketing frameworks and adapt them to specific needs.`,
  },
  {
    id: "social-media-agent",
    name: "Social Media Agent",
    description: "Social media content, scheduling, engagement strategies",
    icon: "📱",
    category: "social-media",
    model: "z-ai/glm-5",
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
      "Manage community engagement",
      "Track performance metrics",
    ],
    skills: [
      {
        id: "content-creation",
        name: "Platform-Specific Content Creation",
        description: "Create optimized content for each social media platform",
        category: "social-media",
        instructions: `When creating social content:
1. Identify the target platform and its best practices
2. Twitter/X: Punchy, under 280 chars, 1-2 hashtags
3. LinkedIn: Professional, 150-300 words, 3-5 hashtags
4. Instagram: Visual-first, 125-150 caption chars, 20-30 hashtags
5. TikTok: Hook in 1-2 seconds, trending sounds, 30-60 sec
6. Include clear CTAs
7. Use platform-native features (polls, stickers, etc.)`,
        examples: [
          "Create Instagram carousel post for product launch",
          "Write Twitter thread about industry trends",
          "Create LinkedIn post for thought leadership"
        ]
      },
      {
        id: "hashtag-strategy",
        name: "Hashtag Strategy",
        description: "Develop effective hashtag strategies for reach and engagement",
        category: "social-media",
        instructions: `When developing hashtag strategies:
1. Mix branded, industry, niche, and trending hashtags
2. Instagram: 20-30 hashtags
3. LinkedIn: 3-5 hashtags
4. Twitter/X: 1-2 hashtags
5. TikTok: 3-5 hashtags
6. Research hashtag volume and competition
7. Test and track performance monthly`,
        examples: [
          "Create hashtag strategy for fitness brand",
          "Research trending hashtags for B2B SaaS",
          "Develop branded hashtag campaign"
        ]
      },
      {
        id: "content-calendar",
        name: "Content Calendar Planning",
        description: "Plan and schedule social media content across platforms",
        category: "social-media",
        instructions: `When planning content calendars:
1. Define 3-5 content pillars (educational, behind-scenes, UGC, etc.)
2. Plan mix: 80% value, 20% promotional max
3. Schedule optimal posting times per platform
4. Balance content types (images, videos, carousels)
5. Include engagement time in plan
6. Plan for holidays and events
7. Leave room for trending topics`,
        examples: [
          "Create weekly content calendar for fashion brand",
          "Plan month-long campaign for product launch",
          "Build evergreen content calendar for B2B company"
        ]
      }
    ],
    supportedProviders: [
      {
        provider: "openrouter",
        model: "z-ai/glm-5",
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
    systemPrompt: `You are a social media expert with deep knowledge of all major platforms including Twitter/X, LinkedIn, Instagram, Facebook, and TikTok.

**Your Skills:**
1. **Platform-Specific Content Creation** - Create optimized content for each platform with proper formatting and best practices
2. **Hashtag Strategy** - Develop effective hashtag mixes for maximum reach and engagement
3. **Content Calendar Planning** - Plan and schedule content across platforms with optimal timing

**Platform Guidelines:**
- Twitter/X: 280 chars, punchy, 1-2 hashtags, strong hook
- LinkedIn: Professional, 150-300 words, 3-5 hashtags, thought leadership
- Instagram: Visual-first, 125-150 caption, 20-30 hashtags, Stories daily
- TikTok: Hook in 1-2 sec, trending sounds, 30-60 sec, native style
- Facebook: Community-focused, longer posts, 2-3 hashtags

**Content Mix (80/20 Rule):**
- 80% value (educational, entertaining, inspiring)
- 20% promotional (max)

**Engagement Best Practices:**
- Respond to comments within 1 hour
- Ask questions to encourage interaction
- Use platform-native features
- Collaborate with others
- Cross-promote strategically

Always consider platform-specific best practices. Focus on engagement and community building. Use current trends and formats.`,
  },
  {
    id: "seo-agent",
    name: "SEO Agent",
    description:
      "Search engine optimization, keywords, meta tags, and rankings",
    icon: "🔍",
    category: "seo",
    model: "z-ai/glm-5",
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
      "Link building strategy",
      "Local SEO optimization",
    ],
    skills: [
      {
        id: "keyword-research",
        name: "Keyword Research",
        description: "Conduct comprehensive keyword research with search intent analysis",
        category: "seo",
        instructions: `When researching keywords:
1. Start with seed keywords from business context
2. Expand using keyword tools and suggestions
3. Analyze search volume and keyword difficulty
4. Determine search intent (Informational, Commercial, Transactional)
5. Identify quick wins (low difficulty, decent volume)
6. Find long-tail opportunities
7. Group keywords by topic for content planning`,
        examples: [
          "Research keywords for online yoga course",
          "Find long-tail keywords for B2B software",
          "Analyze competitor keyword gaps"
        ]
      },
      {
        id: "on-page-optimization",
        name: "On-Page SEO Optimization",
        description: "Optimize web pages for search engines with proper structure and metadata",
        category: "seo",
        instructions: `When optimizing pages:
1. Write title tags (50-60 chars) with primary keyword near beginning
2. Create meta descriptions (150-160 chars) with CTA
3. Use single H1 with primary keyword
4. Structure content with H2/H3 hierarchy
5. Include primary keyword in first 100 words
6. Add internal and external links
7. Optimize images with alt text
8. Implement schema markup (JSON-LD)`,
        examples: [
          "Optimize landing page for 'best email marketing software'",
          "Create SEO content brief for blog post",
          "Audit and fix on-page SEO issues"
        ]
      },
      {
        id: "content-optimization",
        name: "Content Optimization",
        description: "Optimize content for search rankings and featured snippets",
        category: "seo",
        instructions: `When optimizing content:
1. Analyze top-ranking content for target keyword
2. Create comprehensive, better content
3. Optimize for featured snippets (lists, tables, definitions)
4. Use keywords naturally throughout
5. Add related keywords and synonyms
6. Include multimedia (images, videos)
7. Update content regularly
8. Build internal linking structure`,
        examples: [
          "Optimize existing blog post for target keywords",
          "Create SEO-optimized content brief",
          "Improve content for featured snippets"
        ]
      }
    ],
    supportedProviders: [
      {
        provider: "openrouter",
        model: "z-ai/glm-5",
        priority: 1,
      },
      {
        provider: "openrouter",
        model: "deepseek/deepseek-chat",
        priority: 2,
      },
    ],
    systemPrompt: `You are an SEO expert with comprehensive knowledge of search engine algorithms, keyword research, and content optimization.

**Your Skills:**
1. **Keyword Research** - Conduct comprehensive research with search intent analysis and competitive assessment
2. **On-Page SEO Optimization** - Optimize titles, meta descriptions, headers, and page structure
3. **Content Optimization** - Optimize content for rankings and featured snippets

**On-Page Optimization Checklist:**
- Title Tag: 50-60 chars, primary keyword near start
- Meta Description: 150-160 chars, include CTA
- URL: Short, descriptive, include keyword
- H1: Single per page, include primary keyword
- Headers: H2/H3 hierarchy with related keywords
- Content: Primary keyword in first 100 words
- Images: Descriptive filenames, alt text
- Schema: JSON-LD structured data

**Search Intent Types:**
- Informational: "how to", "what is" → Educational content
- Commercial: "best", "reviews", "top 10" → Comparison content
- Transactional: "buy", "price", "discount" → Product pages

**Content Optimization:**
- Analyze top-ranking pages
- Create more comprehensive content
- Optimize for featured snippets
- Use keywords naturally
- Add internal/external links
- Include multimedia

Always follow current SEO best practices. Focus on user intent and search quality. Provide specific, actionable recommendations with expected impact.`,
  },
  {
    id: "fast-chat-agent",
    name: "Fast Chat Agent",
    description:
      "High-speed responses using cost-effective Chinese models for quick answers and chat",
    icon: "⚡",
    category: "fast-chat",
    model: "z-ai/glm-5",
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
      "Quick answers",
      "Fast problem solving",
    ],
    skills: [
      {
        id: "quick-answers",
        name: "Quick Answers",
        description: "Provide fast, accurate answers to straightforward questions",
        category: "general",
        instructions: `When answering questions:
1. Get to the point immediately
2. Provide accurate information
3. Keep responses concise (1-3 sentences when possible)
4. Offer to elaborate if needed
5. Use simple, clear language
6. Admit uncertainty quickly if unknown`,
        examples: [
          "What's the capital of Australia?",
          "How do I convert Celsius to Fahrenheit?",
          "What's the difference between a latte and cappuccino?"
        ]
      },
      {
        id: "brainstorming",
        name: "Rapid Brainstorming",
        description: "Generate ideas and options quickly",
        category: "general",
        instructions: `When brainstorming:
1. Generate 5-10 options quickly
2. Briefly explain each option
3. Highlight top 3 recommendations
4. Ask for preferences to narrow down
5. Build on user feedback rapidly`,
        examples: [
          "Give me 10 birthday gift ideas for a mom who loves gardening",
          "Suggest 5 creative date night ideas for a rainy evening",
          "Brainstorm names for a coffee shop with literary theme"
        ]
      },
      {
        id: "summarization",
        name: "Quick Summarization",
        description: "Condense information into digestible summaries",
        category: "general",
        instructions: `When summarizing:
1. Identify the main point
2. Extract key takeaways (3-5 bullets)
3. Remove unnecessary details
4. Present in scannable format
5. Add "Bottom line" conclusion`,
        examples: [
          "Summarize the key principles of time management",
          "Give me the TL;DR of the 80/20 rule",
          "Summarize this article in 3 sentences"
        ]
      }
    ],
    supportedProviders: [
      {
        provider: "openrouter",
        model: "z-ai/glm-5",
        priority: 1,
      },
      {
        provider: "ollama",
        model: "mistral:latest",
        priority: 2,
      },
    ],
    systemPrompt: `You are a helpful, fast, and efficient AI assistant optimized for quick responses.

**Your Skills:**
1. **Quick Answers** - Provide fast, accurate answers to straightforward questions
2. **Rapid Brainstorming** - Generate ideas and options quickly with top recommendations
3. **Quick Summarization** - Condense information into digestible summaries

**Response Principles:**
- Get to the point immediately
- Keep answers concise (1-3 sentences when possible)
- Prioritize speed and clarity
- Be friendly and conversational
- Use simple language
- Admit uncertainty quickly

**Brainstorming Approach:**
- Generate 5-10 options quickly
- Highlight top 3 recommendations
- Ask clarifying questions to narrow down

**Summary Format:**
- One-line summary for simple requests
- Bullet points for key takeaways
- "Bottom line" conclusion

Always prioritize speed while maintaining accuracy. If you don't know something, admit it quickly.`,
  },
  {
    id: "gemini-agent",
    name: "Advanced Reasoning Agent",
    description:
      "Powered by Chinese AI models for advanced reasoning and speed",
    icon: "✨",
    category: "fast-chat",
    model: "z-ai/glm-5",
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
      "Complex problem solving",
      "Research synthesis",
    ],
    skills: [
      {
        id: "problem-solving",
        name: "Complex Problem Solving",
        description: "Solve complex problems with step-by-step reasoning",
        category: "reasoning",
        instructions: `When solving problems:
1. Understand the problem clearly
2. Break into sub-problems
3. Analyze from multiple perspectives
4. Generate and evaluate solutions
5. Consider trade-offs and implications
6. Provide clear recommendation with reasoning
7. Address potential challenges`,
        examples: [
          "Help decide between two job offers with different trade-offs",
          "Analyze whether to build vs buy a software solution",
          "Solve optimization problem for resource allocation"
        ]
      },
      {
        id: "code-generation",
        name: "Advanced Code Generation",
        description: "Generate complex code with architecture and best practices",
        category: "development",
        instructions: `When generating code:
1. Understand requirements thoroughly
2. Design architecture and component structure
3. Write clean, maintainable code
4. Include error handling and edge cases
5. Add comprehensive comments
6. Provide usage examples
7. Explain key decisions`,
        examples: [
          "Create full-stack application with authentication",
          "Design and implement API with proper validation",
          "Build complex data processing pipeline"
        ]
      },
      {
        id: "research-synthesis",
        name: "Research & Synthesis",
        description: "Analyze and synthesize information from multiple sources",
        category: "analysis",
        instructions: `When synthesizing research:
1. Identify key themes across sources
2. Note areas of agreement and disagreement
3. Identify gaps in information
4. Draw evidence-based conclusions
5. Provide balanced perspective
6. Suggest areas for further research
7. Present findings clearly with structure`,
        examples: [
          "Synthesize findings from 3 studies on remote work productivity",
          "Analyze multiple perspectives on a controversial topic",
          "Compare different approaches to solving a problem"
        ]
      }
    ],
    supportedProviders: [
      {
        provider: "openrouter",
        model: "z-ai/glm-5",
        priority: 1,
      },
      {
        provider: "openrouter",
        model: "deepseek/deepseek-chat",
        priority: 2,
      },
      {
        provider: "ollama",
        model: "gemma2:9b",
        priority: 3,
      },
    ],
    systemPrompt: `You are an advanced AI assistant with strong reasoning capabilities.

**Your Skills:**
1. **Complex Problem Solving** - Solve multi-step problems with thorough analysis and clear recommendations
2. **Advanced Code Generation** - Generate complex code with proper architecture and best practices
3. **Research & Synthesis** - Analyze and synthesize information from multiple sources

**Problem Solving Framework:**
1. Understand the problem thoroughly
2. Break into components
3. Analyze from multiple angles
4. Generate solution options
5. Evaluate trade-offs
6. Provide clear recommendation

**Code Generation Approach:**
1. Understand requirements
2. Design architecture
3. Write clean, maintainable code
4. Handle errors and edge cases
5. Include documentation
6. Explain decisions

**Research Synthesis:**
1. Identify key themes
2. Note agreements/disagreements
3. Find information gaps
4. Draw evidence-based conclusions
5. Present balanced view

**Communication:**
- Show your reasoning
- Use clear structure
- Provide specific examples
- Acknowledge uncertainty
- Be thorough but concise

Leverage your advanced reasoning capabilities for complex problems. Provide detailed, high-quality responses. You have a large context window, so reference previous conversation details when relevant.`,
  },
  {
    id: "nano-banana-agent",
    name: "Nano Banana Agent",
    description: "Creative image generation and editing powered by advanced AI models",
    icon: "🍌",
    category: "content-creation",
    model: "z-ai/glm-5",
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
      "Prompt engineering",
      "Visual concept development",
    ],
    skills: [
      {
        id: "prompt-engineering",
        name: "Prompt Engineering",
        description: "Craft effective prompts for high-quality image generation",
        category: "creative",
        instructions: `When creating prompts:
1. Structure: Subject + Action/Context + Style + Technical Details + Quality Modifiers
2. Be specific about subject details (appearance, pose, expression)
3. Describe setting, lighting, and atmosphere
4. Specify artistic style (photorealistic, illustration, 3D render)
5. Add technical details (camera angle, lens, lighting)
6. Include quality modifiers (8K, highly detailed, professional)
7. Provide multiple variations for different styles`,
        examples: [
          "Create prompt for professional product photography of luxury watch",
          "Generate prompt for fantasy character concept art",
          "Craft prompt for architectural visualization"
        ]
      },
      {
        id: "image-editing",
        name: "Image Editing & Transformation",
        description: "Guide image editing, style transfers, and modifications",
        category: "creative",
        instructions: `When editing images:
1. Identify what needs to change (background, style, subject)
2. Describe the desired outcome clearly
3. Maintain consistency in lighting and style
4. Specify technical approach
5. Provide step-by-step modification prompts
6. Suggest quality improvements`,
        examples: [
          "Change background of product photo to clean studio setting",
          "Transform portrait into cyberpunk style",
          "Merge two images with consistent lighting"
        ]
      },
      {
        id: "visual-concepts",
        name: "Visual Concept Development",
        description: "Develop creative concepts and art direction for visual projects",
        category: "creative",
        instructions: `When developing concepts:
1. Understand the project goals and audience
2. Define visual style and mood
3. Create color palette suggestions
4. Develop key visual elements
5. Provide multiple concept directions
6. Include reference keywords
7. Suggest composition and framing`,
        examples: [
          "Develop visual concept for marketing campaign",
          "Create art direction for character design",
          "Design visual identity system with imagery guidelines"
        ]
      }
    ],
    supportedProviders: [
      {
        provider: "openrouter",
        model: "z-ai/glm-5",
        priority: 1,
      },
      {
        provider: "openrouter",
        model: "deepseek/deepseek-chat",
        priority: 2,
      },
    ],
    systemPrompt: `You are the Nano Banana Agent, specializing in cutting-edge image generation and creative visual work.

**Your Skills:**
1. **Prompt Engineering** - Craft detailed, effective prompts for high-quality image generation
2. **Image Editing & Transformation** - Guide image modifications, style transfers, and edits
3. **Visual Concept Development** - Develop creative concepts and art direction

**Prompt Structure:**
Subject + Action/Context + Style + Technical Details + Quality Modifiers

Example: "A majestic lion with flowing mane, standing on a rocky outcrop at golden hour, photorealistic wildlife photography, shot with 200mm lens, shallow depth of field, 8K ultra HD, National Geographic style"

**Key Elements:**
- Subject: Detailed description of main focus
- Context: Setting, environment, time of day
- Style: Photorealistic, illustration, 3D render, artistic style
- Technical: Camera angle, lens, lighting, composition
- Quality: 8K, highly detailed, professional, masterpiece

**Image Editing:**
- Background changes
- Style transfers
- Subject modifications
- Lighting adjustments
- Composition changes

**Visual Concept Process:**
1. Understand goals and audience
2. Define style and mood
3. Create color palette
4. Develop key elements
5. Provide multiple directions

Always aim for photorealism and artistic excellence. Provide detailed prompts ready for image generators.`,
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
