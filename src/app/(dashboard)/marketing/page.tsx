"use client";

import { useState } from "react";
import { Plus, Rocket, FileText, BarChart3, Loader2, CheckCircle, XCircle, Clock, Sparkles } from "lucide-react";
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
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  useMarketingCampaigns,
  createMarketingCampaign,
  type MarketingCampaign,
} from "@/client-lib/api-client";

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

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Rocket className="h-8 w-8 text-primary" />
            Marketing Automation
          </h1>
          <p className="mt-1 text-muted-foreground">
            Create and manage AI-powered marketing campaigns
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create Marketing Campaign</DialogTitle>
              <DialogDescription>
                Launch an AI-powered campaign with automated research, content creation, and analytics
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Campaign Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g., Q1 Product Launch"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="topic">
                  Topic <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="topic"
                  placeholder="e.g., AI-powered business automation tools"
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetAudience">Target Audience</Label>
                <Input
                  id="targetAudience"
                  placeholder="e.g., SaaS founders, marketing managers"
                  value={formData.targetAudience}
                  onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="goal">Campaign Goal</Label>
                <Input
                  id="goal"
                  placeholder="e.g., Generate leads, increase brand awareness"
                  value={formData.goal}
                  onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="brandVoice">Brand Voice</Label>
                <Textarea
                  id="brandVoice"
                  placeholder="e.g., Professional yet friendly, focused on innovation and efficiency"
                  value={formData.brandVoice}
                  onChange={(e) => setFormData({ ...formData, brandVoice: e.target.value })}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={creating}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Create Campaign
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

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
            <Button onClick={() => setDialogOpen(true)}>
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
            const totalSteps = 2; // research + content (analytics coming soon)

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
                    {/* Progress */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Progress</span>
                        <span>
                          {completedSteps}/{totalSteps} steps
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Steps */}
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

                    {/* Metadata */}
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
    </div>
  );
}
