import useSWR, { mutate } from "swr";
import { integrationsClient } from "./shared";

export interface UserAIAgent {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  icon: string;
  category: string;
  system_prompt: string;
  model: string;
  provider: string;
  supported_providers: Array<{
    provider: string;
    model: string;
    priority: number;
  }>;
  default_provider: string;
  cost_tier: "free" | "low" | "medium" | "high";
  is_active: boolean;
  is_public: boolean;
  usage_count: number;
  last_used_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUserAIAgentData {
  name: string;
  description?: string;
  icon?: string;
  category?: string;
  systemPrompt: string;
  model?: string;
  provider?: string;
  supportedProviders?: Array<{
    provider: string;
    model: string;
    priority: number;
  }>;
  defaultProvider?: string;
  costTier?: "free" | "low" | "medium" | "high";
  isPublic?: boolean;
}

export interface UpdateUserAIAgentData extends Partial<CreateUserAIAgentData> {
  isActive?: boolean;
}

// Fetch all user AI agents
export function useUserAIAgents() {
  return useSWR<UserAIAgent[]>("/user/ai-agents", (url) =>
    integrationsClient.get(url).then((res) => res.data),
  );
}

// Fetch specific user AI agent
export function useUserAIAgent(id: string) {
  return useSWR<UserAIAgent>(id ? `/user/ai-agents/${id}` : null, (url) =>
    integrationsClient.get(url).then((res) => res.data),
  );
}

// Create new user AI agent
export async function createUserAIAgent(
  data: CreateUserAIAgentData,
): Promise<UserAIAgent> {
  try {
    const response = await integrationsClient.post<UserAIAgent>(
      "/user/ai-agents",
      data,
    );
    await mutate("/user/ai-agents"); // Refresh the list
    return response.data;
  } catch (error) {
    console.error("Failed to create AI agent:", error);
    throw error;
  }
}

// Update user AI agent
export async function updateUserAIAgent(
  id: string,
  data: UpdateUserAIAgentData,
): Promise<UserAIAgent> {
  try {
    const response = await integrationsClient.put<UserAIAgent>(
      `/user/ai-agents/${id}`,
      data,
    );
    await mutate("/user/ai-agents"); // Refresh the list
    await mutate(`/user/ai-agents/${id}`); // Refresh the specific agent
    return response.data;
  } catch (error) {
    console.error("Failed to update AI agent:", error);
    throw error;
  }
}

// Delete user AI agent
export async function deleteUserAIAgent(id: string): Promise<void> {
  try {
    await integrationsClient.delete(`/user/ai-agents/${id}`);
    await mutate("/user/ai-agents"); // Refresh the list
    await mutate(`/user/ai-agents/${id}`, null); // Remove from cache
  } catch (error) {
    console.error("Failed to delete AI agent:", error);
    throw error;
  }
}

// Generate response using user AI agent (reuse existing function but for user agents)
export async function generateUserAIAgentResponse(
  agentId: string,
  message: string,
  conversationHistory: Array<{ role: string; content: string }> = [],
): Promise<{
  response: string;
  model: string;
  agentId: string;
  agentName: string;
}> {
  try {
    const response = await integrationsClient.post("/ai/agents", {
      agentId,
      message,
      conversationHistory,
    });
    return response.data;
  } catch (error) {
    console.error("Failed to generate AI agent response:", error);
    throw error;
  }
}
