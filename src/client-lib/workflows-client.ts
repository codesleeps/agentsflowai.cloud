import useSWR from "swr";
import { integrationsClient } from "./shared";

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  status: "draft" | "active" | "paused" | "archived";
  is_template?: boolean;
  template_category?: string;
  execution_count: number;
  success_count: number;
  failure_count: number;
  last_executed_at?: string;
  created_at: string;
  updated_at: string;
  trigger_type: string;
  trigger_config: any;
  actions: WorkflowAction[];
}

export interface WorkflowAction {
  id?: string;
  actionType: string;
  actionConfig?: any;
  order: number;
  parent_action_id?: string;
  condition?: any;
}

export interface CreateWorkflowData {
  name: string;
  description?: string;
  status?: "draft" | "active" | "paused" | "archived";
  triggerType: string;
  triggerConfig?: any;
  actions: WorkflowAction[];
}

export interface UpdateWorkflowData {
  name?: string;
  description?: string;
  status?: "draft" | "active" | "paused" | "archived";
  triggerType?: string;
  triggerConfig?: any;
  actions?: WorkflowAction[];
}

// Get all workflows
export function useWorkflows() {
  return useSWR<Workflow[]>("/workflows", (url) =>
    integrationsClient.get(url).then((res) => res.data),
  );
}

// Get single workflow
export function useWorkflow(id: string) {
  return useSWR<Workflow>(id ? `/workflows/${id}` : null, (url) =>
    integrationsClient.get(url).then((res) => res.data),
  );
}

// Create workflow
export async function createWorkflow(
  data: CreateWorkflowData,
): Promise<Workflow> {
  const response = await integrationsClient.post<Workflow>("/workflows", data);
  return response.data;
}

// Update workflow
export async function updateWorkflow(
  id: string,
  data: UpdateWorkflowData,
): Promise<Workflow> {
  const response = await integrationsClient.put<Workflow>(
    `/workflows/${id}`,
    data,
  );
  return response.data;
}

// Delete workflow
export async function deleteWorkflow(id: string): Promise<void> {
  await integrationsClient.delete(`/workflows/${id}`);
}

// Execute workflow manually
export async function executeWorkflow(
  id: string,
  triggerData?: any,
): Promise<any> {
  const response = await integrationsClient.post(`/workflows/${id}/execute`, {
    triggerData,
  });
  return response.data;
}

// Get workflow execution logs
export function useWorkflowExecutions(workflowId: string) {
  return useSWR(`/workflows/${workflowId}/executions`, (url) =>
    integrationsClient.get(url).then((res) => res.data),
  );
}

// Get workflow templates
export function useWorkflowTemplates() {
  return useSWR<Workflow[]>("/workflows/templates", (url) =>
    integrationsClient.get(url).then((res) => res.data),
  );
}
