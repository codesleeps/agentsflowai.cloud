"use client";

import { useState } from "react";
import { Plus, Rocket, FileText, BarChart3, Loader2, CheckCircle, XCircle, Clock, Sparkles, Wand2, LayoutTemplate, Calendar, TrendingUp, Copy, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  useMarketingCampaigns,
  createMarketingCampaign,
  type MarketingCampaign,
} from "@/client-lib/api-client";
import { ContentRepurposer } from "@/components/marketing/ContentRepurposer";
import { TemplateLibrary, type Template } from "@/components/marketing/TemplateLibrary";
import { CampaignWizard, type CampaignData } from "@/components/marketing/CampaignWizard";
import { ViralAnalyzer } from "@/components/marketing/ViralAnalyzer";
import { ContentCalendar } from "@/components/marketing/ContentCalendar";
import { URLResearch } from "@/components/marketing/URLResearch";
import type { URLResearchResult } from "@/lib/marketing/url-research";

const getStatusIcon = (status: string) => {
  switch (status) {
    case "completed":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "running":
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Clock className="h-4 w-4 text-gray-500" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-green-500/10 text-green-500 border-green-500/20";
    case "running":
      return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    case "failed":
      return "bg-red-500/10 text-red-500 border-red-500/20";
    default:
      return "bg-gray-500/10 text-gray-500 border-gray-500/20";
  }
};

const getStepLabel = (type: string) => {
  switch (type) {
    case "research":
      return "Research";
    case "content":
      return "Content Creation";
    case "analytics":
      return "Analytics";
    default:
      return type;
  }
};

