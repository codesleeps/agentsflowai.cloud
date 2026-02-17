"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  Eye, 
  EyeOff,
  CheckCircle,
  AlertCircle,
  Clock,
  FileText,
  Code,
  GitBranch,
  Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface AutonomousTask {
  id: string;
  status: 'analyzing' | 'planning' | 'awaiting_approval' | 'executing' | 'verifying' | 'completed' | 'failed' | 'cancelled' | 'paused';
  progress: number;
  estimatedTimeRemaining: number;
  currentStep?: string;
  steps: TaskStep[];
  plan?: TechnicalPlan;
  createdAt: Date;
  updatedAt: Date;
}

interface TaskStep {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  tools: string[];
  startTime?: Date;
  endTime?: Date;
  output?: string;
  error?: string;
}

interface TechnicalPlan {
  summary: {
    title: string;
    description: string;
    complexity: string;
    estimatedTotalDuration: number;
  };
  affectedFiles: Array<{
    path: string;
    changeType: string;
    reason: string;
  }>;
  implementationSteps: Array<{
    id: string;
    description: string;
    toolsNeeded: any[];
    estimatedDuration: number;
    dependencies: string[];
    riskLevel: string;
    validationCriteria: string[];
  }>;
  acceptanceCriteria: Array<{
    id: string;
    description: string;
    testMethod: string;
    successIndicators: string[];
  }>;
}

interface AutonomousAgentViewProps {
  taskId: string;
  task: AutonomousTask;
  onRefresh: () => void;
  onApprove?: () => void;
  onCancel?: () => void;
  onPause?: () => void;
  onResume?: () => void;
}

