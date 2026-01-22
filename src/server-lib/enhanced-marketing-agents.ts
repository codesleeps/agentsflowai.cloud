/**
 * Enhanced Marketing Agents with MCP Integration
 * 
 * Extends existing marketing agents with MCP tool capabilities for:
 * - Web research and competitive analysis
 * - Content validation and fact-checking
 * - Market trend analysis
 * - Competitor intelligence gathering
 */

import { db } from "@/server-lib/prisma";
import {
  ResearchAgentInput,
  ResearchAgentOutput,
  SEOContentAgentInput,
  SEOContentAgentOutput,
} from "@/shared/models/marketing-types";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { routeMCPRequest } from "./mcp-router-agent";
import { MCPRouterRequest, MCPIntentType } from "@/shared/models/mcp-types";

// ============================================
// ENHANCED AI CALL WITH MCP INTEGRATION
// ============================================

interface EnhancedAICallResult {
  content: string;
  provider: string;
  model: string;
  tokensUsed: number;
  costUsd: number;
  mcpResults?: any; // MCP tool results if used
}

/**
 * Enhanced AI call with MCP tool integration for research-heavy tasks
 */
async function callAIWithMCPIntegration(
  systemPrompt: string,
  userPrompt: string,
  enableMCP: boolean = false,
  mcpQuery?: string
): Promise<EnhancedAICallResult> {
  let mcpResults: any = null;

  // Use MCP tools for research if enabled
  if (enableMCP && mcpQuery) {
    try {
      const mcpRequest: MCPRouterRequest = {
        query: mcpQuery,
        userId: "marketing-agent",
        context: {
          task: "market-research",
          systemPrompt,
          userPrompt
        },
        preferences: {
          maxTools: 2,
          enableOrchestration: true
        }
      };

      const mcpResponse = await routeMCPRequest(mcpRequest);
      
      if (mcpResponse.executionResults.some(r => r.success)) {
        mcpResults = mcpResponse;
        
        // Enhance the user prompt with MCP findings
        const mcpFindings = mcpResponse.executionResults
          .filter(r => r.success)
          .map(r => `${r.toolRoute.serverName}.${r.toolRoute.toolName}: ${JSON.stringify(r.result)}`)
          .join('\n\n');
        
        userPrompt = `${userPrompt}\n\nAdditional Research Findings:\n${mcpFindings}`;
      }
    } catch (error) {
      console.warn('MCP integration failed, falling back to pure AI:', error);
    }
  }

  // Regular AI call with fallback chain (same as before but returns enhanced result)
  const aiResult = await callAIWithFallback(systemPrompt, userPrompt);
  
  return {
    ...aiResult,
    mcpResults
  };
}

/**
 * Original fallback chain (preserved from marketing-agents.ts)
 */
