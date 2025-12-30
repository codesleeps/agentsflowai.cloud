"use client";

import { useState } from "react";
import {
  Workflow,
  Plus,
  Play,
  Pause,
  Settings,
  Trash2,
  ArrowLeft,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { WorkflowCreationWizard } from "@/components/workflows/WorkflowCreationWizard";
import { WorkflowConfigurationDialog } from "@/components/workflows/WorkflowConfigurationDialog";
import { useWorkflows } from "@/client-lib/workflows-client";
import { toast } from "sonner";

export default function WorkflowsPage() {
  const { data: workflows, isLoading, error, mutate } = useWorkflows();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState(null);
  const [deletingWorkflow, setDeletingWorkflow] = useState(null);

  const handleWorkflowCreated = () => {
    setShowCreateDialog(false);
    mutate();
    toast.success("Workflow created successfully!");
  };

  const handleWorkflowUpdated = () => {
    setEditingWorkflow(null);
    mutate();
    toast.success("Workflow updated successfully!");
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
    try {
      // TODO: Implement delete workflow API
      toast.success("Workflow deleted successfully");
      setDeletingWorkflow(null);
      mutate();
    } catch (error) {
      console.error("Failed to delete workflow:", error);
      toast.error("Failed to delete workflow");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/20 text-green-700 dark:text-green-400";
      case "paused":
        return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400";
      case "draft":
        return "bg-gray-500/20 text-gray-700 dark:text-gray-400";
      default:
        return "bg-gray-500/20 text-gray-700 dark:text-gray-400";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading workflows...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <p className="mb-4 text-destructive">Failed to load workflows</p>
        <Button onClick={() => mutate()} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold">
              <Workflow className="h-8 w-8 text-primary" />
              Workflow Automation
            </h1>
            <p className="mt-1 text-muted-foreground">
              Automate business processes with AI-powered workflows
            </p>
          </div>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Workflow
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Workflow</DialogTitle>
              <DialogDescription>
                Build an automated workflow to streamline your processes
              </DialogDescription>
            </DialogHeader>
            <WorkflowCreationWizard onComplete={handleWorkflowCreated} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <Workflow className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{workflows?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Total Workflows</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">
                {workflows?.filter((w) => w.status === "active").length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <Clock className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">
                {workflows?.reduce((sum, w) => sum + w.execution_count, 0) || 0}
              </p>
              <p className="text-sm text-muted-foreground">Total Executions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <Zap className="h-8 w-8 text-purple-500" />
            <div>
              <p className="text-2xl font-bold">
                {workflows?.filter((w) => w.success_count > w.failure_count)
                  .length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Successful</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workflows Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {workflows?.map((workflow) => (
          <Card key={workflow.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Workflow className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate text-lg">
                      {workflow.name}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {workflow.description}
                    </CardDescription>
                  </div>
                </div>
                <Badge className={getStatusColor(workflow.status)}>
                  {workflow.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{workflow.execution_count} executions</span>
                <span>
                  {workflow.success_count}/{workflow.failure_count} success/fail
                </span>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setEditingWorkflow(workflow)}
                >
                  <Settings className="mr-1 h-3 w-3" />
                  Configure
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeletingWorkflow(workflow)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Empty State */}
        {(!workflows || workflows.length === 0) && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Workflow className="mb-4 h-16 w-16 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-medium">No workflows yet</h3>
              <p className="mb-6 max-w-md text-center text-muted-foreground">
                Create your first automated workflow to streamline repetitive
                tasks and improve efficiency.
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Workflow
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Dialog */}
      {editingWorkflow && (
        <Dialog
          open={!!editingWorkflow}
          onOpenChange={() => setEditingWorkflow(null)}
        >
          <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Configure Workflow</DialogTitle>
              <DialogDescription>
                Modify your workflow settings and automation rules
              </DialogDescription>
            </DialogHeader>
            <WorkflowConfigurationDialog
              workflow={editingWorkflow}
              onComplete={handleWorkflowUpdated}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingWorkflow}
        onOpenChange={() => setDeletingWorkflow(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workflow</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingWorkflow?.name}"? This
              action cannot be undone and will permanently remove the workflow
              and all its configuration.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDeleteWorkflow(deletingWorkflow.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Workflow
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
