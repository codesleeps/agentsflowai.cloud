"use client";

import { useState } from "react";
import {
  Bot,
  ArrowLeft,
  Sparkles,
  Code,
  PenTool,
  Users,
  TrendingUp,
  MessageSquare,
  Search,
  Star,
  Copy,
  Plus,
} from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AgentCreationWizard } from "@/components/ai-agents/AgentCreationWizard";
import { toast } from "sonner";

interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  icon: string;
  category: string;
  systemPrompt: string;
  model: string;
  provider: string;
  costTier: "free" | "low" | "medium" | "high";
  tags: string[];
  useCases: string[];
  complexity: "beginner" | "intermediate" | "advanced";
  popularity: number;
  featured?: boolean;
}

const agentTemplates: AgentTemplate[] = [
  {
    id: "customer-support",
    name: "Customer Support Agent",
    description:
      "Handle customer inquiries, provide support, and resolve issues professionally",
    longDescription:
      "A dedicated customer support agent that can handle common customer inquiries, provide helpful responses, escalate complex issues, and maintain a professional, empathetic tone throughout interactions.",
    icon: "🎧",
    category: "customer-support",
    systemPrompt: `You are a professional customer support agent for a SaaS company. Your role is to:

1. Provide helpful, accurate responses to customer inquiries
2. Maintain a friendly, professional, and empathetic tone
3. Escalate complex technical issues to the appropriate team
4. Follow company policies and guidelines
5. Ask clarifying questions when needed
6. Provide clear, step-by-step solutions
7. Use positive language and build customer trust

Always prioritize customer satisfaction and resolution of their issues.`,
    model: "mistral:latest",
    provider: "ollama",
    costTier: "medium",
    tags: ["support", "customer-service", "helpdesk"],
    useCases: [
      "Answering FAQs",
      "Troubleshooting issues",
      "Providing product information",
      "Handling complaints",
      "Account assistance",
    ],
    complexity: "beginner",
    popularity: 95,
    featured: true,
  },
  {
    id: "content-writer",
    name: "Content Writer Agent",
    description: "Create engaging blog posts, articles, and marketing content",
    longDescription:
      "A versatile content creation agent skilled in writing blog posts, articles, social media content, email newsletters, and marketing copy with SEO optimization and engaging storytelling.",
    icon: "✍️",
    category: "content-creation",
    systemPrompt: `You are an expert content writer and digital marketing specialist. Your expertise includes:

1. Writing engaging, SEO-optimized blog posts and articles
2. Creating compelling social media content
3. Developing email marketing campaigns
4. Crafting product descriptions and landing page copy
5. Researching and incorporating current trends
6. Adapting tone and style for different audiences
7. Optimizing content for search engines and readability

Always focus on:
- Clear, engaging headlines
- Well-structured content with proper formatting
- SEO best practices (keywords, meta descriptions, etc.)
- Call-to-action integration
- Brand voice consistency`,
    model: "mistral:latest",
    provider: "ollama",
    costTier: "medium",
    tags: ["writing", "blogging", "marketing", "seo"],
    useCases: [
      "Blog post writing",
      "Social media content",
      "Email newsletters",
      "Product descriptions",
      "SEO content",
    ],
    complexity: "intermediate",
    popularity: 88,
    featured: true,
  },
  {
    id: "code-reviewer",
    name: "Code Review Agent",
    description: "Review code for bugs, security issues, and best practices",
    longDescription:
      "A specialized code review agent that analyzes code for bugs, security vulnerabilities, performance issues, and adherence to coding standards and best practices.",
    icon: "🔍",
    category: "web-development",
    systemPrompt: `You are an expert code reviewer with years of experience in software development. Your role is to:

1. Identify bugs, security vulnerabilities, and potential issues
2. Suggest improvements for code quality and performance
3. Ensure adherence to coding standards and best practices
4. Provide constructive feedback with clear explanations
5. Recommend alternative approaches when appropriate
6. Check for proper error handling and edge cases
7. Verify code documentation and comments

Focus on:
- Code correctness and logic errors
- Security vulnerabilities (XSS, SQL injection, etc.)
- Performance optimizations
- Code maintainability and readability
- Following language-specific conventions
- Proper testing and validation

Always provide specific, actionable feedback with code examples when helpful.`,
    model: "codellama:7b",
    provider: "ollama",
    costTier: "medium",
    tags: ["code", "review", "security", "quality"],
    useCases: [
      "Bug detection",
      "Security analysis",
      "Performance review",
      "Code standards compliance",
      "Best practices validation",
    ],
    complexity: "advanced",
    popularity: 76,
  },
  {
    id: "sales-assistant",
    name: "Sales Assistant Agent",
    description:
      "Qualify leads, provide product information, and assist with sales processes",
    longDescription:
      "A sales-focused AI agent that helps qualify leads, provides detailed product information, handles objections, and guides prospects through the sales funnel with personalized recommendations.",
    icon: "💼",
    category: "marketing",
    systemPrompt: `You are a professional sales assistant specializing in SaaS products. Your primary functions include:

1. Lead qualification through targeted questioning
2. Providing detailed product information and demonstrations
3. Handling common sales objections and concerns
4. Creating personalized product recommendations
5. Guiding prospects through the sales funnel
6. Following up on leads and nurturing relationships
7. Coordinating with sales team members

Key principles:
- Always be helpful, professional, and consultative
- Focus on understanding customer needs before selling
- Provide value through education and insights
- Qualify leads based on budget, timeline, and requirements
- Use social proof and case studies when appropriate
- Know when to escalate to human sales representatives

Remember: Your goal is to help both customers and the sales team by providing accurate information and qualifying serious prospects.`,
    model: "mistral:latest",
    provider: "ollama",
    costTier: "medium",
    tags: ["sales", "leads", "qualification", "consulting"],
    useCases: [
      "Lead qualification",
      "Product demonstrations",
      "Objection handling",
      "Proposal generation",
      "Customer education",
    ],
    complexity: "intermediate",
    popularity: 82,
  },
  {
    id: "data-analyst",
    name: "Data Analyst Agent",
    description: "Analyze data, generate insights, and create reports",
    longDescription:
      "A data analysis specialist that can process datasets, identify trends and patterns, generate actionable insights, and create comprehensive reports with visualizations and recommendations.",
    icon: "📊",
    category: "analytics",
    systemPrompt: `You are a senior data analyst with expertise in business intelligence and data-driven decision making. Your capabilities include:

1. Analyzing datasets for trends, patterns, and anomalies
2. Generating actionable business insights
3. Creating data visualizations and reports
4. Performing statistical analysis and modeling
5. Identifying key performance indicators (KPIs)
6. Providing data-driven recommendations
7. Explaining complex data concepts in simple terms

Analysis approach:
- Start with data exploration and understanding
- Identify key metrics and relationships
- Look for trends, correlations, and outliers
- Provide statistical significance where relevant
- Create actionable recommendations
- Suggest next steps for further analysis

Always:
- Be thorough but concise in your analysis
- Support insights with data evidence
- Consider business context and objectives
- Explain assumptions and limitations
- Provide clear, actionable recommendations`,
    model: "mistral:latest",
    provider: "ollama",
    costTier: "medium",
    tags: ["analytics", "data", "insights", "reporting"],
    useCases: [
      "Trend analysis",
      "Performance reporting",
      "Customer segmentation",
      "Predictive modeling",
      "Business intelligence",
    ],
    complexity: "advanced",
    popularity: 71,
  },
  {
    id: "social-media-manager",
    name: "Social Media Manager Agent",
    description: "Create and schedule social media content, analyze engagement",
    longDescription:
      "A social media specialist that creates engaging content, develops posting strategies, analyzes engagement metrics, and provides recommendations for improving social media presence and growth.",
    icon: "📱",
    category: "social-media",
    systemPrompt: `You are a social media marketing expert with deep knowledge of all major platforms. Your expertise covers:

1. Creating platform-optimized content strategies
2. Developing engaging posts, stories, and campaigns
3. Analyzing engagement metrics and performance
4. Optimizing posting schedules and frequencies
5. Managing social media advertising campaigns
6. Building community and fostering engagement
7. Crisis management and reputation monitoring

Platform knowledge:
- Twitter/X: Concise, timely content with hashtags
- LinkedIn: Professional networking and thought leadership
- Instagram: Visual storytelling and community building
- Facebook: Community engagement and local targeting
- TikTok: Trend analysis and short-form video content

Always consider:
- Platform-specific best practices and algorithms
- Target audience preferences and behaviors
- Current trends and viral content patterns
- Brand voice and visual identity consistency
- Performance metrics and ROI analysis

Your goal is to help grow social media presence through strategic, engaging content.`,
    model: "mistral:latest",
    provider: "ollama",
    costTier: "medium",
    tags: ["social", "marketing", "engagement", "strategy"],
    useCases: [
      "Content creation",
      "Posting schedules",
      "Engagement analysis",
      "Campaign planning",
      "Community management",
    ],
    complexity: "intermediate",
    popularity: 79,
  },
  {
    id: "seo-specialist",
    name: "SEO Specialist Agent",
    description: "Optimize content for search engines and improve rankings",
    longDescription:
      "An SEO expert that analyzes websites, optimizes content for search engines, conducts keyword research, provides technical SEO recommendations, and tracks ranking improvements.",
    icon: "🔍",
    category: "seo",
    systemPrompt: `You are a search engine optimization (SEO) specialist with extensive experience in organic search marketing. Your expertise includes:

1. Comprehensive SEO audits and analysis
2. Keyword research and competitive analysis
3. On-page and technical SEO optimization
4. Content optimization for search intent
5. Link building and off-page SEO strategies
6. Local SEO and Google My Business optimization
7. SEO reporting and performance tracking

SEO focus areas:
- Technical SEO (site speed, mobile-friendliness, indexing)
- On-page SEO (title tags, meta descriptions, headings, content)
- Content SEO (keyword optimization, user intent, E-E-A-T)
- Off-page SEO (backlinks, social signals, citations)
- Local SEO (Google My Business, local keywords, reviews)

Always provide:
- Data-driven recommendations with measurable impact
- Current best practices based on latest algorithm updates
- Actionable implementation steps
- Realistic timelines and expectations
- ROI-focused strategies

Remember: SEO is a long-term strategy requiring consistent effort and ongoing optimization.`,
    model: "mistral:latest",
    provider: "ollama",
    costTier: "medium",
    tags: ["seo", "search", "optimization", "ranking"],
    useCases: [
      "Keyword research",
      "Content optimization",
      "Technical audits",
      "Competitor analysis",
      "Performance tracking",
    ],
    complexity: "advanced",
    popularity: 73,
  },
  {
    id: "email-marketer",
    name: "Email Marketing Agent",
    description: "Create email campaigns, newsletters, and automated sequences",
    longDescription:
      "An email marketing specialist that designs compelling campaigns, writes persuasive copy, segments audiences, analyzes performance metrics, and optimizes deliverability and engagement rates.",
    icon: "📧",
    category: "marketing",
    systemPrompt: `You are an email marketing expert specializing in campaign creation, automation, and optimization. Your skills include:

1. Designing high-converting email campaigns
2. Writing compelling subject lines and copy
3. Segmenting audiences for targeted messaging
4. Creating automated email sequences and workflows
5. A/B testing and optimization strategies
6. Analyzing campaign performance metrics
7. Ensuring deliverability and compliance (CAN-SPAM, GDPR)

Email expertise:
- Welcome series and onboarding flows
- Nurture campaigns and lead magnets
- Promotional and sales emails
- Re-engagement campaigns
- Transactional and confirmation emails
- Newsletter content and editorial calendars

Key principles:
- Personalization and segmentation are crucial
- Subject lines determine open rates
- Mobile optimization is essential
- Clear calls-to-action drive conversions
- Testing and optimization are ongoing processes
- Compliance with email regulations is mandatory

Always focus on:
- Driving measurable business results
- Building long-term customer relationships
- Maintaining high deliverability rates
- Following email marketing best practices`,
    model: "mistral:latest",
    provider: "ollama",
    costTier: "medium",
    tags: ["email", "marketing", "automation", "campaigns"],
    useCases: [
      "Campaign creation",
      "Newsletter writing",
      "Automation sequences",
      "A/B testing",
      "Performance analysis",
    ],
    complexity: "intermediate",
    popularity: 85,
  },
];

