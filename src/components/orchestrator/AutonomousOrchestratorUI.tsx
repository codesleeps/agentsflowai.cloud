'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Play, 
  Square, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Brain,
  Zap,
  Activity
} from 'lucide-react';
import { autonomousOrchestrator } from '@/client-lib/autonomous-orchestrator-client';

interface Task {
  taskId: string;
  currentState: string;
  complexity: {
    level: string;
    score: number;
    estimatedSteps: number;
    reasoning: string;
  };
  executionPlan?: any;
  executionResults?: any[];
  metadata: {
    startTime: string;
    toolsUsed: string[];
    totalCost: number;
    totalDuration: number;
  };
  originalPrompt: string;
}

export function AutonomousOrchestratorUI() {
  const [agentId, setAgentId] = useState('');
  const [prompt, setPrompt] = useState('');
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentId.trim() || !prompt.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await autonomousOrchestrator.createTask(agentId, prompt);
      
      if ('error' in result) {
        setError(result.error);
        return;
      }

      const taskId = result.taskId;
      
      // Start polling for updates
      setIsPolling(true);
      
      autonomousOrchestrator.pollTaskStatus(
        taskId,
        (task) => {
          setCurrentTask({
            taskId: task.taskId,
            currentState: task.currentState,
            complexity: task.complexity,
            executionPlan: task.executionPlan,
            executionResults: task.executionResults,
            metadata: task.metadata,
            originalPrompt: task.originalPrompt
          });
        },
        (task) => {
          // Task completed
          setIsPolling(false);
          console.log('Task completed:', task);
        },
        (errorMsg) => {
          // Error occurred
          setError(errorMsg);
          setIsPolling(false);
        }
      );

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!currentTask) return;

    try {
      const result = await autonomousOrchestrator.approveTask(currentTask.taskId);
      if (!result.success) {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve task');
    }
  };

  const handleCancel = async () => {
    if (!currentTask) return;

    try {
      const result = await autonomousOrchestrator.cancelTask(currentTask.taskId);
      if (!result.success) {
        setError(result.error);
      } else {
        setCurrentTask(null);
        setIsPolling(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel task');
    }
  };

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'ANALYZING':
        return <Brain className="h-4 w-4" />;
      case 'PLANNING':
        return <Zap className="h-4 w-4" />;
      case 'AWAITING_APPROVAL':
        return <Clock className="h-4 w-4" />;
      case 'EXECUTING':
        return <Play className="h-4 w-4" />;
      case 'VERIFYING':
        return <Activity className="h-4 w-4" />;
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4" />;
      case 'FAILED':
        return <AlertCircle className="h-4 w-4" />;
      case 'CANCELLED':
        return <Square className="h-4 w-4" />;
      default:
        return <RefreshCw className="h-4 w-4" />;
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800';
      case 'AWAITING_APPROVAL':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-6 w-6" />
            Autonomous Agent Orchestrator
          </CardTitle>
          <CardDescription>
            Create and manage autonomous AI agent workflows with automatic complexity analysis and execution planning.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="agentId">Agent ID</Label>
                <Input
                  id="agentId"
                  value={agentId}
                  onChange={(e) => setAgentId(e.target.value)}
                  placeholder="Enter agent identifier"
                  disabled={isLoading || isPolling}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="prompt">Task Prompt</Label>
                <Textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe what you want the agent to accomplish..."
                  rows={4}
                  disabled={isLoading || isPolling}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                type="submit" 
                disabled={isLoading || isPolling || !agentId.trim() || !prompt.trim()}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Initializing...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Start Autonomous Task
                  </>
                )}
              </Button>

              {currentTask && (
                <>
                  {currentTask.currentState === 'AWAITING_APPROVAL' && (
                    <Button 
                      onClick={handleApprove}
                      variant="default"
                      disabled={isLoading}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve Execution
                    </Button>
                  )}
                  
                  <Button 
                    onClick={handleCancel}
                    variant="destructive"
                    disabled={isLoading}
                  >
                    <Square className="mr-2 h-4 w-4" />
                    Cancel Task
                  </Button>
                </>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {currentTask && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Task Progress</span>
              <Badge className={`${getStateColor(currentTask.currentState)} flex items-center gap-1`}>
                {getStateIcon(currentTask.currentState)}
                {currentTask.currentState.replace('_', ' ')}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Original Prompt</h3>
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded">{currentTask.originalPrompt}</p>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h3 className="font-medium mb-2">Complexity Analysis</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Level:</span> {currentTask.complexity.level}</p>
                  <p><span className="font-medium">Score:</span> {currentTask.complexity.score}</p>
                  <p><span className="font-medium">Estimated Steps:</span> {currentTask.complexity.estimatedSteps}</p>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Metadata</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Started:</span> {new Date(currentTask.metadata.startTime).toLocaleString()}</p>
                  <p><span className="font-medium">Tools Used:</span> {currentTask.metadata.toolsUsed.length}</p>
                  <p><span className="font-medium">Total Cost:</span> ${currentTask.metadata.totalCost.toFixed(4)}</p>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Current Status</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Task ID:</span> {currentTask.taskId.substring(0, 12)}...</p>
                  <p><span className="font-medium">State:</span> {currentTask.currentState}</p>
                  {currentTask.executionResults && (
                    <p><span className="font-medium">Results:</span> {currentTask.executionResults.length} completed</p>
                  )}
                </div>
              </div>
            </div>

            {currentTask.executionPlan && (
              <>
                <Separator />
                <div>
                  <h3 className="font-medium mb-2">Execution Plan</h3>
                  <div className="bg-muted p-3 rounded text-sm">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(currentTask.executionPlan, null, 2)}
                    </pre>
                  </div>
                </div>
              </>
            )}

            {isPolling && (
              <div className="flex items-center gap-2 text-blue-600">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Monitoring task progress...</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}