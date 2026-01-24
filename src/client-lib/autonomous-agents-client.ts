/**
 * Autonomous Agent Client Library
 * 
 * Easy-to-use client functions for interacting with the autonomous agent orchestration system
 */

import { apiClient } from "./api-client";

import { useState, useEffect } from "react";

export interface AutonomousTaskCreation {
  agentId: string;
  prompt: string;
}

export interface AutonomousTaskStatus {
  taskId: string;
  currentState: string;
  originalPrompt: string;
  complexity: {
    level: 'simple' | 'medium' | 'complex';
    score: number;
    estimatedSteps: number;
    reasoning: string;
    suggestedTools: string[];
  };
  progress: {
    percentage: number;
    completedSteps: number;
    totalSteps: number;
    estimatedTimeRemaining: number;
  };
  metadata: {
    startTime: string;
    toolsUsed: string[];
    totalCost: number;
    totalDuration: number;
  };
  analysisResults?: any;
  executionResults?: any[];
  stateTransitions?: any[];
}

export interface AutonomousTaskResponse {
  taskId: string;
  status: string;
  message: string;
}

// ==================== CLIENT FUNCTIONS ====================

/**
 * Create a new autonomous task
 */
export async function createAutonomousTask(
  agentId: string,
  prompt: string
): Promise<AutonomousTaskResponse> {
  const response = await apiClient.post("/autonomous/tasks", {
    agentId,
    prompt
  });
  return response.data;
}

/**
 * Get the status of an autonomous task
 */
export async function getAutonomousTaskStatus(
  taskId: string
): Promise<AutonomousTaskStatus> {
  const response = await apiClient.get(`/autonomous/tasks?taskId=${taskId}`);
  return response.data;
}

/**
 * Approve a task that is awaiting approval
 */
export async function approveAutonomousTask(taskId: string): Promise<void> {
  await apiClient.post(`/autonomous/tasks/${taskId}/approve`);
}

/**
 * Cancel a running task
 */
export async function cancelAutonomousTask(taskId: string): Promise<void> {
  await apiClient.post(`/autonomous/tasks/${taskId}/cancel`);
}

/**
 * Pause a running task
 */
export async function pauseAutonomousTask(taskId: string): Promise<void> {
  await apiClient.post(`/autonomous/tasks/${taskId}/pause`);
}

/**
 * Resume a paused task
 */
export async function resumeAutonomousTask(taskId: string): Promise<void> {
  await apiClient.post(`/autonomous/tasks/${taskId}/resume`);
}

/**
 * Retry a failed task
 */
export async function retryAutonomousTask(taskId: string): Promise<void> {
  await apiClient.post(`/autonomous/tasks/${taskId}/retry`);
}

// ==================== HOOKS ====================

/**
 * Hook for creating autonomous tasks
 */
export function useAutonomousTask() {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createTask = async (agentId: string, prompt: string) => {
    setIsCreating(true);
    setError(null);
    
    try {
      const result = await createAutonomousTask(agentId, prompt);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create task";
      setError(errorMessage);
      throw err;
    } finally {
      setIsCreating(false);
    }
  };

  return {
    createTask,
    isCreating,
    error
  };
}

/**
 * Hook for monitoring task status
 */
export function useAutonomousTaskStatus(taskId: string | null) {
  const [status, setStatus] = useState<AutonomousTaskStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!taskId) {
      setStatus(null);
      return;
    }

    const fetchStatus = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const result = await getAutonomousTaskStatus(taskId);
        setStatus(result);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch status";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchStatus();

    // Poll for updates every 2 seconds while task is active
    const interval = setInterval(() => {
      if (status?.currentState && 
          !['COMPLETED', 'FAILED', 'CANCELLED'].includes(status.currentState)) {
        fetchStatus();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [taskId, status?.currentState]);

  return {
    status,
    isLoading,
    error,
    refresh: () => taskId && getAutonomousTaskStatus(taskId).then(setStatus)
  };
}

// ==================== REAL-TIME MONITORING ====================

/**
 * WebSocket connection for real-time task updates
 */
class AutonomousTaskMonitor {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect() {
    if (typeof window === 'undefined') return; // Server-side check
    
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/autonomous/ws`;
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('[Monitor] Connected to autonomous task updates');
      this.reconnectAttempts = 0;
    };
    
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.notifyListeners(data.taskId, data);
      } catch (error) {
        console.error('[Monitor] Failed to parse WebSocket message:', error);
      }
    };
    
    this.ws.onclose = () => {
      console.log('[Monitor] Disconnected from autonomous task updates');
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => {
          this.reconnectAttempts++;
          this.connect();
        }, Math.pow(2, this.reconnectAttempts) * 1000); // Exponential backoff
      }
    };
    
    this.ws.onerror = (error) => {
      console.error('[Monitor] WebSocket error:', error);
    };
  }

  subscribe(taskId: string, callback: (data: any) => void) {
    if (!this.listeners.has(taskId)) {
      this.listeners.set(taskId, new Set());
    }
    this.listeners.get(taskId)!.add(callback);
  }

  unsubscribe(taskId: string, callback: (data: any) => void) {
    const listeners = this.listeners.get(taskId);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.listeners.delete(taskId);
      }
    }
  }

  private notifyListeners(taskId: string, data: any) {
    const listeners = this.listeners.get(taskId);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners.clear();
  }
}

// Singleton instance
export const autonomousTaskMonitor = new AutonomousTaskMonitor();

// Auto-connect when module loads
if (typeof window !== 'undefined') {
  autonomousTaskMonitor.connect();
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Format time duration in human-readable format
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(4)}`;
}

/**
 * Get status badge color based on task state
 */
export function getStatusColor(state: string): string {
  switch (state) {
    case 'ANALYZING':
    case 'PLANNING':
      return 'blue';
    case 'AWAITING_APPROVAL':
      return 'yellow';
    case 'EXECUTING':
      return 'purple';
    case 'VERIFYING':
      return 'orange';
    case 'COMPLETED':
      return 'green';
    case 'FAILED':
      return 'red';
    case 'CANCELLED':
      return 'gray';
    case 'PAUSED':
      return 'indigo';
    default:
      return 'gray';
  }
}

/**
 * Get status display text
 */
export function getStatusText(state: string): string {
  const statusMap: Record<string, string> = {
    'ANALYZING': 'Analyzing',
    'PLANNING': 'Planning',
    'AWAITING_APPROVAL': 'Awaiting Approval',
    'EXECUTING': 'Executing',
    'VERIFYING': 'Verifying',
    'COMPLETED': 'Completed',
    'FAILED': 'Failed',
    'CANCELLED': 'Cancelled',
    'PAUSED': 'Paused'
  };
  return statusMap[state] || state;
}