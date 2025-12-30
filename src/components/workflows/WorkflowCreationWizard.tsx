"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Workflow,
  ArrowRight,
  ArrowLeft,
  Check,
  Zap,
  Settings,
  Play,
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
import { createWorkflow } from "@/client-lib/workflows-client";
import { toast } from "sonner";

// Form validation schemas
const basicInfoSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().optional(),
  category: z.string().default("automation"),
});

const triggerSchema = z.object({
  triggerType: z.string().min(1, "Trigger type is required"),
  triggerConfig: z.object({}).optional(),
});

const actionsSchema = z.object({
  actions: z
    .array(
      z.object({
        actionType: z.string(),
        actionConfig: z.object({}).optional(),
        order: z.number(),
      }),
    )
    .min(1, "At least one action is required"),
});

const combinedSchema = basicInfoSchema
  .merge(triggerSchema)
  .merge(actionsSchema);

type FormData = z.infer<typeof combinedSchema>;

interface WorkflowCreationWizardProps {
  onComplete: () => void;
  initialData?: Partial<FormData>;
}

const steps = [
  {
    id: "basic",
    title: "Basic Info",
    icon: Workflow,
    description: "Name and describe your workflow",
  },
  {
    id: "trigger",
    title: "Trigger Setup",
    icon: Play,
    description: "When should this workflow run?",
  },
  {
    id: "actions",
    title: "Actions",
    icon: Settings,
    description: "What should happen when triggered?",
  },
  {
    id: "review",
    title: "Review & Create",
    icon: Check,
    description: "Review and create your workflow",
  },
];

const triggerOptions = [
  {
    value: "lead_created",
    label: "New Lead Created",
    description: "When a new lead is added to the system",
  },
  {
    value: "lead_status_changed",
    label: "Lead Status Changed",
    description: "When a lead's status is updated",
  },
  {
    value: "email_opened",
    label: "Email Opened",
    description: "When a lead opens an email",
  },
  {
    value: "email_clicked",
    label: "Email Link Clicked",
    description: "When a lead clicks a link in an email",
  },
  {
    value: "form_submitted",
    label: "Form Submitted",
    description: "When a form is submitted on your website",
  },
  {
    value: "appointment_scheduled",
    label: "Appointment Scheduled",
    description: "When a new appointment is booked",
  },
  {
    value: "time_based",
    label: "Time-Based",
    description: "Run on a schedule (daily, weekly, etc.)",
  },
  {
    value: "webhook",
    label: "Webhook",
    description: "Triggered by external webhook",
  },
];

const actionOptions = [
  {
    value: "send_email",
    label: "Send Email",
    description: "Send an email to the lead",
  },
  {
    value: "update_lead",
    label: "Update Lead",
    description: "Update lead information or status",
  },
  {
    value: "create_task",
    label: "Create Task",
    description: "Create a task for team members",
  },
  {
    value: "call_webhook",
    label: "Call Webhook",
    description: "Send data to external service",
  },
  {
    value: "run_ai_agent",
    label: "Run AI Agent",
    description: "Execute an AI agent with specific prompt",
  },
  {
    value: "wait",
    label: "Wait/Delay",
    description: "Pause workflow for specified time",
  },
  {
    value: "condition",
    label: "Conditional Logic",
    description: "Branch workflow based on conditions",
  },
];

export function WorkflowCreationWizard({
  onComplete,
}: WorkflowCreationWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actions, setActions] = useState<
    Array<{ actionType: string; actionConfig?: any; order: number }>
  >([]);

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
      category: "automation",
      triggerType: "",
      actions: [],
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

  const addAction = (actionType: string) => {
    const newAction = {
      actionType,
      order: actions.length,
    };
    const updatedActions = [...actions, newAction];
    setActions(updatedActions);
    setValue("actions", updatedActions);
  };

  const removeAction = (index: number) => {
    const updatedActions = actions.filter((_, i) => i !== index);
    setActions(updatedActions);
    setValue("actions", updatedActions);
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      await createWorkflow({
        name: data.name,
        description: data.description,
        status: "draft",
        triggerType: data.triggerType,
        triggerConfig: data.triggerConfig || {},
        actions: data.actions as any,
      });

      onComplete();
    } catch (error) {
      console.error("Failed to create workflow:", error);
      toast.error("Failed to create workflow. Please try again.");
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
              <Label htmlFor="name">Workflow Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Welcome Email Sequence"
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
                placeholder="Describe what this workflow does..."
                rows={3}
                {...register("description")}
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
                  <SelectItem value="automation">Automation</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                  <SelectItem value="onboarding">Onboarding</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 1: // Trigger Setup
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Trigger Type</Label>
              <div className="grid gap-3">
                {triggerOptions.map((trigger) => (
                  <div
                    key={trigger.value}
                    className={`cursor-pointer rounded-lg border p-4 transition-all ${watchedValues.triggerType === trigger.value
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                      }`}
                    onClick={() => setValue("triggerType", trigger.value)}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        checked={watchedValues.triggerType === trigger.value}
                        onChange={() => setValue("triggerType", trigger.value)}
                        className="text-primary"
                      />
                      <div>
                        <h4 className="font-medium">{trigger.label}</h4>
                        <p className="text-sm text-muted-foreground">
                          {trigger.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {errors.triggerType && (
                <p className="text-sm text-destructive">
                  {errors.triggerType.message}
                </p>
              )}
            </div>
          </div>
        );

      case 2: // Actions
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <Label>Workflow Actions</Label>

              {/* Existing Actions */}
              {actions.map((action, index) => (
                <Card key={index}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Badge variant="outline">
                          {
                            actionOptions.find(
                              (a) => a.value === action.actionType,
                            )?.label
                          }
                        </Badge>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {
                            actionOptions.find(
                              (a) => a.value === action.actionType,
                            )?.description
                          }
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAction(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Add Action */}
              <Card className="border-dashed">
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    <Label>Add Action</Label>
                    <div className="grid gap-2">
                      {actionOptions.map((action) => (
                        <Button
                          key={action.value}
                          variant="outline"
                          className="h-auto justify-start p-3"
                          onClick={() => addAction(action.value)}
                        >
                          <div className="text-left">
                            <div className="font-medium">{action.label}</div>
                            <div className="text-xs text-muted-foreground">
                              {action.description}
                            </div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {errors.actions && (
                <p className="text-sm text-destructive">
                  {errors.actions.message}
                </p>
              )}
            </div>
          </div>
        );

      case 3: // Review
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Workflow className="h-5 w-5" />
                  {watchedValues.name}
                </CardTitle>
                <CardDescription>{watchedValues.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Badge variant="outline">{watchedValues.category}</Badge>
                </div>

                <Separator />

                <div>
                  <h4 className="mb-2 font-medium">Trigger</h4>
                  <p className="text-sm text-muted-foreground">
                    {
                      triggerOptions.find(
                        (t) => t.value === watchedValues.triggerType,
                      )?.label
                    }
                  </p>
                </div>

                <Separator />

                <div>
                  <h4 className="mb-2 font-medium">
                    Actions ({actions.length})
                  </h4>
                  <div className="space-y-2">
                    {actions.map((action, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 text-sm"
                      >
                        <span className="text-muted-foreground">
                          {index + 1}.
                        </span>
                        <span>
                          {
                            actionOptions.find(
                              (a) => a.value === action.actionType,
                            )?.label
                          }
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Note:</strong> Your workflow will be created in draft
                mode. You can activate it after reviewing the configuration.
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
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${index <= currentStep
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
                className={`mx-2 h-0.5 w-12 ${index < currentStep ? "bg-primary" : "bg-muted"
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
                Create Workflow
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
