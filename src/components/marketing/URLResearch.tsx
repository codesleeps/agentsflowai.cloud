"use client";

import { useState } from "react";
import { 
  Globe, 
  Search, 
  Loader2, 
  ExternalLink, 
  BookOpen, 
  Clock, 
  FileText,
  Lightbulb,
  Target,
  Users,
  ArrowRight,
  CheckCircle,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  simulateFetchURLContent, 
  isValidURL, 
  URLResearchResult,
  analyzeContentForMarketing,
  extractDomain
} from "@/lib/marketing/url-research";

interface URLResearchProps {
  onUseForCampaign?: (content: URLResearchResult) => void;
  onUseForRepurposing?: (content: URLResearchResult) => void;
}

export function URLResearch({ onUseForCampaign, onUseForRepurposing }: URLResearchProps) {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<URLResearchResult | null>(null);
  const [analysis, setAnalysis] = useState<ReturnType<typeof analyzeContentForMarketing> | null>(null);

  const handleResearch = async () => {
    if (!url.trim()) {
      toast.error("Please enter a URL");
      return;
    }

    if (!isValidURL(url)) {
      toast.error("Please enter a valid URL (http:// or https://)");
      return;
    }

    setIsLoading(true);
    setResult(null);
    setAnalysis(null);

    try {
      const response = await simulateFetchURLContent(url);
      
      if (response.isValid && response.content) {
        setResult(response.content);
        setAnalysis(analyzeContentForMarketing(response.content));
        toast.success("Research complete!");
      } else {
        toast.error(response.error || "Failed to research URL");
      }
    } catch (error) {
      toast.error("Failed to research URL content");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleResearch();
    }
  };

  return (
    <div className="space-y-6">
      {/* URL Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Research from URL
          </CardTitle>
          <CardDescription>
            Enter any article, blog post, or webpage URL to analyze and extract insights
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="https://example.com/article-about-marketing"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-10"
              />
            </div>
            <Button 
              onClick={handleResearch} 
              disabled={isLoading || !url}
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Researching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Research
                </>
              )}
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground">Try these examples:</span>
            {[
              "https://blog.hubspot.com/marketing",
              "https://neilpatel.com/blog",
              "https://buffer.com/resources",
            ].map((example) => (
              <button
                key={example}
                onClick={() => setUrl(example)}
                className="text-xs text-primary hover:underline"
              >
                {extractDomain(example)}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Research Results */}
      {result && analysis && (
        <div className="space-y-6">
          {/* Content Overview */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{result.title}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Globe className="h-3 w-3" />
                      {extractDomain(result.url)}
                      <a 
                        href={result.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Visit
                      </a>
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">{result.description}</p>
              
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>{result.wordCount} words</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{result.estimatedReadTime} min read</span>
                </div>
                {result.author && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">By {result.author}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {result.topics.map((topic) => (
                  <Badge key={topic} variant="secondary">
                    {topic}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Key Points */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle className="h-4 w-4" />
                Key Points Extracted
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {result.keyPoints.map((point, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                      {index + 1}
                    </span>
                    <span className="text-sm">{point}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Marketing Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lightbulb className="h-4 w-4" />
                Marketing Opportunities
              </CardTitle>
              <CardDescription>
                AI-generated suggestions based on this content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Suggested Topics */}
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Suggested Content Topics
                </h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.suggestedTopics.map((topic) => (
                    <Badge key={topic} variant="outline" className="cursor-pointer hover:bg-primary/10">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Content Angles */}
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Content Angles
                </h4>
                <ul className="space-y-2">
                  {analysis.contentAngles.map((angle, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ArrowRight className="h-3 w-3" />
                      {angle}
                    </li>
                  ))}
                </ul>
              </div>

              <Separator />

              {/* Target Audiences */}
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Recommended Audiences
                </h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.targetAudiences.map((audience) => (
                    <Badge key={audience} variant="secondary">
                      {audience}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Recommended Platforms */}
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  Best Platforms
                </h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.platforms.map((platform) => (
                    <Badge key={platform} className="bg-primary/10 text-primary">
                      {platform}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {onUseForCampaign && (
              <Button 
                onClick={() => onUseForCampaign(result)}
                className="flex-1 gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Use for Campaign
              </Button>
            )}
            {onUseForRepurposing && (
              <Button 
                variant="outline"
                onClick={() => onUseForRepurposing(result)}
                className="flex-1 gap-2"
              >
                <Globe className="h-4 w-4" />
                Repurpose Content
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