export function AutonomousAgentView({
  taskId,
  task,
  onRefresh,
  onApprove,
  onCancel,
  onPause,
  onResume
}: AutonomousAgentViewProps) {
  const [showLiveUpdates, setShowLiveUpdates] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh && task.status !== 'completed' && task.status !== 'failed' && task.status !== 'cancelled') {
      refreshIntervalRef.current = setInterval(() => {
        onRefresh();
      }, 2000); // Refresh every 2 seconds
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, task.status, onRefresh]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-gray-700';
      case 'failed': return 'text-red-500';
      case 'cancelled': return 'text-gray-500';
      case 'awaiting_approval': return 'text-yellow-500';
      case 'paused': return 'text-orange-500';
      default: return 'text-blue-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'failed': return <AlertCircle className="h-4 w-4" />;
      case 'awaiting_approval': return <Clock className="h-4 w-4" />;
      case 'paused': return <Pause className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4 animate-spin" />;
    }
  };

  const getStepStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'in_progress': return <Activity className="h-4 w-4 text-blue-500 animate-spin" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Task Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {getStatusIcon(task.status)}
                <CardTitle className="text-xl">
                  Task: {task.plan?.summary.title || 'Autonomous Task'}
                </CardTitle>
                <Badge 
                  variant={
                    task.status === 'completed' ? 'default' :
                    task.status === 'failed' ? 'destructive' :
                    task.status === 'awaiting_approval' ? 'secondary' :
                    task.status === 'paused' ? 'outline' :
                    'outline'
                  }
                  className={getStatusColor(task.status)}
                >
                  {task.status.replace('_', ' ')}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {task.plan?.summary.description || 'Processing autonomous task...'}
              </p>
              {task.plan?.summary.complexity && (
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <span className="flex items-center gap-1">
                    <GitBranch className="h-4 w-4" />
                    Complexity: {task.plan.summary.complexity}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Est. {formatTime(task.plan.summary.estimatedTotalDuration * 60000)}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                {autoRefresh ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {autoRefresh ? 'Pause Updates' : 'Resume Updates'}
              </Button>
              
              {task.status === 'awaiting_approval' && onApprove && (
                <Button size="sm" onClick={onApprove}>
                  <Play className="h-4 w-4 mr-2" />
                  Approve & Execute
                </Button>
              )}
              
              {(task.status === 'executing' || task.status === 'planning') && onPause && (
                <Button variant="outline" size="sm" onClick={onPause}>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </Button>
              )}
              
              {task.status === 'paused' && onResume && (
                <Button size="sm" onClick={onResume}>
                  <Play className="h-4 w-4 mr-2" />
                  Resume
                </Button>
              )}
              
              {(task.status === 'executing' || task.status === 'planning' || task.status === 'awaiting_approval' || task.status === 'paused') && onCancel && (
                <Button variant="outline" size="sm" onClick={onCancel}>
                  <Square className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress: {Math.round(task.progress * 100)}%</span>
              <span>
                {task.estimatedTimeRemaining > 0 
                  ? `~${formatTime(task.estimatedTimeRemaining)} remaining` 
                  : 'Calculating...'
                }
              </span>
            </div>
            <Progress value={task.progress * 100} className="h-2" />
          </div>
          
          {/* Current Step */}
          {task.currentStep && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">Current Step:</p>
              <p className="text-sm text-muted-foreground">{task.currentStep}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="steps" className="flex-1">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="steps" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Execution Steps
          </TabsTrigger>
          <TabsTrigger value="plan" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            Technical Plan
          </TabsTrigger>
          <TabsTrigger value="files" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Affected Files
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Activity Logs
          </TabsTrigger>
        </TabsList>

        {/* Execution Steps Tab */}
        <TabsContent value="steps" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Execution Steps
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {task.steps.map((step, index) => (
                    <div 
                      key={step.id} 
                      className={`p-4 rounded-lg border ${
                        step.status === 'completed' ? 'bg-green-50 border-green-200' :
                        step.status === 'failed' ? 'bg-red-50 border-red-200' :
                        step.status === 'in_progress' ? 'bg-blue-50 border-blue-200' :
                        'bg-muted'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {getStepStatusIcon(step.status)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium">Step {index + 1}: {step.description}</span>
                            <Badge variant="outline" className="text-xs">
                              {step.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          
                          {step.tools.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {step.tools.map((tool, toolIndex) => (
                                <Badge key={toolIndex} variant="secondary" className="text-xs">
                                  {tool}
                                </Badge>
                              ))}
                            </div>
                          )}
                          
                          {step.output && (
                            <div className="mt-2 p-2 bg-background rounded text-sm">
                              <p className="font-medium mb-1">Output:</p>
                              <pre className="whitespace-pre-wrap text-xs">{step.output}</pre>
                            </div>
                          )}
                          
                          {step.error && (
                            <div className="mt-2 p-2 bg-red-100 rounded text-sm">
                              <p className="font-medium mb-1 text-red-800">Error:</p>
                              <p className="text-red-700">{step.error}</p>
                            </div>
                          )}
                          
                          {step.startTime && (
                            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                              <span>Started: {formatDistanceToNow(new Date(step.startTime), { addSuffix: true })}</span>
                              {step.endTime && (
                                <span>Completed: {formatDistanceToNow(new Date(step.endTime), { addSuffix: true })}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Technical Plan Tab */}
        <TabsContent value="plan" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Technical Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              {task.plan ? (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-6">
                    {/* Summary */}
                    <div>
                      <h3 className="font-semibold mb-2">Summary</h3>
                      <p className="text-muted-foreground">{task.plan.summary.description}</p>
                    </div>
                    
                    <Separator />
                    
                    {/* Implementation Steps */}
                    <div>
                      <h3 className="font-semibold mb-3">Implementation Steps</h3>
                      <div className="space-y-3">
                        {task.plan.implementationSteps.map((step, index) => (
                          <div key={step.id} className="p-3 bg-muted rounded-lg">
                            <div className="flex items-start gap-3">
                              <span className="font-medium">#{index + 1}</span>
                              <div className="flex-1">
                                <p className="font-medium">{step.description}</p>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  <Badge variant="outline">⏱️ {step.estimatedDuration}min</Badge>
                                  <Badge variant="outline">⚠️ {step.riskLevel}</Badge>
                                  {step.toolsNeeded.map((tool, i) => (
                                    <Badge key={i} variant="secondary">
                                      {tool.serverName}.{tool.toolName}
                                    </Badge>
                                  ))}
                                </div>
                                {step.validationCriteria.length > 0 && (
                                  <div className="mt-2">
                                    <p className="text-sm font-medium">Validation:</p>
                                    <ul className="text-sm text-muted-foreground list-disc list-inside">
                                      {step.validationCriteria.map((criteria, i) => (
                                        <li key={i}>{criteria}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <Separator />
                    
                    {/* Acceptance Criteria */}
                    <div>
                      <h3 className="font-semibold mb-3">Acceptance Criteria</h3>
                      <div className="space-y-2">
                        {task.plan.acceptanceCriteria.map((criteria) => (
                          <div key={criteria.id} className="p-3 bg-muted rounded-lg">
                            <p className="font-medium">{criteria.description}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Test Method: {criteria.testMethod}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {criteria.successIndicators.map((indicator, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {indicator}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex items-center justify-center h-32">
                  <p className="text-muted-foreground">Plan not available yet...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Affected Files Tab */}
        <TabsContent value="files" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Affected Files
              </CardTitle>
            </CardHeader>
            <CardContent>
              {task.plan?.affectedFiles.length ? (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {task.plan.affectedFiles.map((file, index) => (
                      <div key={index} className="p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm">{file.path}</span>
                          <Badge variant={
                            file.changeType === 'create' ? 'default' :
                            file.changeType === 'modify' ? 'secondary' :
                            'destructive'
                          }>
                            {file.changeType}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{file.reason}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex items-center justify-center h-32">
                  <p className="text-muted-foreground">No files affected yet...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Logs Tab */}
        <TabsContent value="logs" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Activity Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  Last updated: {formatDistanceToNow(new Date(task.updatedAt), { addSuffix: true })}
                </p>
                <Button variant="outline" size="sm" onClick={onRefresh}>
                  Refresh
                </Button>
              </div>
              <ScrollArea className="h-[450px]">
                <div className="space-y-2">
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm">
                      <span className="font-medium">Task initiated</span> - {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  
                  {task.status === 'planning' && (
                    <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-sm">
                        <span className="font-medium">Planning phase started</span>
                      </p>
                    </div>
                  )}
                  
                  {task.status === 'awaiting_approval' && (
                    <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <p className="text-sm">
                        <span className="font-medium">Plan generated and awaiting approval</span>
                      </p>
                    </div>
                  )}
                  
                  {task.status === 'executing' && (
                    <div className="p-3 bg-white rounded-lg border border-gray-200">
                      <p className="text-sm">
                        <span className="font-medium">Execution started</span>
                      </p>
                    </div>
                  )}
                  
                  {task.status === 'completed' && (
                    <div className="p-3 bg-white rounded-lg border border-gray-300">
                      <p className="text-sm">
                        <span className="font-medium">Task completed successfully</span>
                      </p>
                    </div>
                  )}
                  
                  {task.status === 'failed' && (
                    <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-sm">
                        <span className="font-medium">Task failed</span>
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}