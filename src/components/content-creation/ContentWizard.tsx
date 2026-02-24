"use client";

import { useState } from "react";
import { 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle, 
  Sparkles,
  FileText,
  Target,
  Users,
  MessageSquare,
  Wand2,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ContentWizardProps {
  onComplete: (data: WizardData) => void;
  onCancel: () => void;
}

export interface WizardData {
  contentType: string;
  topic: string;
  goal: string;
  audience: string;
  tone: string;
  length: string;
  keywords: string;
  keyPoints: string;
}

const steps = [
  { id: 1, title: "Content Type", icon: FileText },
  { id: 2, title: "Topic & Goal", icon: Target },
  { id: 3, title: "Audience", icon: Users },
  { id: 4, title: "Style & Tone", icon: MessageSquare },
  { id: 5, title: "Key Points", icon: Sparkles },
  { id: 6, title: "Review", icon: CheckCircle },
];

const contentTypes = [
  { id: "blog-post", label: "Blog Post", description: "Long-form article" },
  { id: "email", label: "Email", description: "Newsletter or campaign" },
  { id: "social", label: "Social Post", description: "Social media content" },
  { id: "ad-copy", label: "Ad Copy", description: "Advertising copy" },
  { id: "landing-page", label: "Landing Page", description: "Sales page content" },
  { id: "case-study", label: "Case Study", description: "Success story" },
];

const tones = [
  { value: "professional", label: "Professional", description: "Formal and business-like" },
  { value: "casual", label: "Casual", description: "Relaxed and conversational" },
  { value: "friendly", label: "Friendly", description: "Warm and approachable" },
  { value: "authoritative", label: "Authoritative", description: "Expert and confident" },
  { value: "humorous", label: "Humorous", description: "Fun and entertaining" },
  { value: "inspirational", label: "Inspirational", description: "Motivating and uplifting" },
];

export function ContentWizard({ onComplete, onCancel }: ContentWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<WizardData>({
    contentType: "",
    topic: "",
    goal: "",
    audience: "",
    tone: "professional",
    length: "medium",
    keywords: "",
    keyPoints: "",
  });

  const updateData = (field: keyof WizardData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    onComplete(data);
    toast.success("Content configuration complete!");
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return !!data.contentType;
      case 2:
        return !!data.topic && !!data.goal;
      case 3:
        return !!data.audience;
      case 4:
        return !!data.tone && !!data.length;
      case 5:
        return true;
      case 6:
        return true;
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold">What type of content do you want to create?</h3>
              <p className="text-sm text-muted-foreground">Select the format that best fits your needs</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {contentTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => updateData("contentType", type.id)}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    data.contentType === type.id
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <p className="font-medium">{type.label}</p>
                  <p className="text-xs text-muted-foreground">{type.description}</p>
                </button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold">What is your content about?</h3>
              <p className="text-sm text-muted-foreground">Define your topic and objective</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Topic / Subject *</Label>
                <Input
                  placeholder="e.g., Digital Marketing Trends 2026"
                  value={data.topic}
                  onChange={(e) => updateData("topic", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Content Goal *</Label>
                <Select value={data.goal} onValueChange={(value) => updateData("goal", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a goal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="educate">Educate the audience</SelectItem>
                    <SelectItem value="entertain">Entertain and engage</SelectItem>
                    <SelectItem value="convert">Drive conversions</SelectItem>
                    <SelectItem value="awareness">Build brand awareness</SelectItem>
                    <SelectItem value="authority">Establish authority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold">Who is your target audience?</h3>
              <p className="text-sm text-muted-foreground">Help us tailor the content to your readers</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Target Audience *</Label>
                <Textarea
                  placeholder="Describe your ideal reader: demographics, interests, pain points, goals..."
                  value={data.audience}
                  onChange={(e) => updateData("audience", e.target.value)}
                  className="min-h-[120px]"
                />
              </div>
              <div className="space-y-2">
                <Label>SEO Keywords (optional)</Label>
                <Input
                  placeholder="marketing, trends, 2026, digital"
                  value={data.keywords}
                  onChange={(e) => updateData("keywords", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Comma-separated keywords to include</p>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold">How should it sound?</h3>
              <p className="text-sm text-muted-foreground">Choose the style and length</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tone of Voice</Label>
                <div className="grid grid-cols-2 gap-3">
                  {tones.map((tone) => (
                    <button
                      key={tone.value}
                      onClick={() => updateData("tone", tone.value)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        data.tone === tone.value
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <p className="font-medium text-sm">{tone.label}</p>
                      <p className="text-xs text-muted-foreground">{tone.description}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Content Length</Label>
                <Select value={data.length} onValueChange={(value) => updateData("length", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short (300-500 words)</SelectItem>
                    <SelectItem value="medium">Medium (800-1200 words)</SelectItem>
                    <SelectItem value="long">Long (1500+ words)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold">What are the key points?</h3>
              <p className="text-sm text-muted-foreground">Add any specific points you want to cover</p>
            </div>
            <div className="space-y-2">
              <Label>Key Points to Include (optional)</Label>
              <Textarea
                placeholder="1. Main benefit or insight&#10;2. Supporting evidence or example&#10;3. Call-to-action or next step&#10;..."
                value={data.keyPoints}
                onChange={(e) => updateData("keyPoints", e.target.value)}
                className="min-h-[200px]"
              />
              <p className="text-xs text-muted-foreground">Bullet points or numbered list of must-include content</p>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold">Review your content brief</h3>
              <p className="text-sm text-muted-foreground">Everything looks good? Let&apos;s create!</p>
            </div>
            <div className="space-y-3 p-4 rounded-lg bg-muted/50">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Content Type</span>
                <Badge>{contentTypes.find(t => t.id === data.contentType)?.label}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Topic</span>
                <span className="font-medium">{data.topic}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Goal</span>
                <Badge variant="outline">{data.goal}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tone</span>
                <span className="capitalize">{data.tone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Length</span>
                <span className="capitalize">{data.length}</span>
              </div>
              {data.keywords && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Keywords</span>
                  <span className="text-sm">{data.keywords}</span>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Content Creation Wizard
          </CardTitle>
          <Badge variant="outline">
            Step {currentStep} of {steps.length}
          </Badge>
        </div>
        <Progress value={(currentStep / steps.length) * 100} className="h-2" />
        <div className="flex justify-between mt-4">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = index + 1 === currentStep;
            const isCompleted = index + 1 < currentStep;
            
            return (
              <div
                key={step.id}
                className={`flex flex-col items-center gap-1 ${
                  isActive ? "text-primary" : isCompleted ? "text-green-500" : "text-muted-foreground"
                }`}
              >
                <div className={`p-2 rounded-full ${
                  isActive ? "bg-primary/10" : isCompleted ? "bg-green-500/10" : "bg-muted"
                }`}>
                  <StepIcon className="h-4 w-4" />
                </div>
                <span className="text-xs hidden sm:block">{step.title}</span>
              </div>
            );
          })}
        </div>
      </CardHeader>
      <CardContent>
        {renderStep()}
      </CardContent>
      <div className="p-6 pt-0 flex justify-between">
        <Button
          variant="outline"
          onClick={currentStep === 1 ? onCancel : handleBack}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          {currentStep === 1 ? "Cancel" : "Back"}
        </Button>
        <Button
          onClick={currentStep === steps.length ? handleComplete : handleNext}
          disabled={!canProceed()}
        >
          {currentStep === steps.length ? (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Content
            </>
          ) : (
            <>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}