export default function MarketingCampaignsPage() {
  const router = useRouter();
  const { data, isLoading, error } = useMarketingCampaigns();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    topic: "",
    targetAudience: "",
    goal: "",
    brandVoice: "",
  });
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [activeTab, setActiveTab] = useState("campaigns");

  const handleCreate = async () => {
    if (!formData.name || !formData.topic) {
      toast.error("Please fill in required fields");
      return;
    }

    setCreating(true);
    try {
      const result = await createMarketingCampaign(formData);
      toast.success("Campaign created successfully!");
      setDialogOpen(false);
      setFormData({
        name: "",
        topic: "",
        targetAudience: "",
        goal: "",
        brandVoice: "",
      });
      // Navigate to campaign detail page
      router.push(`/marketing/${result.campaign.id}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to create campaign");
    } finally {
      setCreating(false);
    }
  };

  const handleCampaignClick = (campaignId: string) => {
    router.push(`/marketing/${campaignId}`);
  };

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setWizardOpen(true);
  };

  const handleWizardComplete = async (data: CampaignData) => {
    setCreating(true);
    try {
      const result = await createMarketingCampaign({
        name: data.name,
        topic: data.topic,
        targetAudience: data.targetAudience,
        goal: data.goal,
        brandVoice: data.brandVoice,
      });
      toast.success("Campaign created successfully!");
      setWizardOpen(false);
      setSelectedTemplate(null);
      router.push(`/marketing/${result.campaign.id}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to create campaign");
    } finally {
      setCreating(false);
    }
  };

  const handleUseURLForCampaign = (content: URLResearchResult) => {
    // Pre-fill wizard with URL content
    const template: Template = {
      id: "url-research",
      name: `Research: ${content.title}`,
      description: `Campaign based on research from ${content.url}`,
      icon: <Globe className="h-6 w-6" />,
      category: "Research",
      difficulty: "intermediate",
      estimatedTime: "15-20 min",
      steps: ["Analyze URL content", "Extract key insights", "Generate campaign materials"],
      platforms: ["LinkedIn", "Blog", "Email"],
      presetData: {
        name: `Campaign from ${content.title.slice(0, 30)}...`,
        topic: content.content.slice(0, 200),
        targetAudience: content.topics.join(", "),
        goal: "Create engaging content based on research insights",
        brandVoice: "Professional and informative",
      },
    };
    setSelectedTemplate(template);
    setWizardOpen(true);
    setActiveTab("campaigns");
  };

  const handleUseURLForRepurposing = (content: URLResearchResult) => {
    // Switch to repurposer tab with content pre-filled
    setActiveTab("repurposer");
    toast.success("Content loaded! Switch to the Repurposer tab to continue.");
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Rocket className="h-8 w-8 text-primary" />
            Marketing Hub
          </h1>
          <p className="mt-1 text-muted-foreground">
            AI-powered tools to create, repurpose, and optimize your marketing content
          </p>
        </div>

        <div className="flex gap-2">
          <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={() => setSelectedTemplate(null)}>
                <Wand2 className="h-4 w-4" />
                Campaign Wizard
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px]">
              <CampaignWizard
                initialTemplate={selectedTemplate}
                onComplete={handleWizardComplete}
                onCancel={() => setWizardOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg" onClick={() => setActiveTab("research")}>
          <CardContent className="pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 mb-3">
              <Globe className="h-5 w-5" />
            </div>
            <h3 className="font-semibold">URL Research</h3>
            <p className="text-sm text-muted-foreground">Research from any URL</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg" onClick={() => setActiveTab("repurposer")}>
          <CardContent className="pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 mb-3">
              <Copy className="h-5 w-5" />
            </div>
            <h3 className="font-semibold">Repurpose Content</h3>
            <p className="text-sm text-muted-foreground">Turn one post into many</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg" onClick={() => setActiveTab("templates")}>
          <CardContent className="pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 text-green-600 mb-3">
              <LayoutTemplate className="h-5 w-5" />
            </div>
            <h3 className="font-semibold">Templates</h3>
            <p className="text-sm text-muted-foreground">Pre-built campaigns</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg" onClick={() => setActiveTab("analyzer")}>
          <CardContent className="pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 mb-3">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h3 className="font-semibold">Viral Analyzer</h3>
            <p className="text-sm text-muted-foreground">Optimize for engagement</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg" onClick={() => setActiveTab("calendar")}>
          <CardContent className="pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600 mb-3">
              <Calendar className="h-5 w-5" />
            </div>
            <h3 className="font-semibold">Content Calendar</h3>
            <p className="text-sm text-muted-foreground">Schedule & organize</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="research">Research</TabsTrigger>
          <TabsTrigger value="repurposer">Repurposer</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="analyzer">Analyzer</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-6">
          {/* Campaign Flow Explanation */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                How It Works
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold">Research Agent</h4>
                    <p className="text-sm text-muted-foreground">
                      Analyzes your topic, identifies keywords, and creates a content brief
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold">Content Creator</h4>
                    <p className="text-sm text-muted-foreground">
                      Generates SEO-optimized content based on the research
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-muted-foreground">Analytics (Coming Soon)</h4>
                    <p className="text-sm text-muted-foreground">
                      Tracks performance and provides optimization recommendations
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Campaigns List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <Card>
              <CardContent className="py-12 text-center">
                <XCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
                <p className="text-muted-foreground">Failed to load campaigns</p>
              </CardContent>
            </Card>
          ) : !data?.campaigns || data.campaigns.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Rocket className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">No campaigns yet</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Create your first marketing campaign to get started with AI automation
                </p>
                <Button onClick={() => setWizardOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Campaign
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data.campaigns.map((campaign: MarketingCampaign) => {
                const researchStep = campaign.steps?.find((s) => s.type === "research");
                const contentStep = campaign.steps?.find((s) => s.type === "content");
                const completedSteps = campaign.steps?.filter((s) => s.status === "done").length || 0;
                const totalSteps = 2;

                return (
                  <Card
                    key={campaign.id}
                    className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg"
                    onClick={() => handleCampaignClick(campaign.id)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="mb-1">{campaign.name}</CardTitle>
                          <CardDescription className="line-clamp-1">{campaign.topic}</CardDescription>
                        </div>
                        <Badge className={getStatusColor(campaign.status)}>{campaign.status}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Progress</span>
                            <span>{completedSteps}/{totalSteps} steps</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full bg-primary transition-all"
                              style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          {researchStep && (
                            <div className="flex items-center gap-2 text-sm">
                              {getStatusIcon(researchStep.status)}
                              <span className="text-muted-foreground">{getStepLabel(researchStep.type)}</span>
                            </div>
                          )}
                          {contentStep && (
                            <div className="flex items-center gap-2 text-sm">
                              {getStatusIcon(contentStep.status)}
                              <span className="text-muted-foreground">{getStepLabel(contentStep.type)}</span>
                            </div>
                          )}
                        </div>
                        <div className="pt-2 text-xs text-muted-foreground">
                          Created {new Date(campaign.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* URL Research Tab */}
        <TabsContent value="research">
          <URLResearch 
            onUseForCampaign={handleUseURLForCampaign}
            onUseForRepurposing={handleUseURLForRepurposing}
          />
        </TabsContent>

        {/* Content Repurposer Tab */}
        <TabsContent value="repurposer">
          <ContentRepurposer />
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <TemplateLibrary onSelectTemplate={handleSelectTemplate} />
        </TabsContent>

        {/* Viral Analyzer Tab */}
        <TabsContent value="analyzer">
          <ViralAnalyzer />
        </TabsContent>

        {/* Content Calendar Tab */}
        <TabsContent value="calendar">
          <ContentCalendar />
        </TabsContent>
      </Tabs>
    </div>
  );
}
