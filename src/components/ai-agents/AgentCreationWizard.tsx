"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Bot,
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
  Settings,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { createUserAIAgent } from "@/client-lib/user-ai-agents-client";
import { toast } from "sonner";

// Form validation schemas
const basicInfoSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().optional(),
  icon: z.string().optional(),
  category: z.string().default("custom"),
});

const promptSchema = z.object({
  systemPrompt: z
    .string()
    .min(10, "System prompt must be at least 10 characters"),
});

const modelSchema = z.object({
  provider: z.string().min(1, "Provider is required"),
  model: z.string().min(1, "Model is required"),
  costTier: z.enum(["free", "low", "medium", "high"]).default("medium"),
  isPublic: z.boolean().default(false),
});

const combinedSchema = basicInfoSchema.merge(promptSchema).merge(modelSchema);

type FormData = z.infer<typeof combinedSchema>;

interface AgentCreationWizardProps {
  onComplete: () => void;
}

const steps = [
  {
    id: "basic",
    title: "Basic Info",
    icon: Bot,
    description: "Name and describe your agent",
  },
  {
    id: "prompt",
    title: "System Prompt",
    icon: Sparkles,
    description: "Define your agent's personality and capabilities",
  },
  {
    id: "model",
    title: "Model Settings",
    icon: Settings,
    description: "Choose AI provider and configuration",
  },
  {
    id: "review",
    title: "Review & Create",
    icon: Check,
    description: "Review and create your agent",
  },
];

const modelOptions = {
  ollama: [
    {
      value: "mistral:latest",
      label: "Mistral 7B",
      description: "Fast and capable general-purpose model",
    },
    {
      value: "llama3.1:8b",
      label: "Llama 3.1 8B",
      description: "Meta's latest open-source model",
    },
    {
      value: "codellama:7b",
      label: "CodeLlama 7B",
      description: "Specialized for code generation",
    },
  ],
  google: [
    {
      value: "gemini-pro",
      label: "Gemini Pro",
      description: "Google's advanced multimodal model",
    },
    {
      value: "gemini-2.0-flash",
      label: "Gemini 2.0 Flash",
      description: "Fast and efficient for most tasks",
    },
  ],
  anthropic: [
    {
      value: "claude-3-5-sonnet-20241022",
      label: "Claude 3.5 Sonnet",
      description: "Anthropic's most capable model",
    },
  ],
  openai: [
    {
      value: "gpt-4-turbo",
      label: "GPT-4 Turbo",
      description: "OpenAI's latest powerful model",
    },
    {
      value: "gpt-3.5-turbo",
      label: "GPT-3.5 Turbo",
      description: "Fast and cost-effective",
    },
  ],
  openrouter: [
    {
      value: "anthropic/claude-3.5-sonnet",
      label: "Claude 3.5 Sonnet (via OpenRouter)",
      description: "Access Claude through OpenRouter",
    },
    {
      value: "openai/gpt-4-turbo",
      label: "GPT-4 Turbo (via OpenRouter)",
      description: "Access GPT-4 through OpenRouter",
    },
  ],
};

const categoryOptions = [
  { value: "custom", label: "Custom", description: "General-purpose agent" },
  {
    value: "web-development",
    label: "Web Development",
    description: "Code and development tasks",
  },
  {
    value: "analytics",
    label: "Analytics",
    description: "Data analysis and insights",
  },
  {
    value: "content-creation",
    label: "Content Creation",
    description: "Writing and content generation",
  },
  {
    value: "marketing",
    label: "Marketing",
    description: "Marketing and advertising",
  },
  {
    value: "social-media",
    label: "Social Media",
    description: "Social media management",
  },
  { value: "seo", label: "SEO", description: "Search engine optimization" },
];

