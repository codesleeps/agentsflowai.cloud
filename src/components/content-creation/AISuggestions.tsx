"use client";

import { useState, useEffect } from "react";
import { 
  Sparkles, 
  Lightbulb, 
  Type, 
  Hash,
  Loader2,
  RefreshCw,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface AISuggestionsProps {
  topic: string;
  contentType: string;
  onSuggestionClick: (suggestion: string) => void;
}

interface SuggestionData {
  headlines: string[];
  topics: string[];
  keywords: string[];
  hooks: string[];
}

export function AISuggestions({ topic, contentType, onSuggestionClick }: AISuggestionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionData | null>(null);

  const generateSuggestions = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic first");
      return;
    }

    setIsLoading(true);
    
    // Simulate AI generation
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const mockSuggestions: Record<string, SuggestionData> = {
      "blog-post": {
        headlines: [
          `The Ultimate Guide to ${topic}: Everything You Need to Know`,
          `10 Proven Strategies for ${topic} That Actually Work`,
          `How to Master ${topic} in 30 Days (Step-by-Step)`,
          `${topic}: Common Mistakes and How to Avoid Them`,
          `Why ${topic} Matters More Than Ever in 2026`
        ],
        topics: [
          "Introduction to the basics",
          "Common challenges and solutions",
          "Best practices and tips",
          "Tools and resources",
          "Future trends and predictions",
          "Case studies and examples"
        ],
        keywords: [
          topic.toLowerCase(),
          "guide",
          "tips",
          "strategies",
          "best practices",
          "how to",
          "tutorial"
        ],
        hooks: [
          `Did you know that 73% of professionals struggle with ${topic}?`,
          `What if I told you that ${topic} could be easier than you think?`,
          `Stop making these common ${topic} mistakes...`,
          `Imagine mastering ${topic} in just 30 days. Here's how...`
        ]
      },
      "email": {
        headlines: [
          `Quick question about ${topic}...`,
          `Your ${topic} strategy needs this`,
          `I found a solution for ${topic}`,
          `Don't miss this ${topic} opportunity`,
          `The ${topic} guide you requested`
        ],
        topics: [
          "Personal story or anecdote",
          "Value proposition",
          "Social proof",
          "Clear call-to-action",
          "P.S. section with bonus"
        ],
        keywords: [
          "exclusive",
          "limited time",
          "free",
          "proven",
          "guaranteed"
        ],
        hooks: [
          `I noticed you've been interested in ${topic}...`,
          `This changed everything for me regarding ${topic}...`,
          `Are you still struggling with ${topic}?`,
          `Quick favor: Can I share something about ${topic}?`
        ]
      },
      "social": {
        headlines: [
          `Hot take on ${topic} 🔥`,
          `Unpopular opinion: ${topic}`,
          `${topic} thread 🧵👇`,
          `POV: You're learning ${topic}`,
          `Stop scrolling if you care about ${topic}`
        ],
        topics: [
          "Quick tip or hack",
          "Common myth debunked",
          "Before/after transformation",
          "Question to engage audience",
          "Behind the scenes"
        ],
        keywords: [
          "#tips",
          "#growth",
          "#success",
          "#learn",
          "#motivation"
        ],
        hooks: [
          `3 things about ${topic} I wish I knew sooner:`,
          `This ${topic} tip saved me 10 hours last week...`,
          `Nobody talks about this ${topic} secret...`,
          `If you're struggling with ${topic}, read this:`
        ]
      },
      "ad-copy": {
        headlines: [
          `Finally, a better way to handle ${topic}`,
          `The ${topic} solution you've been waiting for`,
          `Say goodbye to ${topic} frustration`,
          `Transform your ${topic} in 30 days`,
          `Why top performers choose us for ${topic}`
        ],
        topics: [
          "Pain point agitation",
          "Solution presentation",
          "Benefit stacking",
          "Risk reversal",
          "Urgency/scarcity"
        ],
        keywords: [
          "guaranteed",
          "proven",
          "exclusive",
          "limited",
          "instant"
        ],
        hooks: [
          `Tired of ${topic} holding you back?`,
          `What if ${topic} became your competitive advantage?`,
          `Stop wasting time on ${topic}...`,
          `The ${topic} breakthrough you need...`
        ]
      }
    };

    setSuggestions(mockSuggestions[contentType] || mockSuggestions["blog-post"]);
    setIsLoading(false);
    toast.success("AI suggestions generated!");
  };

  useEffect(() => {
    if (topic.trim()) {
      generateSuggestions();
    }
  }, [contentType]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Suggestions
          </h3>
          <p className="text-sm text-muted-foreground">
            Get AI-powered ideas for your content
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={generateSuggestions}
          disabled={isLoading || !topic.trim()}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : suggestions ? (
        <div className="space-y-4">
          {/* Headlines */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Type className="h-4 w-4" />
                Suggested Headlines
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {suggestions.headlines.map((headline, i) => (
                  <button
                    key={i}
                    onClick={() => onSuggestionClick(headline)}
                    className="w-full text-left p-2 rounded-lg hover:bg-muted transition-colors text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <ArrowRight className="h-3 w-3 text-primary" />
                      {headline}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Topics */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Content Topics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {suggestions.topics.map((topic, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                    onClick={() => onSuggestionClick(topic)}
                  >
                    {topic}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Keywords */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Hash className="h-4 w-4" />
                SEO Keywords
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {suggestions.keywords.map((keyword, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/10"
                    onClick={() => onSuggestionClick(keyword)}
                  >
                    {keyword}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Hooks */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Opening Hooks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {suggestions.hooks.map((hook, i) => (
                  <button
                    key={i}
                    onClick={() => onSuggestionClick(hook)}
                    className="w-full text-left p-2 rounded-lg hover:bg-muted transition-colors text-sm italic"
                  >
                    &ldquo;{hook}&rdquo;
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Enter a topic to get AI suggestions</p>
        </div>
      )}
    </div>
  );
}
