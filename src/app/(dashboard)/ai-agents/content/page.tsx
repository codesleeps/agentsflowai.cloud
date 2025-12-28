"use client";

import { useState } from "react";
import {
  PenTool,
  Loader2,
  Copy,
  Check,
  FileText,
  Mail,
  MessageSquare,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generateAgentResponse } from "@/client-lib/ai-agents-client";
import { toast } from "sonner";

const contentTypes = [
  { id: "blog-post", label: "Blog Post", icon: FileText, description: "Long-form articles and blog content" },
  { id: "email", label: "Email", icon: Mail, description: "Email campaigns and newsletters" },
  { id: "social", label: "Social Post", icon: MessageSquare, description: "Social media content" },
  { id: "ad-copy", label: "Ad Copy", icon: Sparkles, description: "Advertising and promotional copy" },
];

export default function ContentCreationPage() {
  const [contentType, setContentType] = useState("blog-post");
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("professional");
  const [length, setLength] = useState("medium");
  const [keywords, setKeywords] = useState("");
  const [audience, setAudience] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic");
      return;
    }

    setIsLoading(true);
    setGeneratedContent("");

    try {
      const prompt = buildPrompt();
      const response = await generateAgentResponse("content-agent", prompt);
      setGeneratedContent(response.response);
      toast.success("Content generated successfully!");
    } catch (error) {
      console.error("Error generating content:", error);
      toast.error("Failed to generate content");
    } finally {
      setIsLoading(false);
    }
  };

  const buildPrompt = () => {
    const keywordList = keywords.split(",").map((k) => k.trim()).filter(Boolean);
    
    const prompts: Record<string, string> = {
      "blog-post": `Write a ${length} blog post about "${topic}".

Tone: ${tone}
${keywordList.length > 0 ? `SEO Keywords to include: ${keywordList.join(", ")}` : ""}
${audience ? `Target Audience: ${audience}` : ""}

Requirements:
- Engaging headline that captures attention
- Hook in the introduction
- Well-structured with H2 and H3 subheadings
- Bullet points for key takeaways
- Strong conclusion with call-to-action
- SEO-optimized structure`,

      email: `Write a ${tone} email about "${topic}".

Length: ${length}
${audience ? `Target Audience: ${audience}` : ""}

Include:
- Compelling subject line
- Personalized greeting
- Clear value proposition
- Call-to-action button text
- Professional sign-off`,

      social: `Create social media posts about "${topic}" for multiple platforms.

Tone: ${tone}
${keywordList.length > 0 ? `Hashtags/Keywords: ${keywordList.join(", ")}` : ""}

Generate posts for:
1. Twitter/X (under 280 characters)
2. LinkedIn (professional, with line breaks)
3. Instagram (engaging caption with hashtags)
4. Facebook (conversational, encourages comments)`,

      "ad-copy": `Create advertising copy for "${topic}".

Tone: ${tone}
${audience ? `Target Audience: ${audience}` : ""}

Generate:
1. Headline variations (3 options)
2. Primary text (compelling value proposition)
3. Call-to-action options
4. Description text
5. A/B test variations`,
    };

    return prompts[contentType] || prompts["blog-post"];
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-1 flex-col p-6 gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/ai-agents">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <PenTool className="h-8 w-8 text-green-500" />
            Content Creation Agent
          </h1>
          <p className="text-muted-foreground mt-1">
            Generate blog posts, emails, social media content, and ad copy
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle>Content Settings</CardTitle>
            <CardDescription>Configure your content generation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Content Type Selection */}
            <div className="grid grid-cols-2 gap-3">
              {contentTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setContentType(type.id)}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    contentType === type.id
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <type.icon className={`h-5 w-5 mb-2 ${contentType === type.id ? "text-primary" : "text-muted-foreground"}`} />
                  <p className="font-medium text-sm">{type.label}</p>
                  <p className="text-xs text-muted-foreground">{type.description}</p>
                </button>
              ))}
            </div>

            {/* Topic */}
            <div className="space-y-2">
              <Label htmlFor="topic">Topic / Subject *</Label>
              <Input
                id="topic"
                placeholder="e.g., 10 Ways to Improve Your Marketing ROI"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>

            {/* Tone & Length */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tone</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="authoritative">Authoritative</SelectItem>
                    <SelectItem value="humorous">Humorous</SelectItem>
                    <SelectItem value="inspirational">Inspirational</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Length</Label>
                <Select value={length} onValueChange={setLength}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="long">Long</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Keywords */}
            <div className="space-y-2">
              <Label htmlFor="keywords">SEO Keywords (comma separated)</Label>
              <Input
                id="keywords"
                placeholder="marketing, ROI, digital strategy"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
              />
            </div>

            {/* Target Audience */}
            <div className="space-y-2">
              <Label htmlFor="audience">Target Audience</Label>
              <Input
                id="audience"
                placeholder="e.g., Small business owners, Marketing managers"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
              />
            </div>

            <Button
              className="w-full"
              onClick={handleGenerate}
              disabled={isLoading || !topic.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Content
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Output Section */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Generated Content</CardTitle>
              <CardDescription>Your AI-generated content will appear here</CardDescription>
            </div>
            {generatedContent && (
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? (
                  <Check className="h-4 w-4 mr-2" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                {copied ? "Copied!" : "Copy"}
              </Button>
            )}
          </CardHeader>
          <CardContent className="flex-1">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  <p className="text-sm text-muted-foreground mt-2">
                    Generating your content...
                  </p>
                </div>
              </div>
            ) : generatedContent ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <Textarea
                  value={generatedContent}
                  onChange={(e) => setGeneratedContent(e.target.value)}
                  className="min-h-[500px] font-mono text-sm"
                />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <PenTool className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Configure your settings and click generate
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
