"use client";

import { useState } from "react";
import { 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle, 
  Rocket,
  Target,
  Users,
  MessageSquare,
  Sparkles,
  Loader2,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import type { Template } from "./TemplateLibrary";

interface CampaignWizardProps {
  initialTemplate?: Template | null;
  onComplete: (data: CampaignData) => void;
  onCancel: () => void;
}

interface CampaignData {
  name: string;
  topic: string;
  targetAudience: string;
  goal: string;
  brandVoice: string;
  keyMessages: string[];
  platforms: string[];
}

const steps = [
  {
    id: "intro",
    title: "Welcome",
    description: "Let's create your marketing campaign",
    icon: <Rocket className="h-5 w-5" />,
  },
  {
    id: "topic",
    title: "What are you promoting?",
    description: "Tell us about your campaign topic",
    icon: <Lightbulb className="h-5 w-5" />,
  },
  {
    id: "audience",
    title: "Who is your audience?",
    description: "Define your target audience",
    icon: <Users className="h-5 w-5" />,
  },
  {
    id: "goal",
    title: "What's your goal?",
    description: "Set your campaign objectives",
    icon: <Target className="h-5 w-5" />,
  },
  {
    id: "voice",
    title: "How should we sound?",
    description: "Define your brand voice",
    icon: <MessageSquare className="h-5 w-5" />,
  },
  {
    id: "review",
    title: "Review & Launch",
    description: "Confirm and start your campaign",
    icon: <Sparkles className="h-5 w-5" />,
  },
];

const brandVoiceOptions = [
  { value: "professional", label: "Professional", description: "Formal, authoritative, business-focused" },
  { value: "friendly", label: "Friendly", description: "Warm, approachable, conversational" },
  { value: "casual", label: "Casual", description: "Relaxed, informal, like talking to a friend" },
  { value: "enthusiastic", label: "Enthusiastic", description: "Energetic, exciting, passionate" },
  { value: "expert", label: "Expert", description: "Knowledgeable, insightful, thought-leading" },
];

const platformOptions = [
  { id: "linkedin", label: "LinkedIn", description: "B2B, professional networking" },
  { id: "twitter", label: "Twitter/X", description: "Real-time updates, discussions" },
  { id: "instagram", label: "Instagram", description: "Visual content, younger audience" },
  { id: "facebook", label: "Facebook", description: "Community, broader demographics" },
  { id: "email", label: "Email", description: "Direct communication, newsletters" },
  { id: "blog", label: "Blog", description: "Long-form content, SEO" },
];

export function CampaignWizard({ initialTemplate, onComplete, onCancel }: CampaignWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [data, setData] = useState<CampaignData>({
    name: initialTemplate?.presetData.name || "",
    topic: initialTemplate?.presetData.topic || "",
    targetAudience: initialTemplate?.presetData.targetAudience || "",
    goal: initialTemplate?.presetData.goal || "",
    brandVoice: initialTemplate?.presetData.brandVoice || "",
    keyMessages: [],
    platforms: [],
  });

  const progress = ((currentStep + 1) / steps.length) * 100;

  const updateData = (field: keyof CampaignData, value: any) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const togglePlatform = (platform: string) => {
    setData((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform],
    }));
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onComplete(data);
      toast.success("Campaign created successfully!");
    } catch (error) {
      toast.error("Failed to create campaign");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return true;
      case 1:
        return data.name.trim() && data.topic.trim();
      case 2:
        return data.targetAudience.trim();
      case 3:
        return data.goal.trim();
      case 4:
        return data.brandVoice.trim() && data.platforms.length > 0;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <Rocket className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h3 className="text-2xl font-bold">Create Your Marketing Campaign</h3>
              <p className="mt-2 text-muted-foreground">
                This wizard will guide you through creating an AI-powered marketing campaign in just a few steps.
              </p>
            </div>
            {initialTemplate && (
              <div className="rounded-lg bg-primary/5 p-4">
                <p className="text-sm font-medium">Using template:</p>
                <p className="text-lg font-semibold text-primary">{initialTemplate.name}</p>
              </div>
            )}
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="rounded-lg bg-muted p-3">
                <p className="font-semibold">1. Research</p>
                <p className="text-muted-foreground">AI analyzes your topic</p>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <p className="font-semibold">2. Create</p>
                <p className="text-muted-foreground">Generate content</p>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <p className="font-semibold">3. Launch</p>
                <p className="text-muted-foreground">Ready to publish</p>
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Campaign Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g., Q1 Product Launch"
                value={data.name}
                onChange={(e) => updateData("name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="topic">
                What are you promoting? <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="topic"
                placeholder="Describe your product, service, or topic..."
                value={data.topic}
                onChange={(e) => updateData("topic", e.target.value)}
                rows={4}
              />
            </div>
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm font-medium mb-2">💡 Tips:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Be specific about what you're offering</li>
                <li>• Include key benefits or unique features</li>
                <li>• Mention any special offers or deadlines</li>
              </ul>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="audience">
                Who is your target audience? <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="audience"
                placeholder="e.g., Small business owners, marketing managers, tech startups..."
                value={data.targetAudience}
                onChange={(e) => updateData("targetAudience", e.target.value)}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {["Small Business Owners", "Marketing Managers", "Tech Startups", "Enterprise", "Consumers", "B2B Decision Makers"].map((audience) => (
                <Button
                  key={audience}
                  variant="outline"
                  size="sm"
                  onClick={() => updateData("targetAudience", audience)}
                  className="justify-start"
                >
                  {audience}
                </Button>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="goal">
                What's your main goal? <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="goal"
                placeholder="e.g., Generate 100 leads, increase brand awareness, drive sales..."
                value={data.goal}
                onChange={(e) => updateData("goal", e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Common Goals:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  "Generate leads",
                  "Increase brand awareness",
                  "Drive sales",
                  "Build community",
                  "Educate audience",
                  "Launch product",
                ].map((goal) => (
                  <Badge
                    key={goal}
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                    onClick={() => updateData("goal", goal)}
                  >
                    {goal}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Choose your brand voice:</Label>
              <div className="grid gap-3">
                {brandVoiceOptions.map((voice) => (
                  <div
                    key={voice.value}
                    onClick={() => updateData("brandVoice", voice.label + " - " + voice.description)}
                    className={`cursor-pointer rounded-lg border p-4 transition-all hover:border-primary ${
                      data.brandVoice.includes(voice.label)
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{voice.label}</p>
                        <p className="text-sm text-muted-foreground">{voice.description}</p>
                      </div>
                      {data.brandVoice.includes(voice.label) && (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Select platforms to publish on:</Label>
              <div className="grid gap-3 md:grid-cols-2">
                {platformOptions.map((platform) => (
                  <div
                    key={platform.id}
                    onClick={() => togglePlatform(platform.id)}
                    className={`cursor-pointer rounded-lg border p-3 transition-all hover:border-primary ${
                      data.platforms.includes(platform.id)
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{platform.label}</p>
                        <p className="text-xs text-muted-foreground">{platform.description}</p>
                      </div>
                      {data.platforms.includes(platform.id) && (
                        <CheckCircle className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div className="rounded-lg bg-primary/5 p-4 text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-primary mb-2" />
              <h3 className="text-lg font-semibold">Ready to Launch!</h3>
              <p className="text-sm text-muted-foreground">Review your campaign details below</p>
            </div>
            <div className="space-y-3 rounded-lg bg-muted p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Campaign Name</p>
                  <p className="font-medium">{data.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Goal</p>
                  <p className="font-medium">{data.goal}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Topic</p>
                  <p className="font-medium">{data.topic}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Target Audience</p>
                  <p className="font-medium">{data.targetAudience}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Brand Voice</p>
                  <p className="font-medium">{data.brandVoice.split(" - ")[0]}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Platforms</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {data.platforms.map((p) => (
                      <Badge key={p} variant="secondary" className="text-xs">
                        {platformOptions.find((po) => po.id === p)?.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Our AI will research your topic, create optimized content, and prepare everything for publishing.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline">
            Step {currentStep + 1} of {steps.length}
          </Badge>
          <span className="text-sm text-muted-foreground">{steps[currentStep].title}</span>
        </div>
        <Progress value={progress} className="h-2" />
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              {steps[currentStep].icon}
            </div>
            <div>
              <CardTitle className="text-lg">{steps[currentStep].title}</CardTitle>
              <CardDescription>{steps[currentStep].description}</CardDescription>
            </div>
          </div>
        </div>
        {renderStepContent()}
      </CardContent>
      <div className="flex items-center justify-between p-6 pt-0">
        <Button
          variant="outline"
          onClick={currentStep === 0 ? onCancel : handleBack}
          disabled={isSubmitting}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          {currentStep === 0 ? "Cancel" : "Back"}
        </Button>
        {currentStep === steps.length - 1 ? (
          <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-2">
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Launch Campaign
              </>
            )}
          </Button>
        ) : (
          <Button onClick={handleNext} disabled={!canProceed()} className="gap-2">
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Card>
  );
}

export type { CampaignData };
