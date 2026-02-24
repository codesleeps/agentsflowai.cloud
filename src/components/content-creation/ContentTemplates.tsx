"use client";

import { useState } from "react";
import { 
  FileText, 
  Mail, 
  MessageSquare, 
  Sparkles, 
  CheckCircle,
  Clock,
  Target,
  ArrowRight,
  Star
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
import { toast } from "sonner";

interface ContentTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedTime: string;
  promptTemplate: string;
  defaultSettings: {
    tone: string;
    length: string;
    structure: string[];
  };
}

const templates: ContentTemplate[] = [
  {
    id: "how-to-guide",
    name: "How-To Guide",
    description: "Step-by-step instructional content that teaches readers how to accomplish a specific task",
    icon: <FileText className="h-6 w-6" />,
    category: "Educational",
    difficulty: "beginner",
    estimatedTime: "10-15 min",
    promptTemplate: "Write a comprehensive how-to guide about",
    defaultSettings: {
      tone: "friendly",
      length: "medium",
      structure: ["Introduction", "Materials/Prerequisites", "Step-by-step instructions", "Tips & Tricks", "Conclusion"]
    }
  },
  {
    id: "listicle",
    name: "Listicle",
    description: "Numbered list format that's easy to scan and highly shareable",
    icon: <Sparkles className="h-6 w-6" />,
    category: "Engagement",
    difficulty: "beginner",
    estimatedTime: "8-12 min",
    promptTemplate: "Create an engaging listicle about",
    defaultSettings: {
      tone: "casual",
      length: "medium",
      structure: ["Catchy headline", "Brief intro", "Numbered items with descriptions", "Key takeaways"]
    }
  },
  {
    id: "case-study",
    name: "Case Study",
    description: "In-depth analysis of a real-world example with results and lessons learned",
    icon: <Target className="h-6 w-6" />,
    category: "Authority",
    difficulty: "advanced",
    estimatedTime: "20-30 min",
    promptTemplate: "Write a compelling case study about",
    defaultSettings: {
      tone: "professional",
      length: "long",
      structure: ["Executive summary", "Background/Challenge", "Solution/Approach", "Results/Impact", "Lessons learned"]
    }
  },
  {
    id: "product-review",
    name: "Product Review",
    description: "Honest evaluation of a product or service with pros, cons, and recommendations",
    icon: <Star className="h-6 w-6" />,
    category: "Review",
    difficulty: "intermediate",
    estimatedTime: "15-20 min",
    promptTemplate: "Write an honest and detailed product review of",
    defaultSettings: {
      tone: "professional",
      length: "medium",
      structure: ["Overview", "Key features", "Pros & Cons", "Use cases", "Final verdict"]
    }
  },
  {
    id: "newsletter",
    name: "Email Newsletter",
    description: "Engaging email content with valuable insights and clear call-to-action",
    icon: <Mail className="h-6 w-6" />,
    category: "Email",
    difficulty: "beginner",
    estimatedTime: "10-15 min",
    promptTemplate: "Write an engaging email newsletter about",
    defaultSettings: {
      tone: "friendly",
      length: "short",
      structure: ["Subject line", "Personal greeting", "Main content", "Call-to-action", "Sign-off"]
    }
  },
  {
    id: "social-carousel",
    name: "Social Media Carousel",
    description: "Multi-slide social media post with engaging visuals and bite-sized content",
    icon: <MessageSquare className="h-6 w-6" />,
    category: "Social",
    difficulty: "intermediate",
    estimatedTime: "12-18 min",
    promptTemplate: "Create a social media carousel post about",
    defaultSettings: {
      tone: "casual",
      length: "short",
      structure: ["Hook slide", "Value slides (3-5)", "CTA slide", "Caption with hashtags"]
    }
  },
  {
    id: "thought-leadership",
    name: "Thought Leadership",
    description: "Expert opinion piece that establishes authority and sparks discussion",
    icon: <Sparkles className="h-6 w-6" />,
    category: "Authority",
    difficulty: "advanced",
    estimatedTime: "25-35 min",
    promptTemplate: "Write a thought-provoking opinion piece about",
    defaultSettings: {
      tone: "authoritative",
      length: "long",
      structure: ["Strong opening", "Context/Problem", "Unique perspective", "Supporting arguments", "Call to action"]
    }
  },
  {
    id: "comparison",
    name: "Comparison Post",
    description: "Side-by-side comparison helping readers make informed decisions",
    icon: <Target className="h-6 w-6" />,
    category: "Educational",
    difficulty: "intermediate",
    estimatedTime: "15-20 min",
    promptTemplate: "Create a detailed comparison of",
    defaultSettings: {
      tone: "professional",
      length: "medium",
      structure: ["Introduction", "Feature comparison", "Pros/Cons of each", "Recommendations", "Conclusion"]
    }
  }
];

interface ContentTemplatesProps {
  onSelectTemplate: (template: ContentTemplate) => void;
}

export function ContentTemplates({ onSelectTemplate }: ContentTemplatesProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

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

  const handleUseTemplate = (template: ContentTemplate) => {
    onSelectTemplate(template);
    toast.success(`Loaded "${template.name}" template!`);
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
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Structure:</p>
                  <ul className="space-y-1">
                    {template.defaultSettings.structure.slice(0, 4).map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle className="h-3 w-3 text-primary" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full gap-2"
                onClick={() => handleUseTemplate(template)}
              >
                Use Template
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

export type { ContentTemplate };
