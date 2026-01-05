// src/server-lib/agent-response-handler.ts
import { generateAgentResponse } from "@/client-lib/ai-agents-client";
import { AgentResponseSchema, AgentResponse } from "@/shared/models/types";

/**
 * Calls the agent API, validates the response against the schema, and provides a safe fallback.
 */
export async function getAgentResponseWithFallback(
    agentId: string,
    message: string,
    conversationHistory: { role: string; content: string }[] = []
): Promise<AgentResponse> {
    try {
        const raw = await generateAgentResponse(agentId, message, conversationHistory);
        // raw is expected to contain a `response` field with the assistant's reply
        const candidate: AgentResponse = {
            content: raw.response,
            role: "assistant",
        };
        // Validate using Zod schema; will throw if invalid
        AgentResponseSchema.parse(candidate);
        return candidate;
    } catch (e) {
        console.error("Agent response validation failed or API error:", e);
        // Return a generic fallback message
        return {
            content: "I’m having trouble generating a response right now. Please try again later.",
            role: "assistant",
        };
    }
}
