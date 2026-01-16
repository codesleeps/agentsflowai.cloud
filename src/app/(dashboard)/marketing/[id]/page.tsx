"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Play,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  BarChart3,
  Search,
  Sparkles,
  Copy,
  Download,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  useMarketingCampaign,
  runMarketingAgent,
  type MarketingCampaignStep,
} from "@/client-lib/api-client";
import type { ResearchAgentOutput, SEOContentAgentOutput } from "@/shared/models/marketing-types";

const getStatusIcon = (status: string) => {
  switch (status) {
    case "done":
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case "running":
      return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
    case "failed":
      return <XCircle className="h-5 w-5 text-red-500" />;
    default:
      return <Clock className="h-5 w-5 text-gray-500" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "done":
      return "bg-green-500/10 text-green-500 border-green-500/20";
    case "running":
      return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    case "failed":
      return "bg-red-500/10 text-red-500 border-red-500/20";
    default:
      return "bg-gray-500/10 text-gray-500 border-gray-500/20";
  }
};

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;
  const { data, isLoading, error } = useMarketingCampaign(campaignId);
  const [runningAgent, setRunningAgent] = useState<string | null>(null);

  const campaign = data?.campaign;
  const researchStep = campaign?.steps?.find((s) => s.type === "research");
  const contentStep = campaign?.steps?.find((s) => s.type === "content");

  const handleRunAgent = async (agentType: "research" | "content") => {
    setRunningAgent(agentType);
    try {
      const result = await runMarketingAgent(campaignId, agentType);
      toast.success(result.message);
    } catch (error: any) {
      toast.error(error.message || `Failed to run ${agentType} agent`);
    } finally {
      setRunningAgent(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const exportContent = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Content exported");
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <XCircle className="h-12 w-12 text-red-500" />
        <p className="text-muted-foreground">Campaign not found</p>
        <Button onClick={() => router.push("/marketing")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Campaigns
        </Button>
      </div>
    );
  }

  const researchOutput = researchStep?.output as ResearchAgentOutput | undefined;
  const contentOutput = contentStep?.output as SEOContentAgentOutput | undefined;

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/marketing")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{campaign.name}</h1>
              <Badge className={getStatusColor(campaign.status)}>{campaign.status}</Badge>
            </div>
            <p className="mt-1 text-muted-foreground">{campaign.topic}</p>
          </div>
        </div>
      </div>

      {/* Campaign Info */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {campaign.targetAudience && (
              <div>
                <span className="text-sm font-medium">Target Audience:</span>
                <p className="text-sm text-muted-foreground">{campaign.targetAudience}</p>
              </div>
            )}
            {campaign.goal && (
              <div>
                <span className="text-sm font-medium">Goal:</span>
                <p className="text-sm text-muted-foreground">{campaign.goal}</p>
              </div>
            )}
            {campaign.brandVoice && (
              <div className="md:col-span-2">
                <span className="text-sm font-medium">Brand Voice:</span>
                <p className="text-sm text-muted-foreground">{campaign.brandVoice}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Agent Workflow */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Research Agent */}
        <Card className="relative overflow-hidden">
          <div className="absolute right-0 top-0 h-24 w-24 -translate-y-6 translate-x-6 rounded-full bg-primary/10" />
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Research Agent</CardTitle>
              </div>
              {researchStep && getStatusIcon(researchStep.status)}
            </div>
            <CardDescription>Analyze topic and create content brief</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => handleRunAgent("research")}
              disabled={
                runningAgent !== null || researchStep?.status === "running" || researchStep?.status === "done"
              }
            >
              {runningAgent === "research" || researchStep?.status === "running" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : researchStep?.status === "done" ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Completed
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Run Research
                </>
              )}
            </Button>
            {researchStep?.error && (
              <p className="mt-2 text-xs text-red-500">{researchStep.error}</p>
            )}
          </CardContent>
        </Card>

        {/* Content Agent */}
        <Card className="relative overflow-hidden">
          <div className="absolute right-0 top-0 h-24 w-24 -translate-y-6 translate-x-6 rounded-full bg-secondary/10" />
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-secondary" />
                <CardTitle className="text-lg">Content Creator</CardTitle>
              </div>
              {contentStep && getStatusIcon(contentStep.status)}
            </div>
            <CardDescription>Generate SEO-optimized content</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => handleRunAgent("content")}
              disabled={
                runningAgent !== null ||
                contentStep?.status === "running" ||
                contentStep?.status === "done" ||
                researchStep?.status !== "done"
              }
            >
              {runningAgent === "content" || contentStep?.status === "running" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : contentStep?.status === "done" ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Completed
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Create Content
                </>
              )}
            </Button>
            {researchStep?.status !== "done" && (
              <p className="mt-2 text-xs text-muted-foreground">Complete research first</p>
            )}
            {contentStep?.error && (
              <p className="mt-2 text-xs text-red-500">{contentStep.error}</p>
            )}
          </CardContent>
        </Card>

        {/* Analytics Agent (Coming Soon) */}
        <Card className="relative overflow-hidden opacity-60">
          <div className="absolute right-0 top-0 h-24 w-24 -translate-y-6 translate-x-6 rounded-full bg-muted" />
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Analytics Agent</CardTitle>
              </div>
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardDescription>Track performance and optimize</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" disabled>
              <Sparkles className="mr-2 h-4 w-4" />
              Coming Soon
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      {(researchOutput || contentOutput) && (
        <Tabs defaultValue="research" className="w-full">
          <TabsList>
            {researchOutput && <TabsTrigger value="research">Research Results</TabsTrigger>}
            {contentOutput && <TabsTrigger value="content">Generated Content</TabsTrigger>}
          </TabsList>

          {researchOutput && (
            <TabsContent value="research" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Research Brief</CardTitle>
                  <CardDescription>{researchOutput.summary}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Target Audience & Goal */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h4 className="mb-2 font-semibold">Target Audience</h4>
                      <p className="text-sm text-muted-foreground">{researchOutput.targetAudience}</p>
                    </div>
                    <div>
                      <h4 className="mb-2 font-semibold">Primary Goal</h4>
                      <p className="text-sm text-muted-foreground">{researchOutput.primaryGoal}</p>
                    </div>
                  </div>

                  {/* Keywords */}
                  <div>
                    <h4 className="mb-2 font-semibold">SEO Keywords</h4>
                    <div className="space-y-2">
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">Primary:</span>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {researchOutput.seoKeywords.primary.map((kw, i) => (
                            <Badge key={i} variant="default">
                              {kw}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">Secondary:</span>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {researchOutput.seoKeywords.secondary.map((kw, i) => (
                            <Badge key={i} variant="secondary">
                              {kw}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Suggested Headlines */}
                  <div>
                    <h4 className="mb-2 font-semibold">Suggested Headlines</h4>
                    <ul className="space-y-2">
                      {researchOutput.suggestedHeadlines.map((headline, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-primary">•</span>
                          <span>{headline}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Content Outline */}
                  <div>
                    <h4 className="mb-2 font-semibold">Content Outline</h4>
                    <div className="space-y-2">
                      <div className="rounded-lg bg-muted p-3">
                        <p className="font-medium">{researchOutput.outline.title}</p>
                      </div>
                      {researchOutput.outline.sections.map((section, i) => (
                        <div key={i} className="rounded-lg border p-3">
                          <p className="font-medium text-sm">{section.heading}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{section.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Key Messages */}
                  <div>
                    <h4 className="mb-2 font-semibold">Key Messages</h4>
                    <ul className="space-y-1">
                      {researchOutput.keyMessages.map((msg, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-primary">{i + 1}.</span>
                          <span>{msg}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {contentOutput && (
            <TabsContent value="content" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{contentOutput.title}</CardTitle>
                      <CardDescription className="mt-1">
                        Estimated read time: {contentOutput.estimatedReadTime} min • Slug: {contentOutput.slugSuggestion}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(JSON.stringify(contentOutput, null, 2))}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          const sections = contentOutput.contentSections;
                          const markdown = sections.map((s) => "## " + s.heading + "\n\n" + s.body).join("\n\n");
                          exportContent(markdown, contentOutput.slugSuggestion + ".md");
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Meta */}
                  <div>
                    <h4 className="mb-2 font-semibold">SEO Meta</h4>
                    <div className="space-y-2 rounded-lg bg-muted p-4">
                      <div>
                        <span className="text-xs font-medium">Description:</span>
                        <p className="text-sm">{contentOutput.meta.description}</p>
                      </div>
                      <div>
                        <span className="text-xs font-medium">Keywords:</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {contentOutput.meta.keywords.map((kw, i) => (
                            <Badge key={i} variant="outline">
                              {kw}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Content Sections */}
                  <div>
                    <h4 className="mb-2 font-semibold">Content</h4>
                    <div className="space-y-4 rounded-lg border p-6">
                      {contentOutput.contentSections.map((section, i) => (
                        <div key={i}>
                          <h3 className="mb-2 text-xl font-bold">{section.heading}</h3>
                          <div className="prose prose-sm max-w-none text-sm text-muted-foreground">
                            {section.body.split("\n").map((line, j) => (
                              <p key={j} className="mb-2">
                                {line}
                              </p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CTA */}
                  <div>
                    <h4 className="mb-2 font-semibold">Call to Action</h4>
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-center">
                      <p className="text-lg font-semibold text-primary">{contentOutput.callToAction.text}</p>
                      {contentOutput.callToAction.urlSuggestion && (
                        <p className="mt-1 text-sm text-muted-foreground">{contentOutput.callToAction.urlSuggestion}</p>
                      )}
                    </div>
                  </div>

                  {/* Social Snippets */}
                  <div>
                    <h4 className="mb-2 font-semibold">Social Media Snippets</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-lg border p-4">
                        <p className="mb-2 text-xs font-medium">Twitter/X</p>
                        <p className="text-sm">{contentOutput.socialSnippets.twitter}</p>
                      </div>
                      <div className="rounded-lg border p-4">
                        <p className="mb-2 text-xs font-medium">LinkedIn</p>
                        <p className="text-sm">{contentOutput.socialSnippets.linkedin}</p>
                      </div>
                      <div className="rounded-lg border p-4">
                        <p className="mb-2 text-xs font-medium">Email Subject</p>
                        <p className="text-sm">{contentOutput.socialSnippets.emailSubject}</p>
                      </div>
                      <div className="rounded-lg border p-4">
                        <p className="mb-2 text-xs font-medium">Email Preview</p>
                        <p className="text-sm">{contentOutput.socialSnippets.emailPreviewText}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}
