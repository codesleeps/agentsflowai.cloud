"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Workflow, Save, X, Play, Pause, Eye } from "lucide-react";
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
import { updateWorkflow } from "@/client-lib/workflows-client";
import { toast } from "sonner";

const updateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  description: z.string().optional(),
  status: z.enum(["draft", "active", "paused", "archived"]).optional(),
  triggerType: z.string().optional(),
  triggerConfig: z.object({}).optional(),
  actions: z
    .array(
      z.object({
        actionType: z.string(),
        actionConfig: z.object({}).optional(),
        order: z.number(),
      }),
    )
    .optional(),
});

type UpdateFormData = z.infer<typeof updateSchema>;

interface WorkflowConfigurationDialogProps {
  workflow: any; // Workflow type
  onComplete: () => void;
}

const statusOptions = [
  {
    value: "draft",
    label: "Draft",
    description: "Not active, can be modified",
  },
  { value: "active", label: "Active", description: "Running and triggering" },
  { value: "paused", label: "Paused", description: "Temporarily stopped" },
  { value: "archived", label: "Archived", description: "No longer used" },
];

const triggerOptions = [
  { value: "lead_created", label: "New Lead Created" },
  { value: "lead_status_changed", label: "Lead Status Changed" },
  { value: "email_opened", label: "Email Opened" },
  { value: "email_clicked", label: "Email Link Clicked" },
  { value: "form_submitted", label: "Form Submitted" },
  { value: "appointment_scheduled", label: "Appointment Scheduled" },
  { value: "time_based", label: "Time-Based" },
  { value: "webhook", label: "Webhook" },
];

const actionOptions = [
  { value: "send_email", label: "Send Email" },
  { value: "update_lead", label: "Update Lead" },
  { value: "create_task", label: "Create Task" },
  { value: "call_webhook", label: "Call Webhook" },
  { value: "run_ai_agent", label: "Run AI Agent" },
  { value: "wait", label: "Wait/Delay" },
  { value: "condition", label: "Conditional Logic" },
];

export function WorkflowConfigurationDialog({
  workflow,
  onComplete,
}: WorkflowConfigurationDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actions, setActions] = useState(workflow.actions || []);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UpdateFormData>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      name: workflow.name,
      description: workflow.description || "",
      status: workflow.status,
      triggerType: workflow.trigger_type,
      triggerConfig: workflow.trigger_config || {},
      actions: workflow.actions || [],
    },
  });

  const watchedValues = watch();

  const onSubmit = async (data: UpdateFormData) => {
    setIsSubmitting(true);
    try {
      await updateWorkflow(workflow.id, {
        ...data,
        actions: actions,
      });
      onComplete();
    } catch (error) {
      console.error("Failed to update workflow:", error);
      toast.error("Failed to update workflow. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addAction = (actionType: string) => {
    const newAction = {
      actionType,
      order: actions.length,
      actionConfig: {},
    };
    const updatedActions = [...actions, newAction];
    setActions(updatedActions);
  };

  const removeAction = (index: number) => {
    const updatedActions = actions.filter((_, i) => i !== index);
    setActions(updatedActions);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/20 text-green-700 dark:text-green-400";
      case "paused":
        return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400";
      case "draft":
        return "bg-gray-500/20 text-gray-700 dark:text-gray-400";
      case "archived":
        return "bg-red-500/20 text-red-700 dark:text-red-400";
      default:
        return "bg-gray-500/20 text-gray-700 dark:text-gray-400";
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 border-b pb-4">
        <div className="rounded-lg bg-primary/10 p-2">
          <Workflow className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Configure {workflow.name}</h2>
          <p className="text-muted-foreground">
            Modify your workflow settings and automation rules
          </p>
        </div>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Basic Information</CardTitle>
          <CardDescription>
            Name, description, and status settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Workflow Name *</Label>
              <Input id="name" {...register("name")} />
              {errors.name && (
                <p className="text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={watchedValues.status}
                onValueChange={(
                  value: "draft" | "active" | "paused" | "archived",
                ) => setValue("status", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{option.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {option.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={2} {...register("description")} />
          </div>
        </CardContent>
      </Card>

      {/* Trigger Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Trigger Configuration</CardTitle>
          <CardDescription>When should this workflow run?</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Trigger Type</Label>
            <Select
              value={watchedValues.triggerType}
              onValueChange={(value) => setValue("triggerType", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {triggerOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Actions Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Actions</CardTitle>
          <CardDescription>
            What should happen when the workflow is triggered?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing Actions */}
          {actions.map((action, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div>
                <Badge variant="outline">
                  {
                    actionOptions.find((a) => a.value === action.actionType)
                      ?.label
                  }
                </Badge>
                <p className="mt-1 text-sm text-muted-foreground">
                  Step {index + 1}
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
          ))}

          {/* Add Action */}
          <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-4">
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
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Performance Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">
                {workflow.execution_count}
              </div>
              <div className="text-sm text-muted-foreground">Total Runs</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {workflow.success_count}
              </div>
              <div className="text-sm text-muted-foreground">Successful</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {workflow.failure_count}
              </div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {workflow.last_executed_at
                  ? new Date(workflow.last_executed_at).toLocaleDateString()
                  : "Never"}
              </div>
              <div className="text-sm text-muted-foreground">Last Run</div>
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