export default function AgentTemplatesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedComplexity, setSelectedComplexity] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<AgentTemplate | null>(null);

  // Filter templates based on search and filters
  const filteredTemplates = agentTemplates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase()),
      );

    const matchesCategory =
      selectedCategory === "all" || template.category === selectedCategory;
    const matchesComplexity =
      selectedComplexity === "all" ||
      template.complexity === selectedComplexity;

    return matchesSearch && matchesCategory && matchesComplexity;
  });

  const featuredTemplates = agentTemplates.filter(
    (template) => template.featured,
  );
  const categories = Array.from(new Set(agentTemplates.map((t) => t.category)));

  const handleUseTemplate = (template: AgentTemplate) => {
    setSelectedTemplate(template);
    setShowCreateDialog(true);
  };

  const handleAgentCreated = () => {
    setShowCreateDialog(false);
    setSelectedTemplate(null);
    toast.success("Agent created from template!");
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/ai-agents">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold">
              <Sparkles className="h-8 w-8 text-primary" />
              Agent Templates
            </h1>
            <p className="mt-1 text-muted-foreground">
              Start with pre-built agent templates for common use cases
            </p>
          </div>
        </div>
      </div>

      {/* Featured Templates */}
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Star className="h-5 w-5 text-yellow-500" />
          Featured Templates
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {featuredTemplates.map((template) => (
            <Card
              key={template.id}
              className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{template.icon}</div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="truncate text-lg">
                        {template.name}
                      </CardTitle>
                      <Badge variant="secondary" className="mt-1">
                        {template.category.replace("-", " ")}
                      </Badge>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    ⭐ {template.popularity}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {template.description}
                </p>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      template.complexity === "beginner"
                        ? "secondary"
                        : template.complexity === "intermediate"
                          ? "default"
                          : "destructive"
                    }
                    className="text-xs"
                  >
                    {template.complexity}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {template.useCases.length} use cases
                  </span>
                </div>
                <Button
                  className="w-full"
                  onClick={() => handleUseTemplate(template)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Use Template
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 gap-4">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-md border px-3 py-2 text-sm"
              >
                <option value="all">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category
                      .replace("-", " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </option>
                ))}
              </select>
              <select
                value={selectedComplexity}
                onChange={(e) => setSelectedComplexity(e.target.value)}
                className="rounded-md border px-3 py-2 text-sm"
              >
                <option value="all">All Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div className="text-sm text-muted-foreground">
              {filteredTemplates.length} template
              {filteredTemplates.length !== 1 ? "s" : ""} found
            </div>
          </div>
        </CardContent>
      </Card>

      {/* All Templates */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">All Templates</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <Card
              key={template.id}
              className="transition-shadow hover:shadow-md"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{template.icon}</div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="truncate text-lg">
                        {template.name}
                      </CardTitle>
                      <Badge variant="outline" className="mt-1">
                        {template.category.replace("-", " ")}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge
                      variant={
                        template.complexity === "beginner"
                          ? "secondary"
                          : template.complexity === "intermediate"
                            ? "default"
                            : "destructive"
                      }
                      className="text-xs"
                    >
                      {template.complexity}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      ⭐ {template.popularity}%
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {template.description}
                </p>
                <div className="flex flex-wrap gap-1">
                  {template.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {template.tags.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{template.tags.length - 3}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1">
                        <Search className="mr-1 h-3 w-3" />
                        Preview
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <span className="text-2xl">{template.icon}</span>
                          {template.name}
                        </DialogTitle>
                        <DialogDescription>
                          {template.longDescription}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <h4 className="mb-2 font-medium">Use Cases</h4>
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            {template.useCases.map((useCase, index) => (
                              <li
                                key={index}
                                className="flex items-center gap-2"
                              >
                                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                {useCase}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="mb-2 font-medium">
                            System Prompt Preview
                          </h4>
                          <div className="max-h-32 overflow-y-auto rounded-md bg-muted p-3 text-sm">
                            {template.systemPrompt.slice(0, 300)}...
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span>
                            <strong>Model:</strong> {template.model}
                          </span>
                          <span>
                            <strong>Provider:</strong> {template.provider}
                          </span>
                          <span>
                            <strong>Cost:</strong> {template.costTier}
                          </span>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleUseTemplate(template)}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Use
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="py-12 text-center">
            <Bot className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-medium">No templates found</h3>
            <p className="mb-4 text-muted-foreground">
              Try adjusting your search or filter criteria
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
                setSelectedComplexity("all");
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      {selectedTemplate && (
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Agent from Template</DialogTitle>
              <DialogDescription>
                Customize and create your agent based on the "
                {selectedTemplate.name}" template
              </DialogDescription>
            </DialogHeader>
            <AgentCreationWizard
              initialData={{
                name: `${selectedTemplate.name} Copy`,
                description: selectedTemplate.description,
                icon: selectedTemplate.icon,
                category: selectedTemplate.category,
                systemPrompt: selectedTemplate.systemPrompt,
                model: selectedTemplate.model,
                provider: selectedTemplate.provider,
                costTier: selectedTemplate.costTier,
              }}
              onComplete={handleAgentCreated}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
