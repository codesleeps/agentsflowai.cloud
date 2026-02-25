"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  ArrowRight,
  Play,
  Save,
  GitBranch,
  Users,
  Settings,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Agent,
  Workflow,
  WorkflowStep,
  AGENT_TEAMS,
  PREDEFINED_WORKFLOWS,
  workflowEngine,
} from "@/lib/ai/workflows/multi-agent-workflow";

export function WorkflowBuilder() {
  const [activeTab, setActiveTab] = useState("templates");
  const [workflow, setWorkflow] = useState<Workflow>({
    id: "",
    name: "",
    description: "",
    agents: [],
    steps: [],
  });
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResults, setExecutionResults] = useState<Record<string, unknown> | null>(null);

  const loadTemplate = (templateId: string) => {
    const template = PREDEFINED_WORKFLOWS.find((w) => w.id === templateId);
    if (template) {
      setWorkflow({
        ...template,
        id: `${template.id}-${Date.now()}`,
      });
      setActiveTab("builder");
      toast.success(`Loaded template: ${template.name}`);
    }
  };

  const loadAgentTeam = (teamId: keyof typeof AGENT_TEAMS) => {
    const team = AGENT_TEAMS[teamId];
    setWorkflow((prev) => ({
      ...prev,
      agents: team,
    }));
    toast.success(`Loaded ${team.length} agents`);
  };

  const addStep = () => {
    const newStep: WorkflowStep = {
      id: `step-${Date.now()}`,
      name: "New Step",
      agentId: workflow.agents[0]?.id || "",
      prompt: "",
      outputKey: `output-${workflow.steps.length + 1}`,
    };
    setWorkflow((prev) => ({
      ...prev,
      steps: [...prev.steps, newStep],
    }));
  };

  const updateStep = (stepId: string, updates: Partial<WorkflowStep>) => {
    setWorkflow((prev) => ({
      ...prev,
      steps: prev.steps.map((s) => (s.id === stepId ? { ...s, ...updates } : s)),
    }));
  };

  const removeStep = (stepId: string) => {
    setWorkflow((prev) => ({
      ...prev,
      steps: prev.steps.filter((s) => s.id !== stepId),
    }));
  };

  const executeWorkflow = async () => {
    if (!workflow.name) {
      toast.error("Please give your workflow a name");
      return;
    }
    if (workflow.steps.length === 0) {
      toast.error("Add at least one step");
      return;
    }

    setIsExecuting(true);
    try {
      // Register workflow
      workflowEngine.registerWorkflow(workflow);

      // Execute with sample inputs
      const inputs: Record<string, unknown> = {};
      workflow.steps.forEach((step) => {
        const matches = step.prompt.match(/\{\{(\w+)\}\}/g);
        matches?.forEach((match) => {
          const key = match.replace(/[{}]/g, "");
          if (!inputs[key]) {
            inputs[key] = `[Sample ${key}]`;
          }
        });
      });

      const result = await workflowEngine.executeWorkflow(workflow.id, inputs, {
        onStepStart: (stepId) => {
          toast.info(`Starting: ${stepId}`);
        },
        onStepComplete: (stepId, result) => {
          toast.success(`Completed: ${stepId}`);
        },
        onStepError: (stepId, error) => {
          toast.error(`Failed: ${stepId} - ${error.message}`);
        },
      });

      setExecutionResults(result as unknown as Record<string, unknown>);
      toast.success("Workflow completed!");
    } catch (error) {
      toast.error("Workflow execution failed");
      console.error(error);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="builder">Builder</TabsTrigger>
          <TabsTrigger value="results" disabled={!executionResults}>
            Results
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {PREDEFINED_WORKFLOWS.map((template) => (
              <Card key={template.id} className="cursor-pointer hover:border-primary transition-colors">
                <CardHeader>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {template.agents.length} agents
                    <span className="mx-2">•</span>
                    <GitBranch className="h-4 w-4" />
                    {template.steps.length} steps
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" onClick={() => loadTemplate(template.id)}>
                    Use Template
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="builder" className="space-y-6">
          {/* Workflow Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Workflow Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={workflow.name}
                    onChange={(e) =>
                      setWorkflow((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="My Workflow"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Agent Team</Label>
                  <Select onValueChange={(v) => loadAgentTeam(v as keyof typeof AGENT_TEAMS)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Load agent team..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contentCreation">Content Creation</SelectItem>
                      <SelectItem value="codeReview">Code Review</SelectItem>
                      <SelectItem value="marketingCampaign">Marketing Campaign</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={workflow.description}
                  onChange={(e) =>
                    setWorkflow((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="What does this workflow do?"
                />
              </div>

              {/* Agents */}
              {workflow.agents.length > 0 && (
                <div className="space-y-2">
                  <Label>Agents ({workflow.agents.length})</Label>
                  <div className="flex flex-wrap gap-2">
                    {workflow.agents.map((agent) => (
                      <Badge key={agent.id} variant="secondary">
                        {agent.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Steps */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Steps ({workflow.steps.length})</h3>
              <Button onClick={addStep} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Step
              </Button>
            </div>

            {workflow.steps.map((step, index) => (
              <Card key={step.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{index + 1}</Badge>
                      <Input
                        value={step.name}
                        onChange={(e) => updateStep(step.id, { name: e.target.value })}
                        className="w-48 font-medium"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeStep(step.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Agent</Label>
                      <Select
                        value={step.agentId}
                        onValueChange={(v) => updateStep(step.id, { agentId: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {workflow.agents.map((agent) => (
                            <SelectItem key={agent.id} value={agent.id}>
                              {agent.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Output Key</Label>
                      <Input
                        value={step.outputKey}
                        onChange={(e) => updateStep(step.id, { outputKey: e.target.value })}
                        placeholder="e.g., research, draft"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Prompt</Label>
                    <Textarea
                      value={step.prompt}
                      onChange={(e) => updateStep(step.id, { prompt: e.target.value })}
                      placeholder="Instructions for this step. Use {{variable}} for dynamic values."
                      className="min-h-[100px]"
                    />
                  </div>
                  {step.dependsOn && step.dependsOn.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ArrowRight className="h-4 w-4" />
                      Depends on: {step.dependsOn.join(", ")}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Execute */}
          <div className="flex justify-end gap-4">
            <Button variant="outline">
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            <Button onClick={executeWorkflow} disabled={isExecuting}>
              {isExecuting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Execute Workflow
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="results">
          {executionResults && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Execution Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-[600px] text-sm">
                  {JSON.stringify(executionResults, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
