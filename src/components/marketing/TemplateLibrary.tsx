"use client";

import { useState } from "react";
import { 
  Rocket, 
  TrendingUp, 
  Users, 
  Award, 
  Mail, 
  Calendar,
  Sparkles,
  Play,
  Clock,
  CheckCircle,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Template {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedTime: string;
  steps: string[];
  platforms: string[];
  presetData: {
    name: string;
    topic: string;
    targetAudience: string;
    goal: string;
    brandVoice: string;
  };
}

const templates: Template[] = [
  {
    id: "product-launch",
    name: "Product Launch",
    description: "Generate buzz and excitement for your new product or feature release",
    icon: <Rocket className="h-6 w-6" />,
    category: "Launch",
    difficulty: "intermediate",
    estimatedTime: "15-20 min",
    steps: ["Research market trends", "Create launch announcement", "Generate social posts", "Create email sequence"],
    platforms: ["LinkedIn", "Twitter", "Email", "Blog"],
    presetData: {
      name: "Product Launch Campaign",
      topic: "Introducing our revolutionary new product that solves [problem]",
      targetAudience: "Early adopters, tech enthusiasts, potential customers",
      goal: "Generate 1000+ signups and create buzz around the launch",
      brandVoice: "Exciting, innovative, confident but approachable",
    },
  },
  {
    id: "weekly-newsletter",
    name: "Weekly Newsletter",
    description: "Keep your audience engaged with a consistent weekly newsletter",
    icon: <Mail className="h-6 w-6" />,
    category: "Content",
    difficulty: "beginner",
    estimatedTime: "10-15 min",
    steps: ["Curate top content", "Write newsletter intro", "Create social teasers", "Schedule posts"],
    platforms: ["Email", "LinkedIn", "Twitter"],
    presetData: {
      name: "Weekly Newsletter",
      topic: "This week's top insights and updates from our industry",
      targetAudience: "Subscribers, existing customers, industry professionals",
      goal: "Maintain engagement and drive traffic to our content",
      brandVoice: "Informative, friendly, value-driven",
    },
  },
  {
    id: "case-study",
    name: "Case Study Campaign",
    description: "Showcase your success stories and build credibility",
    icon: <Award className="h-6 w-6" />,
    category: "Social Proof",
    difficulty: "intermediate",
    estimatedTime: "20-30 min",
    steps: ["Research customer success", "Write case study", "Create social highlights", "Design infographic"],
    platforms: ["LinkedIn", "Blog", "Email", "Instagram"],
    presetData: {
      name: "Customer Success Story",
      topic: "How [Customer] achieved [Result] using our solution",
      targetAudience: "Prospects, decision-makers, similar businesses",
      goal: "Build trust and demonstrate real results",
      brandVoice: "Professional, results-focused, authentic",
    },
  },
  {
    id: "thought-leadership",
    name: "Thought Leadership",
    description: "Establish yourself as an industry expert with insightful content",
    icon: <TrendingUp className="h-6 w-6" />,
    category: "Authority",
    difficulty: "advanced",
    estimatedTime: "25-35 min",
    steps: ["Research industry trends", "Write opinion piece", "Create discussion posts", "Engage with comments"],
    platforms: ["LinkedIn", "Blog", "Twitter"],
    presetData: {
      name: "Industry Insights",
      topic: "The future of [industry]: trends and predictions for 2025",
      targetAudience: "Industry professionals, peers, potential partners",
      goal: "Build authority and spark meaningful conversations",
      brandVoice: "Expert, forward-thinking, insightful",
    },
  },
  {
    id: "webinar-promo",
    name: "Webinar Promotion",
    description: "Drive registrations for your upcoming webinar or event",
    icon: <Users className="h-6 w-6" />,
    category: "Event",
    difficulty: "beginner",
    estimatedTime: "10-15 min",
    steps: ["Create event announcement", "Write reminder sequence", "Generate social posts", "Create countdown content"],
    platforms: ["LinkedIn", "Email", "Twitter", "Facebook"],
    presetData: {
      name: "Webinar Registration Drive",
      topic: "Join our free webinar: [Topic] with [Speaker]",
      targetAudience: "Target audience interested in the webinar topic",
      goal: "Drive 500+ webinar registrations",
      brandVoice: "Enthusiastic, educational, inviting",
    },
  },
  {
    id: "holiday-campaign",
    name: "Holiday Special",
    description: "Seasonal campaign to boost sales during holiday periods",
    icon: <Calendar className="h-6 w-6" />,
    category: "Promotional",
    difficulty: "beginner",
    estimatedTime: "10-15 min",
    steps: ["Create offer announcement", "Write promotional emails", "Generate social content", "Create urgency posts"],
    platforms: ["Email", "Instagram", "Facebook", "LinkedIn"],
    presetData: {
      name: "Holiday Special Offer",
      topic: "Limited time holiday offer: [Discount] off our services",
      targetAudience: "Existing customers, prospects, gift buyers",
      goal: "Increase sales by 30% during holiday season",
      brandVoice: "Festive, urgent, generous",
    },
  },
];

interface TemplateLibraryProps {
  onSelectTemplate: (template: Template) => void;
}

export function TemplateLibrary({ onSelectTemplate }: TemplateLibraryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  const categories = ["all", ...Array.from(new Set(templates.map((t) => t.category)))];

  const filteredTemplates = selectedCategory === "all" 
    ? templates 
    : templates.filter((t) => t.category === selectedCategory);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case "intermediate":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      case "advanced":
        return "bg-red-500/10 text-red-600 border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-600";
    }
  };

  const handleUseTemplate = (template: Template) => {
    onSelectTemplate(template);
    toast.success(`Loaded "${template.name}" template!`);
    setPreviewTemplate(null);
  };

  return (
    <div className="space-y-6">
      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(category)}
            className="capitalize"
          >
            {category}
          </Button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="flex flex-col transition-all hover:border-primary/50 hover:shadow-lg">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {template.icon}
                </div>
                <Badge variant="outline" className={getDifficultyColor(template.difficulty)}>
                  {template.difficulty}
                </Badge>
              </div>
              <CardTitle className="mt-4">{template.name}</CardTitle>
              <CardDescription>{template.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{template.estimatedTime}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {template.platforms.map((platform) => (
                    <Badge key={platform} variant="secondary" className="text-xs">
                      {platform}
                    </Badge>
                  ))}
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Includes:</p>
                  <ul className="space-y-1">
                    {template.steps.slice(0, 3).map((step, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle className="h-3 w-3 text-primary" />
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setPreviewTemplate(template)}
              >
                Preview
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={() => handleUseTemplate(template)}
              >
                <Play className="h-4 w-4" />
                Use Template
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewTemplate?.icon}
              {previewTemplate?.name}
            </DialogTitle>
            <DialogDescription>{previewTemplate?.description}</DialogDescription>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Category</p>
                  <p className="text-sm">{previewTemplate.category}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Difficulty</p>
                  <Badge variant="outline" className={getDifficultyColor(previewTemplate.difficulty)}>
                    {previewTemplate.difficulty}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Time</p>
                  <p className="text-sm">{previewTemplate.estimatedTime}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Platforms</p>
                  <p className="text-sm">{previewTemplate.platforms.join(", ")}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Campaign Steps</p>
                <div className="space-y-2">
                  {previewTemplate.steps.map((step, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                        {i + 1}
                      </div>
                      {step}
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm font-medium mb-2">Preset Configuration</p>
                <div className="space-y-2 text-sm">
                  <p><span className="text-muted-foreground">Name:</span> {previewTemplate.presetData.name}</p>
                  <p><span className="text-muted-foreground">Topic:</span> {previewTemplate.presetData.topic}</p>
                  <p><span className="text-muted-foreground">Goal:</span> {previewTemplate.presetData.goal}</p>
                </div>
              </div>
              <Button onClick={() => handleUseTemplate(previewTemplate)} className="w-full gap-2">
                <Sparkles className="h-4 w-4" />
                Use This Template
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export type { Template };
