"use client";

import { useState } from "react";
import {
  Share2,
  Megaphone,
  Loader2,
  Copy,
  Check,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

const PLATFORMS = [
  { id: "twitter", label: "Twitter / X" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
] as const;

const platformGuides: Record<(typeof PLATFORMS)[number]["id"], string> = {
  twitter: "Keep under 280 characters. Use 1-2 high-intent hashtags. Make it punchy and engaging.",
  linkedin:
    "Professional, value-driven tone. Use line breaks for readability. Include a clear call-to-action.",
  instagram:
    "Conversational and visual. Use 5-10 relevant hashtags. Hooks in the first line, optional emojis.",
  facebook:
    "Conversational tone. Encourage comments and sharing. Mention benefits clearly.",
};

export default function SocialMediaAgentPage() {
  const [activeTab, setActiveTab] = useState<"single" | "campaign" | "ad">("single");
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]["id"]>("twitter");
  const [tone, setTone] = useState("friendly");
  const [cta, setCta] = useState("");
  const [results, setResults] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const ensureTopicAndPlatform = () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic");
      return false;
    }
    if (!platform) {
      toast.error("Please select a platform");
      return false;
    }
    return true;
  };

  const buildSinglePostPrompt = () => {
    const guide = platformGuides[platform];

    return `Create a single social media post for **${platform.toUpperCase()}**.

Topic: "${topic.trim()}"
Tone: ${tone}
Platform guidelines: ${guide}
${cta ? `Call-to-action to include: ${cta.trim()}` : "Include a clear, natural call-to-action relevant to the topic."}

Requirements:
- Write 2-3 variations of the post that feel native to ${platform}
- Use formatting and line breaks that match the platform
- Include appropriate hashtags (do NOT overstuff)
- Make the copy scroll-stopping and easy to skim
- Avoid generic fluff; be specific and benefit-driven`;
  };

  const buildCampaignPrompt = () => {
    const guide = platformGuides[platform];

    return `Create a 7-day social media campaign for **${platform.toUpperCase()}**.

Campaign topic: "${topic.trim()}"
Tone: ${tone}
Platform guidelines: ${guide}
${cta ? `Primary call-to-action for the campaign: ${cta.trim()}` : "Include a clear campaign CTA in the posts where it makes the most sense."}

Provide:
1. A short campaign overview (1-2 sentences)
2. A simple content calendar table (Day, Theme, Goal)
3. 1 post per day (7 total), each with:
   - Post copy
   - Suggested visual idea
   - Suggested hashtags
4. Mix of educational, social proof, and direct response style posts

Make everything ready-to-use and clearly labeled by day.`;
  };

  const buildAdCopyPrompt = () => {
    const guide = platformGuides[platform];

    return `You are an expert ${platform.toUpperCase()} performance marketer.

Create ad copy about: "${topic.trim()}"
Tone: ${tone}
Platform guidelines: ${guide}
${cta ? `Primary call-to-action to use: ${cta.trim()}` : "Include a strong, specific call-to-action in each variation."}

Provide:
1. 3 short, high-converting headlines
2. 3 primary text variations (2-4 sentences) optimized for ${platform}
3. 3 description / supporting line options (where supported by the platform)
4. Recommended CTA button text options
5. A quick note on which variation to test first and why

Keep everything organized with clear labels so it can be pasted directly into ad platforms.`;
  };

  const handleGenerate = async () => {
    if (!ensureTopicAndPlatform()) return;

    setIsLoading(true);
    setResults("");
    setCopied(false);

    try {
      let prompt: string;
      let agentId: string;

      if (activeTab === "single") {
        prompt = buildSinglePostPrompt();
        agentId = "social-media-agent";
      } else if (activeTab === "campaign") {
        prompt = buildCampaignPrompt();
        agentId = "social-media-agent";
      } else {
        // ad tab
        prompt = buildAdCopyPrompt();
        agentId = "marketing-agent";
      }

      const response = await generateAgentResponse(agentId, prompt);
      setResults(response.response);
      toast.success("Content generated successfully!");
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error generating social content:", error);
      toast.error("Failed to generate content. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!results) return;
    navigator.clipboard.writeText(results);
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
            <Share2 className="h-8 w-8 text-pink-500" />
            Social Media Agent
          </h1>
          <p className="text-muted-foreground mt-1">
            Generate social posts, campaigns, and ad copy tailored to each platform
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle>Social Content Settings</CardTitle>
            <CardDescription>Choose what you want to create and set the tone</CardDescription>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
              <TabsList className="grid w-full grid-cols-3 mt-4">
                <TabsTrigger value="single">Single Post</TabsTrigger>
                <TabsTrigger value="campaign">Campaign</TabsTrigger>
                <TabsTrigger value="ad">Ad Copy</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
              <TabsContent value="single" className="space-y-4 mt-0">
                <p className="text-xs text-muted-foreground">
                  Generate a high-performing post tailored to your chosen platform.
                </p>
              </TabsContent>
              <TabsContent value="campaign" className="space-y-4 mt-0">
                <p className="text-xs text-muted-foreground">
                  Plan a multi-day campaign with multiple posts and themes.
                </p>
              </TabsContent>
              <TabsContent value="ad" className="space-y-4 mt-0">
                <p className="text-xs text-muted-foreground">
                  Create performance-focused ad copy variations you can A/B test.
                </p>
              </TabsContent>
            </Tabs>

            {/* Topic */}
            <div className="space-y-2">
              <Label htmlFor="topic">Topic / Offer *</Label>
              <Input
                id="topic"
                placeholder="e.g., New AI-powered marketing service launch"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>

            {/* Platform & Tone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Platform *</Label>
                <Select value={platform} onValueChange={(value) => setPlatform(value as typeof platform)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tone</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="bold">Bold / Direct-response</SelectItem>
                    <SelectItem value="inspirational">Inspirational</SelectItem>
                    <SelectItem value="humorous">Humorous</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* CTA */}
            <div className="space-y-2">
              <Label htmlFor="cta">Optional Call-to-Action</Label>
              <Input
                id="cta"
                placeholder="e.g., Book a free strategy call today"
                value={cta}
                onChange={(e) => setCta(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Leave blank to let the agent craft a natural CTA.
              </p>
            </div>

            <Button className="w-full" onClick={handleGenerate} disabled={isLoading || !topic.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  {activeTab === "ad" ? (
                    <Megaphone className="h-4 w-4 mr-2" />
                  ) : (
                    <Share2 className="h-4 w-4 mr-2" />
                  )}
                  {activeTab === "single" && "Generate Post"}
                  {activeTab === "campaign" && "Generate Campaign"}
                  {activeTab === "ad" && "Generate Ad Copy"}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Output Section */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>
                {activeTab === "single" && "Generated Post"}
                {activeTab === "campaign" && "Campaign & Posts"}
                {activeTab === "ad" && "Ad Copy Variations"}
              </CardTitle>
              <CardDescription>
                Your AI-generated social content will appear here
              </CardDescription>
            </div>
            {results && (
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                {copied ? "Copied!" : "Copy"}
              </Button>
            )}
          </CardHeader>
          <CardContent className="flex-1">
            {isLoading ? (
              <div className="h-full flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  <p className="text-sm text-muted-foreground mt-2">
                    Crafting your social content...
                  </p>
                </div>
              </div>
            ) : results ? (
              <Textarea
                value={results}
                onChange={(e) => setResults(e.target.value)}
                className="min-h-[500px] font-mono text-sm"
              />
            ) : (
              <div className="h-full flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <Share2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Configure your settings and click generate to see results here
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
