/**
 * Autonomous Task Monitor Component
 * 
 * React component for monitoring and controlling autonomous task execution
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  CheckCircle, 
  XCircle,
  Clock,
  Zap,
  Brain,
  Wrench
} from "lucide-react";
import {
  AutonomousTaskStatus,
  useAutonomousTaskStatus,
  approveAutonomousTask,
  cancelAutonomousTask,
  pauseAutonomousTask,
  resumeAutonomousTask,
  retryAutonomousTask,
  getStatusColor,
  getStatusText,
  formatDuration,
  formatCurrency
} from "@/client-lib/autonomous-agents-client";

interface AutonomousTaskMonitorProps {
  taskId: string;
  className?: string;
}

export function AutonomousTaskMonitor({ taskId, className }: AutonomousTaskMonitorProps) {
  const { status, isLoading, error, refresh } = useAutonomousTaskStatus(taskId);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleAction = async (action: string, actionFn: () => Promise<void>) => {
    setActionLoading(action);
    try {
      await actionFn();
      refresh();
    } catch (error) {
      console.error(`Failed to ${action} task:`, error);
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading && !status) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-32">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4 animate-spin" />
            Loading task status...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-32">
          <div className="text-center text-destructive">
            <XCircle className="h-8 w-8 mx-auto mb-2" />
            <p>Error loading task status</p>
            <Button variant="outline" size="sm" onClick={refresh} className="mt-2">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-32">
          <p className="text-muted-foreground">Task not found</p>
        </CardContent>
      </Card>
    );
  }

  const canApprove = status.currentState === 'AWAITING_APPROVAL';
  const canCancel = ['ANALYZING', 'PLANNING', 'AWAITING_APPROVAL', 'EXECUTING', 'VERIFYING', 'PAUSED'].includes(status.currentState);
  const canPause = status.currentState === 'EXECUTING';
  const canResume = status.currentState === 'PAUSED';
  const canRetry = status.currentState === 'FAILED';

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Autonomous Task
              <Badge variant={getStatusColor(status.currentState) as any}>
                {getStatusText(status.currentState)}
              </Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1 truncate">
              {status.originalPrompt}
            </p>
          </div>
          <div className="flex gap-2">
            {canApprove && (
              <Button
                size="sm"
                onClick={() => handleAction('approve', () => approveAutonomousTask(taskId))}
                disabled={actionLoading === 'approve'}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve
              </Button>
            )}
            
            {canPause && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleAction('pause', () => pauseAutonomousTask(taskId))}
                disabled={actionLoading === 'pause'}
              >
                <Pause className="h-4 w-4 mr-1" />
                Pause
              </Button>
            )}
            
            {canResume && (
              <Button
                size="sm"
                onClick={() => handleAction('resume', () => resumeAutonomousTask(taskId))}
                disabled={actionLoading === 'resume'}
              >
                <Play className="h-4 w-4 mr-1" />
                Resume
              </Button>
            )}
            
            {canCancel && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleAction('cancel', () => cancelAutonomousTask(taskId))}
                disabled={actionLoading === 'cancel'}
              >
                <Square className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            )}
            
            {canRetry && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAction('retry', () => retryAutonomousTask(taskId))}
                disabled={actionLoading === 'retry'}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Retry
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Progress Section */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm text-muted-foreground">
              {status.progress.completedSteps} / {status.progress.totalSteps} steps
            </span>
          </div>
          <Progress value={status.progress.percentage} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{Math.round(status.progress.percentage)}% complete</span>
            <span>ETA: {formatDuration(status.progress.estimatedTimeRemaining)}</span>
          </div>
        </div>

        {/* Complexity Analysis */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium mb-1 flex items-center gap-1">
              <Zap className="h-4 w-4" />
              Complexity
            </h4>
            <Badge variant="outline">{status.complexity.level.toUpperCase()}</Badge>
            <p className="text-xs text-muted-foreground mt-1">
              Score: {status.complexity.score}/100
            </p>
          </div>
          
          <div>
            <h4 className="text-sm font-medium mb-1 flex items-center gap-1">
              <Wrench className="h-4 w-4" />
              Tools Used
            </h4>
            <div className="flex flex-wrap gap-1">
              {status.metadata.toolsUsed.length > 0 ? (
                status.metadata.toolsUsed.map(tool => (
                  <Badge key={tool} variant="secondary" className="text-xs">
                    {tool}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">None yet</span>
              )}
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Started:</span>
            <p>{new Date(status.metadata.startTime).toLocaleTimeString()}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Duration:</span>
            <p>{formatDuration(status.metadata.totalDuration)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Cost:</span>
            <p>{formatCurrency(status.metadata.totalCost)}</p>
          </div>
        </div>

        {/* Recent Execution Results */}
        {status.executionResults && status.executionResults.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Recent Results</h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {status.executionResults.slice(-3).map((result, index) => (
                <div key={index} className="text-xs p-2 bg-muted rounded">
                  <div className="flex justify-between">
                    <span className="font-medium">{result.toolRoute?.toolName}</span>
                    <Badge variant={result.success ? "default" : "destructive"}>
                      {result.success ? "Success" : "Failed"}
                    </Badge>
                  </div>
                  {result.error && (
                    <p className="text-destructive mt-1">{result.error}</p>
                  )}
                  {result.result && typeof result.result === 'string' && (
                    <p className="text-muted-foreground mt-1 truncate">
                      {result.result.substring(0, 100)}...
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* State Transitions */}
        {status.stateTransitions && status.stateTransitions.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">State History</h4>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {status.stateTransitions.slice(-5).map((transition, index) => (
                <div key={index} className="text-xs flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {getStatusText(transition.from)}
                  </Badge>
                  <span className="text-muted-foreground">→</span>
                  <Badge variant="default" className="text-xs">
                    {getStatusText(transition.to)}
                  </Badge>
                  <span className="text-muted-foreground ml-auto">
                    {new Date(transition.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Simple task creation component
interface AutonomousTaskCreatorProps {
  agentId: string;
  onTaskCreated?: (taskId: string) => void;
  className?: string;
}

export function AutonomousTaskCreator({ 
  agentId, 
  onTaskCreated,
  className 
}: AutonomousTaskCreatorProps) {
  const [prompt, setPrompt] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsCreating(true);
    setError(null);

    try {
      const { createAutonomousTask } = await import("@/client-lib/autonomous-agents-client");
      const result = await createAutonomousTask(agentId, prompt);
      setPrompt("");
      onTaskCreated?.(result.taskId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Create Autonomous Task</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="prompt" className="block text-sm font-medium mb-2">
              Task Description
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what you want the autonomous agent to do..."
              className="w-full min-h-[120px] p-3 border rounded-md resize-vertical"
              disabled={isCreating}
            />
          </div>
          
          {error && (
            <div className="text-destructive text-sm">{error}</div>
          )}
          
          <Button 
            type="submit" 
            disabled={isCreating || !prompt.trim()}
            className="w-full"
          >
            {isCreating ? "Creating Task..." : "Create Autonomous Task"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}