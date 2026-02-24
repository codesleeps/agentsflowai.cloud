"use client";

import { useState } from "react";
import { 
  Sparkles, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Zap,
  Target,
  MessageSquare,
  Hash,
  Clock,
  Loader2,
  RefreshCw,
  Lightbulb
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface AnalysisResult {
  score: number;
  category: string;
  strengths: string[];
  improvements: string[];
  metrics: {
    hook: number;
    readability: number;
    emotion: number;
    shareability: number;
    timing: number;
  };
  suggestions: string[];
  hashtags: string[];
  bestTimeToPost: string;
}

export function ViralAnalyzer() {
  const [content, setContent] = useState("");
  const [platform, setPlatform] = useState<string>("linkedin");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const platforms = [
    { id: "linkedin", name: "LinkedIn", maxLength: 3000 },
    { id: "twitter", name: "Twitter/X", maxLength: 280 },
    { id: "instagram", name: "Instagram", maxLength: 2200 },
  ];

  const analyzeContent = async () => {
    if (!content.trim()) {
      toast.error("Please enter some content to analyze");
      return;
    }

    setIsAnalyzing(true);
    setResult(null);

    try {
      // Simulate AI analysis
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Generate mock analysis based on content
      const wordCount = content.split(/\s+/).length;
      const hasHook = /^(🚀|💡|⚡|🔥|🎯|Did you know|Here's|Imagine|Stop|Don't)/i.test(content);
      const hasNumbers = /\d/.test(content);
      const hasQuestions = /\?/.test(content);
      const hasEmojis = /[\u{1F300}-\u{1F9FF}]/u.test(content);
      const hasCTA = /(comment|share|follow|like|click|swipe|drop|let me know)/i.test(content);

      const mockResult: AnalysisResult = {
        score: Math.min(95, Math.max(40, 
          50 + 
          (hasHook ? 15 : 0) + 
          (hasNumbers ? 10 : 0) + 
          (hasQuestions ? 10 : 0) + 
          (hasEmojis ? 5 : 0) + 
          (hasCTA ? 10 : 0)
        )),
        category: hasHook && hasCTA ? "High Potential" : hasHook ? "Good" : "Needs Work",
        strengths: [],
        improvements: [],
        metrics: {
          hook: hasHook ? Math.floor(Math.random() * 20) + 80 : Math.floor(Math.random() * 30) + 40,
          readability: Math.min(95, Math.max(60, 100 - wordCount / 10)),
          emotion: hasEmojis ? Math.floor(Math.random() * 20) + 75 : Math.floor(Math.random() * 30) + 50,
          shareability: hasCTA ? Math.floor(Math.random() * 20) + 75 : Math.floor(Math.random() * 30) + 45,
          timing: Math.floor(Math.random() * 20) + 70,
        },
        suggestions: [],
        hashtags: [],
        bestTimeToPost: "",
      };

      // Generate strengths
      if (hasHook) mockResult.strengths.push("Strong opening hook that grabs attention");
      if (hasNumbers) mockResult.strengths.push("Uses specific numbers for credibility");
      if (hasQuestions) mockResult.strengths.push("Engages readers with questions");
      if (hasEmojis) mockResult.strengths.push("Visual elements with emojis increase engagement");
      if (hasCTA) mockResult.strengths.push("Clear call-to-action encourages interaction");
      if (wordCount > 50 && wordCount < 300) mockResult.strengths.push("Optimal length for engagement");

      // Generate improvements
      if (!hasHook) mockResult.improvements.push("Add a strong hook in the first line (use emojis or power words)");
      if (!hasNumbers) mockResult.improvements.push("Include specific numbers or statistics for credibility");
      if (!hasQuestions) mockResult.improvements.push("Ask a question to encourage comments");
      if (!hasEmojis) mockResult.improvements.push("Add relevant emojis to increase visual appeal");
      if (!hasCTA) mockResult.improvements.push("Include a clear call-to-action (e.g., 'Comment below')");
      if (wordCount < 30) mockResult.improvements.push("Content is quite short - add more value or detail");
      if (wordCount > 500) mockResult.improvements.push("Consider shortening for better engagement");

      // Generate suggestions
      mockResult.suggestions = [
        "Start with a power word like 'Imagine,' 'Discover,' or 'Unlock'",
        "Add a personal story or example to make it relatable",
        "Use line breaks to improve readability",
        "Include 3-5 relevant hashtags at the end",
        "End with a question to boost comments",
      ];

      // Generate hashtags based on content
      const contentLower = content.toLowerCase();
      const hashtagMap: Record<string, string[]> = {
        marketing: ["#Marketing", "#DigitalMarketing", "#MarketingStrategy"],
        business: ["#Business", "#Entrepreneur", "#BusinessGrowth"],
        ai: ["#AI", "#ArtificialIntelligence", "#Tech"],
        sales: ["#Sales", "#B2B", "#SalesTips"],
        content: ["#ContentMarketing", "#ContentCreation", "#SocialMedia"],
        leadership: ["#Leadership", "#Management", "#Business"],
      };

      mockResult.hashtags = ["#Growth", "#Success"];
      Object.entries(hashtagMap).forEach(([keyword, tags]) => {
        if (contentLower.includes(keyword)) {
          mockResult.hashtags.push(...tags);
        }
      });

      // Best time to post
      const times = ["Tuesday 9:00 AM", "Wednesday 10:00 AM", "Thursday 2:00 PM", "Friday 8:00 AM"];
      mockResult.bestTimeToPost = times[Math.floor(Math.random() * times.length)];

      setResult(mockResult);
      toast.success("Analysis complete!");
    } catch (error) {
      toast.error("Failed to analyze content");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Viral Content Analyzer
          </CardTitle>
          <CardDescription>
            Paste your content and get AI-powered insights to maximize engagement
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Platform Selection */}
          <div className="flex gap-2">
            {platforms.map((p) => (
              <Button
                key={p.id}
                variant={platform === p.id ? "default" : "outline"}
                size="sm"
                onClick={() => setPlatform(p.id)}
              >
                {p.name}
              </Button>
            ))}
          </div>

          {/* Content Input */}
          <Textarea
            placeholder="Paste your post content here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            className="resize-none"
          />

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {content.length} / {platforms.find((p) => p.id === platform)?.maxLength.toLocaleString()} characters
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setContent("")}
              disabled={!content}
            >
              Clear
            </Button>
          </div>

          <Button
            onClick={analyzeContent}
            disabled={isAnalyzing || !content}
            className="w-full gap-2"
            size="lg"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Analyzing Content...
              </>
            ) : (
              <>
                <TrendingUp className="h-5 w-5" />
                Analyze Viral Potential
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Overall Score */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Viral Score</h3>
                  <p className="text-sm text-muted-foreground">
                    Based on engagement patterns and viral content analysis
                  </p>
                </div>
                <div className="text-right">
                  <div className={`text-4xl font-bold ${getScoreColor(result.score)}`}>
                    {result.score}
                  </div>
                  <Badge variant="outline" className="mt-1">
                    {result.category}
                  </Badge>
                </div>
              </div>
              <Progress 
                value={result.score} 
                className="mt-4 h-3"
              />
            </CardContent>
          </Card>

          {/* Detailed Metrics */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Hook Strength
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold">{result.metrics.hook}%</span>
                </div>
                <Progress value={result.metrics.hook} className="h-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Readability
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold">{result.metrics.readability}%</span>
                </div>
                <Progress value={result.metrics.readability} className="h-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Emotional Impact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold">{result.metrics.emotion}%</span>
                </div>
                <Progress value={result.metrics.emotion} className="h-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Shareability
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold">{result.metrics.shareability}%</span>
                </div>
                <Progress value={result.metrics.shareability} className="h-2" />
              </CardContent>
            </Card>
          </div>

          {/* Strengths & Improvements */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.strengths.map((strength, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                      {strength}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  Improvements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.improvements.map((improvement, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                      {improvement}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Suggestions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                AI Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {result.suggestions.map((suggestion, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                      {i + 1}
                    </span>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Hashtags & Timing */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Suggested Hashtags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {result.hashtags.map((hashtag) => (
                    <Badge key={hashtag} variant="secondary">
                      {hashtag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Best Time to Post
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold">{result.bestTimeToPost}</p>
                <p className="text-sm text-muted-foreground">
                  Based on your audience activity patterns
                </p>
              </CardContent>
            </Card>
          </div>

          <Button
            variant="outline"
            onClick={() => {
              setResult(null);
              setContent("");
            }}
            className="w-full gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Analyze Another Post
          </Button>
        </div>
      )}
    </div>
  );
}
