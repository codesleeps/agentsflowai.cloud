"use client";

import { useState } from "react";
import {
  Bot,
  Plus,
  Settings,
  Trash2,
  Edit,
  ArrowLeft,
  Sparkles,
  TestTube,
  Eye,
  EyeOff,
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
import {
  useUserAIAgents,
  deleteUserAIAgent,
} from "@/client-lib/user-ai-agents-client";
import { AgentCreationWizard } from "@/components/ai-agents/AgentCreationWizard";
import { AgentConfigurationDialog } from "@/components/ai-agents/AgentConfigurationDialog";
import { toast } from "sonner";

export default function CustomAIAgentsPage() {
  const { data: agents, isLoading, error, mutate } = useUserAIAgents();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [deletingAgent, setDeletingAgent] = useState(null);

  const handleDeleteAgent = async (agentId: string) => {
    try {
      await deleteUserAIAgent(agentId);
      toast.success("Agent deleted successfully");
      setDeletingAgent(null);
    } catch (error) {
      console.error("Failed to delete agent:", error);
      toast.error("Failed to delete agent");
    }
  };

  const handleAgentCreated = () => {
    setShowCreateDialog(false);
    mutate(); // Refresh the list
    toast.success("Agent created successfully!");
  };

  const handleAgentUpdated = () => {
    setEditingAgent(null);
    mutate(); // Refresh the list
    toast.success("Agent updated successfully!");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading your AI agents...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <p className="mb-4 text-destructive">Failed to load AI agents</p>
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
            <Link href="/ai-agents">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold">
              <Bot className="h-8 w-8 text-primary" />
              Custom AI Agents
            </h1>
            <p className="mt-1 text-muted-foreground">
              Create and manage your personalized AI assistants
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/ai-agents/playground">
              <TestTube className="mr-2 h-4 w-4" />
              Test Playground
            </Link>
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Agent
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Custom AI Agent</DialogTitle>
                <DialogDescription>
                  Build a personalized AI assistant tailored to your specific
                  needs
                </DialogDescription>
              </DialogHeader>
              <AgentCreationWizard onComplete={handleAgentCreated} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <Bot className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{agents?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Total Agents</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <Sparkles className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">
                {agents?.filter((a) => a.is_active).length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Active Agents</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <TestTube className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">
                {agents?.reduce((sum, a) => sum + a.usage_count, 0) || 0}
              </p>
              <p className="text-sm text-muted-foreground">
                Total Interactions
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agents Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {agents?.map((agent) => (
          <Card key={agent.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{agent.icon}</div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate text-lg">
                      {agent.name}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {agent.category}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {agent.is_public ? (
                    <Eye className="h-4 w-4 text-green-500" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Badge
                    variant={agent.is_active ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {agent.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {agent.description || "No description provided"}
              </p>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{agent.usage_count} uses</span>
                <span>{agent.cost_tier} cost</span>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setEditingAgent(agent)}
                >
                  <Settings className="mr-1 h-3 w-3" />
                  Configure
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeletingAgent(agent)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Empty State */}
        {(!agents || agents.length === 0) && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bot className="mb-4 h-16 w-16 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-medium">No custom agents yet</h3>
              <p className="mb-6 max-w-md text-center text-muted-foreground">
                Create your first custom AI agent to automate tasks, answer
                questions, or assist with specific workflows tailored to your
                needs.
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Agent
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Dialog */}
      {editingAgent && (
        <Dialog
          open={!!editingAgent}
          onOpenChange={() => setEditingAgent(null)}
        >
          <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Configure AI Agent</DialogTitle>
              <DialogDescription>
                Modify your AI agent's settings and behavior
              </DialogDescription>
            </DialogHeader>
            <AgentConfigurationDialog
              agent={editingAgent}
              onComplete={handleAgentUpdated}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingAgent}
        onOpenChange={() => setDeletingAgent(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete AI Agent</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingAgent?.name}"? This
              action cannot be undone and will permanently remove the agent and
              all its configuration.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDeleteAgent(deletingAgent.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Agent
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