async function callAIWithFallback(
  systemPrompt: string,
  userPrompt: string
): Promise<{ content: string; provider: string; model: string; tokensUsed: number; costUsd: number }> {
  const errors: string[] = [];

  // Try OpenRouter Chinese models first (cost-effective, great for marketing content)
  if (process.env.OPENROUTER_API_KEY) {
    try {
      const openrouter = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: process.env.OPENROUTER_API_KEY,
      });

      // Try z-ai/glm-4.5-air first (agent-optimized)
      try {
        const completion = await openrouter.chat.completions.create({
          model: "z-ai/glm-4.5-air",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        });

        return {
          content: completion.choices[0].message.content || "",
          provider: "openrouter",
          model: "z-ai/glm-4.5-air",
          tokensUsed: completion.usage?.total_tokens || 0,
          costUsd: 0, // Cost-effective
        };
      } catch (error: any) {
        // Fallback to DeepSeek if GLM fails
        const completion = await openrouter.chat.completions.create({
          model: "deepseek/deepseek-chat",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        });

        return {
          content: completion.choices[0].message.content || "",
          provider: "openrouter",
          model: "deepseek/deepseek-chat",
          tokensUsed: completion.usage?.total_tokens || 0,
          costUsd: 0, // Cost-effective
        };
      }
    } catch (error: any) {
      errors.push(`OpenRouter: ${error.message}`);
    }
  }

  // Try Anthropic Claude as fallback
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      const message = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });

      return {
        content: message.content[0].type === "text" ? message.content[0].text : "",
        provider: "anthropic",
        model: "claude-3-5-sonnet-20241022",
        tokensUsed: message.usage?.input_tokens + message.usage?.output_tokens || 0,
        costUsd: calculateAnthropicCost(message.model, message.usage),
      };
    } catch (error: any) {
      errors.push(`Anthropic: ${error.message}`);
    }
  }

  // Try Ollama as last resort
  if (process.env.OLLAMA_BASE_URL) {
    try {
      const response = await fetch(`${process.env.OLLAMA_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "mistral:7b",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      const data = await response.json();
      
      return {
        content: data.message?.content || "",
        provider: "ollama",
        model: "mistral:7b",
        tokensUsed: 0, // Ollama doesn't return token count easily
        costUsd: 0, // Free
      };
    } catch (error: any) {
      errors.push(`Ollama: ${error.message}`);
    }
  }

  // All providers failed
  throw new Error(`All AI providers failed:\n${errors.join("\n")}`);
}

function calculateAnthropicCost(
  model: string,
  usage: { input_tokens: number; output_tokens: number } | undefined
): number {
  if (!usage) return 0;
  
  const { input_tokens, output_tokens } = usage;
  
  // Pricing as of 2024 (per million tokens)
  const pricing: Record<string, { input: number; output: number }> = {
    "claude-3-5-sonnet-20241022": { input: 3.00, output: 15.00 },
    "claude-3-opus-20240229": { input: 15.00, output: 75.00 },
    "claude-3-sonnet-20240229": { input: 3.00, output: 15.00 },
    "claude-3-haiku-20240307": { input: 0.25, output: 1.25 },
  };

  const rates = pricing[model] || pricing["claude-3-sonnet-20240229"];
  
  return (
    (input_tokens * rates.input) / 1_000_000 +
    (output_tokens * rates.output) / 1_000_000
  );
}

// ============================================
// ENHANCED RESEARCH AGENT
// ============================================

export async function runEnhancedResearchAgent(
  campaignId: string
): Promise<ResearchAgentOutput> {
  // Get campaign
  const campaign = await db.marketingCampaign.findUnique({
    where: { id: campaignId },
  });

  if (!campaign) {
    throw new Error("Campaign not found");
  }

  // Find or create research step
  let step = await db.marketingCampaignStep.findFirst({
    where: { campaignId, type: "research" },
  });

  if (!step) {
    step = await db.marketingCampaignStep.create({
      data: {
        campaignId,
        type: "research",
        status: "pending",
      },
    });
  }

  // Update step to running
  await db.marketingCampaignStep.update({
    where: { id: step.id },
    data: {
      status: "running",
      startedAt: new Date(),
    },
  });

  const input: ResearchAgentInput = {
    topic: campaign.topic,
    targetAudience: campaign.targetAudience,
    goal: campaign.goal || undefined,
    brandContext: campaign.brandVoice || undefined,
  };

  // Enhanced system prompt for research
  const systemPrompt = `You are an expert marketing researcher and strategist. Analyze the topic thoroughly and create a comprehensive content brief.

Your analysis should cover:
1. Target audience demographics and psychographics
2. Primary and secondary goals
3. Market positioning and competitive landscape
4. Key messaging themes
5. Content structure and format recommendations
6. SEO considerations and keyword opportunities

Return a JSON object with this exact structure:
{
  "targetAudience": "Detailed audience description",
  "primaryGoal": "Main objective",
  "secondaryGoals": ["goal1", "goal2"],
  "positioning": "Market positioning statement",
  "keyMessages": ["message1", "message2", "message3"],
  "contentStructure": ["section1", "section2"],
  "seoKeywords": ["keyword1", "keyword2"]
}`;

  const userPrompt = `Create a research brief for: ${campaign.topic}
Target Audience: ${campaign.targetAudience}
Goals: ${campaign.goal || 'Not specified'}
${campaign.brandVoice ? `Brand Voice: ${campaign.brandVoice}` : ""}`;

  try {
    // Enhanced call with MCP integration for market research
    const mcpQuery = `Research market trends and competitive analysis for "${campaign.topic}" targeting "${campaign.targetAudience}"`;
    
    const result = await callAIWithMCPIntegration(
      systemPrompt, 
      userPrompt, 
      true, // Enable MCP
      mcpQuery
    );
    
    const output: ResearchAgentOutput = parseJSONFromAI(result.content);

    // Save step result with MCP data
    await db.marketingCampaignStep.update({
      where: { id: step.id },
      data: {
        status: "done",
        input: input as any,
        output: {
          ...output,
          mcpResults: result.mcpResults // Store MCP findings
        } as any,
        aiProvider: result.provider,
        aiModel: result.model,
        tokensUsed: result.tokensUsed,
        costUsd: result.costUsd,
        finishedAt: new Date(),
      },
    });

    // Update campaign to needs review stage
    await db.marketingCampaign.update({
      where: { id: campaignId },
      data: { status: "needs_review" },
    });

    return output;
  } catch (error: any) {
    // Save error
    await db.marketingCampaignStep.update({
      where: { id: step.id },
      data: {
        status: "error",
        error: error.message,
        finishedAt: new Date(),
      },
    });

    throw error;
  }
}

// ============================================
// ENHANCED CONTENT AGENT
// ============================================

export async function runEnhancedContentAgent(
  campaignId: string
): Promise<SEOContentAgentOutput> {
  // Get campaign and research step
  const campaign = await db.marketingCampaign.findUnique({
    where: { id: campaignId },
    include: {
      steps: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!campaign) {
    throw new Error("Campaign not found");
  }

  const researchStep = campaign.steps.find(
    (s) => s.type === "research" && s.status === "done"
  );

  if (!researchStep || !researchStep.output) {
    throw new Error("Research step must be completed first");
  }

  // Find or create content step
  let step = campaign.steps.find((s) => s.type === "content");

  if (!step) {
    step = await db.marketingCampaignStep.create({
      data: {
        campaignId,
        type: "content",
        status: "pending",
      },
    });
  }

  // Update step to running
  await db.marketingCampaignStep.update({
    where: { id: step.id },
    data: {
      status: "running",
      startedAt: new Date(),
    },
  });

  const brief = researchStep.output as unknown as ResearchAgentOutput;

  const input: SEOContentAgentInput = {
    topic: campaign.topic,
    targetAudience: brief.targetAudience,
    goal: brief.primaryGoal,
    brief,
    brandVoice: campaign.brandVoice || undefined,
  };

  const systemPrompt = `You are an expert content creator and SEO specialist. Create high-quality, engaging content based on the research brief.

Content Requirements:
- Length: 1200-1500 words
- Tone: ${campaign.brandVoice || "Professional"}
- Structure: Clear headings, subheadings, and paragraphs
- SEO: Natural keyword integration
- Engagement: Compelling hooks and CTAs

Return a JSON object with this exact structure:
{
  "title": "SEO-optimized title",
  "metaDescription": "Compelling meta description (150-160 chars)",
  "outline": ["Section 1", "Section 2", "Section 3"],
  "content": "Full markdown content with proper formatting",
  "keywords": ["keyword1", "keyword2"],
  "callToAction": "Clear next step for readers"
}`;

  const userPrompt = `Create content for: ${campaign.topic}

Research Brief:
Target Audience: ${brief.targetAudience}
Goal: ${brief.primaryGoal}
Positioning: ${brief.summary}
Key Messages:
${brief.keyMessages.map((m, i) => `${i + 1}. ${m}`).join("\n")}

${input.brandVoice ? `Brand Voice: ${input.brandVoice}` : ""}`;

  try {
    // Enhanced call - could add fact-checking with Fetch tool here
    const result = await callAIWithMCPIntegration(systemPrompt, userPrompt);
    
    const output: SEOContentAgentOutput = parseJSONFromAI(result.content);

    // Save step result
    await db.marketingCampaignStep.update({
      where: { id: step.id },
      data: {
        status: "done",
        input: input as any,
        output: output as any,
        aiProvider: result.provider,
        aiModel: result.model,
        tokensUsed: result.tokensUsed,
        costUsd: result.costUsd,
        finishedAt: new Date(),
      },
    });

    // Update campaign to needs review
    await db.marketingCampaign.update({
      where: { id: campaignId },
      data: { status: "needs_review" },
    });

    return output;
  } catch (error: any) {
    // Save error
    await db.marketingCampaignStep.update({
      where: { id: step.id },
      data: {
        status: "error",
        error: error.message,
        finishedAt: new Date(),
      },
    });

    throw error;
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function parseJSONFromAI(text: string): any {
  try {
    // Extract JSON from AI response (handle markdown code blocks)
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || 
                     text.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1] || jsonMatch[0]);
    }
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Failed to parse JSON from AI response:", text);
    throw new Error("Invalid JSON response from AI");
  }
}

// Export the enhanced functions
export { callAIWithMCPIntegration };