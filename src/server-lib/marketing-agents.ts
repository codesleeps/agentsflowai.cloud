/**
 * Marketing Automation Agents
 * 
 * Server-side logic for running autonomous marketing agents:
 * - Research Agent: Analyzes topics and creates content briefs
 * - SEO Content Agent: Generates SEO-optimized content from briefs
 * - Analytics Agent: (Future) Analyzes performance and suggests improvements
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
import { AI_TIMEOUTS } from "@/lib/timeout-config";

// ============================================
// AI PROVIDER UTILITIES
// ============================================

interface AICallResult {
  content: string;
  provider: string;
  model: string;
  tokensUsed: number;
  costUsd: number;
}

/**
 * Call AI with fallback chain for marketing agents
 * Uses Chinese models via OpenRouter as primary (cost-effective), falls back to others
 */
async function callAIWithFallback(
  systemPrompt: string,
  userPrompt: string
): Promise<AICallResult> {
  const errors: string[] = [];

  // Try OpenRouter Chinese models first (cost-effective, great for marketing content)
  if (process.env.OPENROUTER_API_KEY) {
    try {
      const openrouter = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: process.env.OPENROUTER_API_KEY,
        timeout: AI_TIMEOUTS.openrouter,
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

  // Try Anthropic Claude
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
        timeout: AI_TIMEOUTS.anthropic,
      });

      const message = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });

      const content = message.content[0];
      const text = content.type === "text" ? content.text : "";

      return {
        content: text,
        provider: "anthropic",
        model: "claude-3-haiku-20240307",
        tokensUsed: message.usage.input_tokens + message.usage.output_tokens,
        costUsd:
          (message.usage.input_tokens * 0.00025 +
            message.usage.output_tokens * 0.00125) /
          1000,
      };
    } catch (error: any) {
      errors.push(`Anthropic: ${error.message}`);
    }
  }

  throw new Error(
    `All AI providers failed for marketing agent. Errors: ${errors.join("; ")}`
  );
}

/**
 * Parse JSON from AI response (handles markdown code blocks)
 */
function parseJSONFromAI(text: string): any {
  // Try to extract JSON from markdown code blocks
  const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[1]);
  }

  // Try direct parse
  try {
    return JSON.parse(text);
  } catch {
    // Try to find JSON object in text
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      return JSON.parse(objectMatch[0]);
    }
    throw new Error("Could not parse JSON from AI response");
  }
}

// ============================================
// RESEARCH AGENT
// ============================================

