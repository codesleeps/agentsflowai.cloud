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
  Activity,
  Rocket,
  Flame,
  Cpu
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
    orchestrationModel?: string;
    swarmMode?: boolean;
    expectedSpeedup?: number;
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
  orchestrationModel?: string;
  swarmMode?: boolean;
  actualSpeedup?: number;
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
            originalPrompt: task.originalPrompt,
            orchestrationModel: task.orchestrationModel,
            swarmMode: task.swarmMode,
            actualSpeedup: task.actualSpeedup,
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

  const getStateIcon = (state: string, swarmMode?: boolean) => {
    switch (state) {
      case 'ANALYZING':
        return <Brain className="h-4 w-4" />;
      case 'PLANNING':
        return swarmMode ? <Flame className="h-4 w-4 text-orange-500" /> : <Zap className="h-4 w-4" />;
      case 'AWAITING_APPROVAL':
        return <Clock className="h-4 w-4" />;
      case 'EXECUTING':
        return swarmMode ? <Flame className="h-4 w-4 text-orange-500" /> : <Play className="h-4 w-4" />;
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

  const getStateLabel = (state: string, swarmMode?: boolean) => {
    if (swarmMode && state === 'EXECUTING') {
      return '🔥 EXECUTING WITH SWARM';
    }
    return state.replace('_', ' ');
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
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-6 w-6" />
              Autonomous Agent Orchestrator
            </CardTitle>
            {/* Kimi K2.5 Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full text-white text-sm font-medium">
              <Rocket className="h-4 w-4" />
              <span>Powered by Kimi K2.5</span>
            </div>
          </div>
          <CardDescription>
            Create and manage autonomous AI agent workflows with advanced AI orchestration and parallel agent swarm technology.
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
                  Initializing with Kimi K2.5...
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
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-700">Task Failed</h4>
                <p className="text-red-600 mt-1">
                  {error.includes('Kimi K2.5') || error.includes('Moonshot AI') 
                    ? error 
                    : `Error: ${error}`}
                </p>
                {(error.includes('rate limit') || error.includes('timeout')) && (
                  <p className="text-sm text-red-500 mt-2">
                    This is a temporary issue with the Moonshot AI service. You can retry the task.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {currentTask && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Task Progress</span>
              <div className="flex items-center gap-2">
                {/* Swarm Mode Badge */}
                {currentTask.swarmMode && (
                  <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white flex items-center gap-1 animate-pulse">
                    <Flame className="h-3 w-3" />
                    Swarm Mode Active
                  </Badge>
                )}
                <Badge className={`${getStateColor(currentTask.currentState)} flex items-center gap-1`}>
                  {getStateIcon(currentTask.currentState, currentTask.swarmMode)}
                  {getStateLabel(currentTask.currentState, currentTask.swarmMode)}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Kimi Branding Banner */}
            {currentTask.orchestrationModel && (
              <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-indigo-500/10 to-purple-600/10 rounded-lg border border-indigo-200">
                <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg">
                  <Rocket className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-indigo-900">Orchestrated by Kimi K2.5</p>
                  <p className="text-sm text-indigo-700">
                    Advanced AI with {currentTask.swarmMode ? 'Agent Swarm Technology' : 'Intelligent Task Analysis'}
                  </p>
                </div>
              </div>
            )}

            <div>
              <h3 className="font-medium mb-2">Original Prompt</h3>
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded">{currentTask.originalPrompt}</p>
            </div>

            <Separator />

            {/* Enhanced Complexity Analysis Panel */}
            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Complexity Analysis
                {currentTask.orchestrationModel && (
                  <Badge variant="outline" className="text-xs">
                    <Cpu className="h-3 w-3 mr-1" />
                    Powered by Kimi K2.5
                  </Badge>
                )}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Complexity Level</p>
                  <p className="font-semibold capitalize">{currentTask.complexity.level}</p>
                </div>
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Complexity Score</p>
                  <p className="font-semibold">{currentTask.complexity.score} / 100</p>
                </div>
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Estimated Steps</p>
                  <p className="font-semibold">{currentTask.complexity.estimatedSteps} steps</p>
                </div>
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Orchestration Model</p>
                  <p className="font-semibold text-indigo-600">
                    {currentTask.orchestrationModel?.includes('kimi') ? 'Kimi K2.5' : 'Standard'}
                  </p>
                </div>
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Execution Mode</p>
                  <p className={`font-semibold ${currentTask.swarmMode ? 'text-orange-600' : ''}`}>
                    {currentTask.swarmMode ? 'Swarm (100 agents)' : 'Standard'}
                  </p>
                </div>
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Expected Speedup</p>
                  <p className={`font-semibold ${currentTask.swarmMode ? 'text-orange-600' : ''}`}>
                    {currentTask.swarmMode ? `Typically ${currentTask.complexity.expectedSpeedup}x` : '1x'}
                  </p>
                </div>
              </div>
              
              {/* Swarm Mode Activation Banner */}
              {currentTask.swarmMode && (
                <div className="mt-4 p-3 bg-gradient-to-r from-orange-50 to-red-50 border-l-4 border-orange-500 rounded-r-lg">
                  <div className="flex items-center gap-2 text-orange-800">
                    <Flame className="h-5 w-5" />
                    <span className="font-semibold">🔥 Swarm Mode Active - 100 Agents Working in Parallel</span>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  {/* Actual Speedup (shown on completion) */}
                  {currentTask.actualSpeedup && (
                    <p className="text-orange-600 font-medium">
                      <span className="font-medium">Actual Speedup:</span> {currentTask.actualSpeedup}x
                    </p>
                  )}
                </div>
              </div>
            </div>

            {currentTask.executionPlan && (
              <>
                <Separator />
                <div>
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    Execution Plan
                    {currentTask.orchestrationModel && (
                      <span className="text-xs text-muted-foreground">
                        (Generated by Kimi K2.5)
                      </span>
                    )}
                  </h3>
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