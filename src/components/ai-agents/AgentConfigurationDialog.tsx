"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Bot, Save, X } from "lucide-react";
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
import { updateUserAIAgent } from "@/client-lib/user-ai-agents-client";
import { toast } from "sonner";

const updateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  category: z.string().optional(),
  systemPrompt: z
    .string()
    .min(10, "System prompt must be at least 10 characters")
    .optional(),
  model: z.string().optional(),
  provider: z.string().optional(),
  costTier: z.enum(["free", "low", "medium", "high"]).optional(),
  isActive: z.boolean().optional(),
  isPublic: z.boolean().optional(),
});

type UpdateFormData = z.infer<typeof updateSchema>;

interface AgentConfigurationDialogProps {
  agent: any; // UserAIAgent type
  onComplete: () => void;
}

const modelOptions = {
  ollama: [
    { value: "mistral:latest", label: "Mistral 7B" },
    { value: "llama3.1:8b", label: "Llama 3.1 8B" },
    { value: "codellama:7b", label: "CodeLlama 7B" },
  ],
  google: [
    { value: "gemini-pro", label: "Gemini Pro" },
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  ],
  anthropic: [
    { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
  ],
  openai: [
    { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
    { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
  ],
  openrouter: [
    { value: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet" },
    { value: "openai/gpt-4-turbo", label: "GPT-4 Turbo" },
  ],
};

const categoryOptions = [
  { value: "custom", label: "Custom" },
  { value: "web-development", label: "Web Development" },
  { value: "analytics", label: "Analytics" },
  { value: "content-creation", label: "Content Creation" },
  { value: "marketing", label: "Marketing" },
  { value: "social-media", label: "Social Media" },
  { value: "seo", label: "SEO" },
];

export function AgentConfigurationDialog({
  agent,
  onComplete,
}: AgentConfigurationDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UpdateFormData>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      name: agent.name,
      description: agent.description || "",
      icon: agent.icon,
      category: agent.category,
      systemPrompt: agent.system_prompt,
      provider: agent.provider,
      model: agent.model,
      costTier: agent.cost_tier,
      isActive: agent.is_active,
      isPublic: agent.is_public,
    },
  });

  const watchedValues = watch();

  const onSubmit = async (data: UpdateFormData) => {
    setIsSubmitting(true);
    try {
      await updateUserAIAgent(agent.id, data);
      onComplete();
    } catch (error) {
      console.error("Failed to update agent:", error);
      toast.error("Failed to update agent. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 border-b pb-4">
        <div className="text-2xl">{agent.icon}</div>
        <div>
          <h2 className="text-xl font-semibold">Configure {agent.name}</h2>
          <p className="text-muted-foreground">
            Modify your AI agent&apos;s settings
          </p>
        </div>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Basic Information</CardTitle>
          <CardDescription>
            Name, description, and categorization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Agent Name *</Label>
              <Input id="name" {...register("name")} />
              {errors.name && (
                <p className="text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="icon">Icon</Label>
              <Input id="icon" {...register("icon")} maxLength={2} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={2} {...register("description")} />
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
        </CardContent>
      </Card>

      {/* System Prompt */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">System Prompt</CardTitle>
          <CardDescription>
            Define your agent&apos;s personality and capabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Textarea rows={6} {...register("systemPrompt")} />
            {errors.systemPrompt && (
              <p className="text-sm text-destructive">
                {errors.systemPrompt.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Model Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Model Configuration</CardTitle>
          <CardDescription>
            Choose AI provider and model settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>AI Provider</Label>
              <Select
                value={watchedValues.provider}
                onValueChange={(value) => {
                  setValue("provider", value);
                  // Reset model when provider changes
                  const defaultModel =
                    modelOptions[value as keyof typeof modelOptions]?.[0]
                      ?.value;
                  if (defaultModel) setValue("model", defaultModel);
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
                  <SelectItem value="openrouter">OpenRouter</SelectItem>
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
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
                <SelectItem value="low">Low - Budget-friendly APIs</SelectItem>
                <SelectItem value="medium">
                  Medium - Balanced performance
                </SelectItem>
                <SelectItem value="high">
                  High - Maximum capabilities
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Settings</CardTitle>
          <CardDescription>Privacy and availability settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isActive"
              {...register("isActive")}
              className="rounded border-gray-300"
            />
            <Label htmlFor="isActive" className="text-sm">
              Agent is active and available for use
            </Label>
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
        </CardContent>
      </Card>

      {/* Usage Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Usage Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{agent.usage_count}</div>
              <div className="text-sm text-muted-foreground">Total Uses</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {agent.last_used_at
                  ? new Date(agent.last_used_at).toLocaleDateString()
                  : "Never"}
              </div>
              <div className="text-sm text-muted-foreground">Last Used</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{agent.cost_tier}</div>
              <div className="text-sm text-muted-foreground">Cost Tier</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3 border-t pt-6">
        <Button type="button" variant="outline" onClick={onComplete}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-current" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