export function AgentCreationWizard({ onComplete }: AgentCreationWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(combinedSchema),
    defaultValues: {
      name: "",
      description: "",
      icon: "🤖",
      category: "custom",
      systemPrompt: "",
      provider: "ollama",
      model: "mistral:latest",
      costTier: "medium",
      isPublic: false,
    },
  });

  const watchedValues = watch();

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      await createUserAIAgent({
        name: data.name,
        description: data.description,
        icon: data.icon,
        category: data.category,
        systemPrompt: data.systemPrompt,
        model: data.model,
        provider: data.provider,
        costTier: data.costTier,
        isPublic: data.isPublic,
      });

      onComplete();
    } catch (error) {
      console.error("Failed to create agent:", error);
      toast.error("Failed to create agent. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Basic Info
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Agent Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Marketing Assistant"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what your agent does..."
                rows={3}
                {...register("description")}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="icon">Icon</Label>
                <Input
                  id="icon"
                  placeholder="🤖"
                  {...register("icon")}
                  maxLength={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={watchedValues.category}
                  onValueChange={(value) => setValue("category", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case 1: // System Prompt
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="systemPrompt">System Prompt *</Label>
              <Textarea
                id="systemPrompt"
                placeholder="You are a helpful AI assistant that specializes in..."
                rows={8}
                {...register("systemPrompt")}
              />
              {errors.systemPrompt && (
                <p className="text-sm text-destructive">
                  {errors.systemPrompt.message}
                </p>
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Prompt Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>• Be specific about the agent's role and capabilities</p>
                <p>• Define the tone and communication style</p>
                <p>• Include relevant context and background knowledge</p>
                <p>• Specify any constraints or limitations</p>
              </CardContent>
            </Card>
          </div>
        );

      case 2: // Model Settings
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>AI Provider</Label>
              <Select
                value={watchedValues.provider}
                onValueChange={(value) => {
                  setValue("provider", value);
                  // Reset model when provider changes
                  const defaultModel =
                    modelOptions[value as keyof typeof modelOptions]?.[0]
                      ?.value || "";
                  setValue("model", defaultModel);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ollama">Ollama (Local)</SelectItem>
                  <SelectItem value="google">Google Gemini</SelectItem>
                  <SelectItem value="anthropic">Anthropic Claude</SelectItem>
                  <SelectItem value="openai">OpenAI GPT</SelectItem>
                  <SelectItem value="openrouter">
                    OpenRouter (Multi-provider)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Model</Label>
              <Select
                value={watchedValues.model}
                onValueChange={(value) => setValue("model", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {modelOptions[
                    watchedValues.provider as keyof typeof modelOptions
                  ]?.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{model.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {model.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cost Tier</Label>
              <Select
                value={watchedValues.costTier}
                onValueChange={(value: "free" | "low" | "medium" | "high") =>
                  setValue("costTier", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free - Local models only</SelectItem>
                  <SelectItem value="low">
                    Low - Budget-friendly APIs
                  </SelectItem>
                  <SelectItem value="medium">
                    Medium - Balanced performance
                  </SelectItem>
                  <SelectItem value="high">
                    High - Maximum capabilities
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isPublic"
                {...register("isPublic")}
                className="rounded border-gray-300"
              />
              <Label htmlFor="isPublic" className="text-sm">
                Make this agent public (shareable with team)
              </Label>
            </div>
          </div>
        );

      case 3: // Review
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {watchedValues.icon} {watchedValues.name}
                </CardTitle>
                <CardDescription>{watchedValues.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Badge variant="outline">{watchedValues.category}</Badge>
                </div>

                <Separator />

                <div>
                  <h4 className="mb-2 font-medium">System Prompt</h4>
                  <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                    {watchedValues.systemPrompt}
                  </p>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Provider:</span>{" "}
                    {watchedValues.provider}
                  </div>
                  <div>
                    <span className="font-medium">Model:</span>{" "}
                    {watchedValues.model}
                  </div>
                  <div>
                    <span className="font-medium">Cost Tier:</span>{" "}
                    {watchedValues.costTier}
                  </div>
                  <div>
                    <span className="font-medium">Visibility:</span>{" "}
                    {watchedValues.isPublic ? "Public" : "Private"}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Note:</strong> You can modify these settings later.
                Click "Create Agent" to proceed with the current configuration.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                index <= currentStep
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {index < currentStep ? (
                <Check className="h-4 w-4" />
              ) : (
                <step.icon className="h-4 w-4" />
              )}
            </div>
            {index < steps.length - 1 && (
              <div
                className={`mx-2 h-0.5 w-12 ${
                  index < currentStep ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Title */}
      <div>
        <h2 className="text-xl font-semibold">{steps[currentStep].title}</h2>
        <p className="text-muted-foreground">
          {steps[currentStep].description}
        </p>
      </div>

      {/* Step Content */}
      {renderStepContent()}

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>

        {currentStep === steps.length - 1 ? (
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-current" />
                Creating...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Create Agent
              </>
            )}
          </Button>
        ) : (
          <Button type="button" onClick={nextStep}>
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </form>
  );
}
