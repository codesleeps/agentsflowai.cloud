"use client";

import { useState } from "react";
import { 
  Copy, 
  Check, 
  RefreshCw, 
  Linkedin, 
  Twitter, 
  Instagram, 
  Facebook,
  Mail,
  FileText,
  Sparkles,
  Loader2,
  Wand2,
  Link,
  Globe,
  FileInput,
  AlertCircle
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { simulateFetchURLContent, isValidURL, URLResearchResult } from "@/lib/marketing/url-research";

interface PlatformConfig {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  maxLength?: number;
}

const platforms: PlatformConfig[] = [
  {
    id: "linkedin",
    name: "LinkedIn Post",
    icon: <Linkedin className="h-5 w-5" />,
    description: "Professional tone, 1-2 paragraphs with hashtags",
    maxLength: 3000,
  },
  {
    id: "twitter",
    name: "Twitter/X Thread",
    icon: <Twitter className="h-5 w-5" />,
    description: "Short, punchy tweets in a thread format",
    maxLength: 280,
  },
  {
    id: "instagram",
    name: "Instagram Caption",
    icon: <Instagram className="h-5 w-5" />,
    description: "Engaging caption with emojis and hashtags",
    maxLength: 2200,
  },
  {
    id: "facebook",
    name: "Facebook Post",
    icon: <Facebook className="h-5 w-5" />,
    description: "Conversational tone for community engagement",
    maxLength: 63206,
  },
  {
    id: "email",
    name: "Email Newsletter",
    icon: <Mail className="h-5 w-5" />,
    description: "Professional email with subject line and body",
  },
  {
    id: "blog",
    name: "Blog Summary",
    icon: <FileText className="h-5 w-5" />,
    description: "SEO-optimized summary for blog posts",
  },
];

interface RepurposedContent {
  platform: string;
  content: string;
  subject?: string;
}

export function ContentRepurposer() {
  const [sourceContent, setSourceContent] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [urlContent, setUrlContent] = useState<URLResearchResult | null>(null);
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [inputMode, setInputMode] = useState<"text" | "url">("text");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<RepurposedContent[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platformId)
        ? prev.filter((p) => p !== platformId)
        : [...prev, platformId]
    );
  };

  const handleFetchURL = async () => {
    if (!urlInput.trim()) {
      toast.error("Please enter a URL");
      return;
    }

    if (!isValidURL(urlInput)) {
      toast.error("Please enter a valid URL (http:// or https://)");
      return;
    }

    setIsFetchingUrl(true);
    setUrlContent(null);

    try {
      const result = await simulateFetchURLContent(urlInput);
      
      if (result.isValid && result.content) {
        setUrlContent(result.content);
        setSourceContent(result.content.content);
        toast.success("Content fetched successfully!");
      } else {
        toast.error(result.error || "Failed to fetch content");
      }
    } catch (error) {
      toast.error("Failed to fetch URL content");
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const selectAll = () => {
    setSelectedPlatforms(platforms.map((p) => p.id));
  };

  const clearAll = () => {
    setSelectedPlatforms([]);
  };

  const generateContent = async () => {
    if (!sourceContent.trim()) {
      toast.error("Please enter some content to repurpose");
      return;
    }
    if (selectedPlatforms.length === 0) {
      toast.error("Please select at least one platform");
      return;
    }

    setIsGenerating(true);
    setGeneratedContent([]);

    try {
      // Simulate AI generation for each platform
      for (const platformId of selectedPlatforms) {
        const platform = platforms.find((p) => p.id === platformId);
        if (!platform) continue;

        // In real implementation, this would call your AI API
        await new Promise((resolve) => setTimeout(resolve, 1500));

        let generated: RepurposedContent;

        switch (platformId) {
          case "linkedin":
            generated = {
              platform: platform.name,
              content: `🚀 ${sourceContent.slice(0, 100)}...\n\nKey insights:\n• Point 1 from your content\n• Point 2 from your content\n• Point 3 from your content\n\nWhat are your thoughts on this? Share in the comments! 👇\n\n#Marketing #Business #Growth`,
            };
            break;
          case "twitter":
            generated = {
              platform: platform.name,
              content: `1/ 🧵 ${sourceContent.slice(0, 100)}...\n\nHere's what you need to know:\n\n2/ Key insight #1 that matters\n\n3/ Key insight #2 that matters\n\n4/ Key insight #3 that matters\n\n5/ Follow for more threads like this! 🚀`,
            };
            break;
          case "instagram":
            generated = {
              platform: platform.name,
              content: `✨ ${sourceContent.slice(0, 80)}...\n\nSwipe to learn more →\n\n💡 Save this for later!\n\n👇 Drop a 🔥 if you found this helpful\n\n#marketingtips #businessgrowth #entrepreneur #success`,
            };
            break;
          case "facebook":
            generated = {
              platform: platform.name,
              content: `Hey everyone! 👋\n\nI wanted to share something important about ${sourceContent.slice(0, 80)}...\n\nWhat do you all think? Have you experienced this? Let me know in the comments! 💬`,
            };
            break;
          case "email":
            generated = {
              platform: platform.name,
              subject: `Quick insights: ${sourceContent.slice(0, 50)}...`,
              content: `Hi there,\n\nI hope this email finds you well!\n\n${sourceContent}\n\nHere are the key takeaways:\n• Takeaway 1\n• Takeaway 2\n• Takeaway 3\n\nBest regards,\nYour Team`,
            };
            break;
          case "blog":
            generated = {
              platform: platform.name,
              content: `## Summary\n\n${sourceContent.slice(0, 200)}...\n\n### Key Points\n\n1. **First Point**: Description here\n2. **Second Point**: Description here\n3. **Third Point**: Description here\n\n### Conclusion\n\nIn conclusion, this topic is essential for...`,
            };
            break;
          default:
            generated = { platform: platform.name, content: sourceContent };
        }

        setGeneratedContent((prev) => [...prev, generated]);
      }

      toast.success(`Generated content for ${selectedPlatforms.length} platforms!`);
    } catch (error) {
      toast.error("Failed to generate content");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (content: string, id: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className="space-y-6">
      {/* Source Content with URL Support */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Source Content
          </CardTitle>
          <CardDescription>
            Paste content directly or fetch from a URL
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as "text" | "url")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="text" className="gap-2">
                <FileInput className="h-4 w-4" />
                Paste Text
              </TabsTrigger>
              <TabsTrigger value="url" className="gap-2">
                <Link className="h-4 w-4" />
                From URL
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="text" className="space-y-4">
              <Textarea
                placeholder="Paste your content here... (e.g., blog post, article, video transcript)"
                value={sourceContent}
                onChange={(e) => setSourceContent(e.target.value)}
                rows={8}
                className="resize-none"
              />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{sourceContent.length} characters</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSourceContent("")}
                  disabled={!sourceContent}
                >
                  Clear
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="url" className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="https://example.com/article"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button 
                  onClick={handleFetchURL} 
                  disabled={isFetchingUrl || !urlInput}
                  className="gap-2"
                >
                  {isFetchingUrl ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Link className="h-4 w-4" />
                      Fetch
                    </>
                  )}
                </Button>
              </div>
              
              {urlContent && (
                <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Globe className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold truncate">{urlContent.title}</h4>
                      <p className="text-sm text-muted-foreground truncate">{urlContent.url}</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{urlContent.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {urlContent.topics.map((topic) => (
                      <Badge key={topic} variant="secondary" className="text-xs">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{urlContent.wordCount} words</span>
                    <span>{urlContent.estimatedReadTime} min read</span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium">Key Points:</p>
                    <ul className="space-y-1">
                      {urlContent.keyPoints.slice(0, 3).map((point, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <span className="text-primary">•</span>
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              
              {sourceContent && !urlContent && (
                <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      Content loaded manually. Switch to &quot;Paste Text&quot; tab to edit.
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Platform Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Select Platforms
          </CardTitle>
          <CardDescription>
            Choose which platforms to generate content for
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-2">
            <Button variant="outline" size="sm" onClick={selectAll}>
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={clearAll}>
              Clear All
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {platforms.map((platform) => (
              <div
                key={platform.id}
                onClick={() => togglePlatform(platform.id)}
                className={`cursor-pointer rounded-lg border p-4 transition-all hover:border-primary ${
                  selectedPlatforms.includes(platform.id)
                    ? "border-primary bg-primary/5"
                    : "border-border"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                      selectedPlatforms.includes(platform.id)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {platform.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">{platform.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {platform.description}
                    </p>
                    {platform.maxLength && (
                      <Badge variant="secondary" className="mt-2 text-xs">
                        Max {platform.maxLength.toLocaleString()} chars
                      </Badge>
                    )}
                  </div>
                  {selectedPlatforms.includes(platform.id) && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Generate Button */}
      <Button
        onClick={generateContent}
        disabled={isGenerating || !sourceContent || selectedPlatforms.length === 0}
        className="w-full gap-2"
        size="lg"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Generating Content for {selectedPlatforms.length} Platforms...
          </>
        ) : (
          <>
            <Wand2 className="h-5 w-5" />
            Repurpose Content
          </>
        )}
      </Button>

      {/* Generated Content */}
      {generatedContent.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Generated Content</h3>
          {generatedContent.map((item, index) => (
            <Card key={index}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{item.platform}</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(
                      item.subject ? `${item.subject}\n\n${item.content}` : item.content,
                      `${item.platform}-${index}`
                    )}
                  >
                    {copiedId === `${item.platform}-${index}` ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {item.subject && (
                  <CardDescription>Subject: {item.subject}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <Textarea
                  value={item.content}
                  readOnly
                  rows={6}
                  className="resize-none bg-muted"
                />
              </CardContent>
            </Card>
          ))}
          <Button
            variant="outline"
            onClick={() => {
              setGeneratedContent([]);
              setSourceContent("");
              setSelectedPlatforms([]);
              setUrlInput("");
              setUrlContent(null);
              setInputMode("text");
            }}
            className="w-full gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Start Over
          </Button>
        </div>
      )}
    </div>
  );
}