export async function runResearchAgent(
  campaignId: string
): Promise<ResearchAgentOutput> {
  // Get campaign and create/update step
  const campaign = await db.marketingCampaign.findUnique({
    where: { id: campaignId },
  });

  if (!campaign) {
    throw new Error("Campaign not found");
  }

  // Find or create research step
  let step = await db.marketingCampaignStep.findFirst({
    where: {
      campaignId,
      type: "research",
    },
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

  // Update campaign status
  await db.marketingCampaign.update({
    where: { id: campaignId },
    data: { status: "in_progress" },
  });

  const input: ResearchAgentInput = {
    topic: campaign.topic,
    targetAudience: campaign.targetAudience || undefined,
    goal: campaign.goal || undefined,
    brandContext: campaign.brandVoice || undefined,
  };

  const systemPrompt = `You are a marketing research expert specializing in SEO and content strategy.
Your job is to analyze a topic and create a comprehensive content brief.

Return ONLY a valid JSON object with this exact structure:
{
  "summary": "High-level overview of the topic and opportunity",
  "targetAudience": "Detailed description of the target audience",
  "primaryGoal": "Main objective for this content",
  "keyMessages": ["Message 1", "Message 2", "Message 3"],
  "seoKeywords": {
    "primary": ["keyword1", "keyword2"],
    "secondary": ["keyword3", "keyword4"],
    "longTail": ["long tail keyword phrase 1", "long tail keyword phrase 2"]
  },
  "suggestedHeadlines": ["Headline option 1", "Headline option 2", "Headline option 3"],
  "outline": {
    "title": "Suggested main title",
    "sections": [
      {
        "heading": "Section heading",
        "description": "What this section should cover"
      }
    ]
  },
  "faqs": [
    {
      "question": "Common question about this topic",
      "answer": "Clear, concise answer"
    }
  ]
}`;

  const userPrompt = `Research this topic for a marketing campaign:

Topic: ${input.topic}
${input.targetAudience ? `Target Audience: ${input.targetAudience}` : ""}
${input.goal ? `Goal: ${input.goal}` : ""}
${input.brandContext ? `Brand Voice: ${input.brandContext}` : ""}

Create a comprehensive content research brief. Focus on:
1. Understanding the audience's pain points and needs
2. Identifying high-value SEO keywords
3. Creating an actionable content outline
4. Addressing common questions

Return ONLY the JSON object, no other text.`;

  try {
    const result = await callAIWithFallback(systemPrompt, userPrompt);
    const output: ResearchAgentOutput = parseJSONFromAI(result.content);

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

    // Create next step (content generation)
    await db.marketingCampaignStep.create({
      data: {
        campaignId,
        type: "content",
        status: "pending",
      },
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

    await db.marketingCampaign.update({
      where: { id: campaignId },
      data: { status: "error" },
    });

    throw error;
  }
}

// ============================================
// SEO CONTENT AGENT
// ============================================

export async function runContentAgent(
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

  const systemPrompt = `You are an expert SEO content writer and copywriter.
Your job is to create engaging, SEO-optimized content based on a research brief.

Return ONLY a valid JSON object with this exact structure:
{
  "title": "Compelling, SEO-optimized title",
  "slugSuggestion": "url-friendly-slug",
  "meta": {
    "description": "155-character meta description",
    "keywords": ["keyword1", "keyword2"]
  },
  "contentSections": [
    {
      "heading": "Section heading",
      "body": "Section content in markdown format with proper formatting"
    }
  ],
  "callToAction": {
    "text": "Clear CTA text",
    "urlSuggestion": "/suggested-url"
  },
  "socialSnippets": {
    "twitter": "280-character tweet",
    "linkedin": "LinkedIn post text",
    "emailSubject": "Email subject line",
    "emailPreviewText": "Email preview text"
  },
  "estimatedReadTime": 5
}`;

  const userPrompt = `Create SEO-optimized content based on this research brief:

Topic: ${input.topic}
Target Audience: ${input.targetAudience}
Goal: ${input.goal}

Primary Keywords: ${brief.seoKeywords.primary.join(", ")}
Secondary Keywords: ${brief.seoKeywords.secondary.join(", ")}

Outline:
${brief.outline.sections.map((s) => `- ${s.heading}: ${s.description}`).join("\n")}

Key Messages:
${brief.keyMessages.map((m, i) => `${i + 1}. ${m}`).join("\n")}

${input.brandVoice ? `Brand Voice: ${input.brandVoice}` : ""}

Create comprehensive, engaging content that:
1. Follows the outline structure
2. Naturally incorporates SEO keywords
3. Addresses the target audience's needs
4. Includes clear CTAs
5. Is formatted in markdown with proper headings (##, ###)

Return ONLY the JSON object, no other text.`;

  try {
    const result = await callAIWithFallback(systemPrompt, userPrompt);
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

    await db.marketingCampaign.update({
      where: { id: campaignId },
      data: { status: "error" },
    });

    throw error;
  }
}

// ============================================
// CAMPAIGN ORCHESTRATION
// ============================================

/**
 * Run the next pending step in a campaign
 */
export async function runNextCampaignStep(campaignId: string): Promise<{
  stepType: "research" | "content" | null;
  output: ResearchAgentOutput | SEOContentAgentOutput | null;
}> {
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

  // Check if research step exists and is pending
  const researchStep = campaign.steps.find((s) => s.type === "research");
  if (!researchStep || researchStep.status === "pending") {
    const output = await runResearchAgent(campaignId);
    return { stepType: "research", output };
  }

  // Check if content step exists and is pending
  const contentStep = campaign.steps.find((s) => s.type === "content");
  if (
    researchStep.status === "done" &&
    (!contentStep || contentStep.status === "pending")
  ) {
    const output = await runContentAgent(campaignId);
    return { stepType: "content", output };
  }

  // No more steps to run
  return { stepType: null, output: null };
}
