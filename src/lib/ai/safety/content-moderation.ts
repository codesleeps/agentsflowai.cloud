/**
 * AI Content Moderation Service
 * Detects and filters harmful content, toxic language, and inappropriate material
 * Uses OpenAI Moderation API and custom rules
 */

import { getProviderKey } from "@/lib/provider-config";

// Categories for moderation
export interface ModerationCategories {
  harassment: boolean;
  harassment_threatening: boolean;
  hate: boolean;
  hate_threatening: boolean;
  self_harm: boolean;
  self_harm_instructions: boolean;
  sexual: boolean;
  sexual_minors: boolean;
  violence: boolean;
  violence_graphic: boolean;
}

export interface ModerationResult {
  flagged: boolean;
  categories: ModerationCategories;
  category_scores: Record<keyof ModerationCategories, number>;
  flagged_categories: string[];
  severity: "none" | "low" | "medium" | "high";
}

interface OpenAIModerationResponse {
  id: string;
  model: string;
  results: Array<{
    flagged: boolean;
    categories: ModerationCategories;
    category_scores: Record<keyof ModerationCategories, number>;
  }>;
}

// Thresholds for flagging content
const MODERATION_THRESHOLDS = {
  harassment: 0.5,
  harassment_threatening: 0.3,
  hate: 0.5,
  hate_threatening: 0.3,
  self_harm: 0.3,
  self_harm_instructions: 0.1,
  sexual: 0.7,
  sexual_minors: 0.1,
  violence: 0.5,
  violence_graphic: 0.3,
};

/**
 * Check content using OpenAI Moderation API
 */
export async function moderateContent(text: string): Promise<ModerationResult> {
  const apiKey = getProviderKey("openai");
  
  if (!apiKey) {
    // Fallback to local moderation if no API key
    return localModeration(text);
  }

  try {
    const response = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        input: text,
        model: "text-moderation-latest",
      }),
    });

    if (!response.ok) {
      throw new Error(`Moderation API error: ${response.status}`);
    }

    const data: OpenAIModerationResponse = await response.json();
    const result = data.results[0];

    // Determine severity based on scores
    const maxScore = Math.max(...Object.values(result.category_scores));
    let severity: "none" | "low" | "medium" | "high" = "none";
    if (maxScore > 0.8) severity = "high";
    else if (maxScore > 0.5) severity = "medium";
    else if (maxScore > 0.2) severity = "low";

    // Get flagged categories
    const flaggedCategories = Object.entries(result.categories)
      .filter(([_, flagged]) => flagged)
      .map(([category]) => category);

    return {
      flagged: result.flagged,
      categories: result.categories,
      category_scores: result.category_scores,
      flagged_categories: flaggedCategories,
      severity,
    };
  } catch (error) {
    console.error("Moderation API error:", error);
    // Fallback to local moderation on API failure
    return localModeration(text);
  }
}

/**
 * Local moderation as fallback (pattern-based)
 */
function localModeration(text: string): ModerationResult {
  const lowerText = text.toLowerCase();
  
  // Simple pattern matching for common toxic patterns
  const patterns: Record<keyof ModerationCategories, RegExp[]> = {
    harassment: [/\b(stupid|idiot|dumb|moron)\b/i],
    harassment_threatening: [/\b(kill yourself|kys|die)\b/i],
    hate: [/\b(racist|nazi|hitler)\b/i],
    hate_threatening: [/\b(will kill|going to kill|murder you)\b/i],
    self_harm: [/\b(cut myself|self.?harm|suicide)\b/i],
    self_harm_instructions: [/\b(how to (die|kill|end it))\b/i],
    sexual: [/\b(porn|sex|naked|nude)\b/i],
    sexual_minors: [/\b(child porn|underage|minor)\b/i],
    violence: [/\b(kill|murder|attack|hurt)\b/i],
    violence_graphic: [/\b(blood|gore|mutilate)\b/i],
  };

  const categories: ModerationCategories = {
    harassment: false,
    harassment_threatening: false,
    hate: false,
    hate_threatening: false,
    self_harm: false,
    self_harm_instructions: false,
    sexual: false,
    sexual_minors: false,
    violence: false,
    violence_graphic: false,
  };

  const category_scores: Record<keyof ModerationCategories, number> = {
    harassment: 0,
    harassment_threatening: 0,
    hate: 0,
    hate_threatening: 0,
    self_harm: 0,
    self_harm_instructions: 0,
    sexual: 0,
    sexual_minors: 0,
    violence: 0,
    violence_graphic: 0,
  };

  let flagged = false;

  for (const [category, regexes] of Object.entries(patterns)) {
    for (const regex of regexes) {
      if (regex.test(lowerText)) {
        (categories as unknown as Record<string, boolean>)[category] = true;
        (category_scores as unknown as Record<string, number>)[category] = 0.8;
        flagged = true;
        break;
      }
    }
  }

  const flaggedCategories = Object.entries(categories)
    .filter(([_, flagged]) => flagged)
    .map(([category]) => category);

  const maxScore = Math.max(...Object.values(category_scores));
  let severity: "none" | "low" | "medium" | "high" = "none";
  if (maxScore > 0.8) severity = "high";
  else if (maxScore > 0.5) severity = "medium";
  else if (maxScore > 0.2) severity = "low";

  return {
    flagged,
    categories,
    category_scores,
    flagged_categories: flaggedCategories,
    severity,
  };
}

/**
 * Batch moderate multiple texts
 */
export async function moderateBatch(texts: string[]): Promise<ModerationResult[]> {
  return Promise.all(texts.map((text) => moderateContent(text)));
}

/**
 * Check if content passes moderation
 */
export function passesModeration(result: ModerationResult): boolean {
  return !result.flagged;
}

/**
 * Get human-readable moderation reason
 */
export function getModerationReason(result: ModerationResult): string {
  if (!result.flagged) return "Content is safe";

  const categoryLabels: Record<string, string> = {
    harassment: "harassment",
    harassment_threatening: "threatening harassment",
    hate: "hate speech",
    hate_threatening: "threatening hate speech",
    self_harm: "self-harm content",
    self_harm_instructions: "self-harm instructions",
    sexual: "sexual content",
    sexual_minors: "content involving minors",
    violence: "violent content",
    violence_graphic: "graphic violence",
  };

  const categories = result.flagged_categories
    .map((c) => categoryLabels[c] || c)
    .join(", ");

  return `Content flagged for: ${categories}`;
}

/**
 * Sanitize content by replacing flagged terms
 */
export function sanitizeContent(
  text: string,
  replacement: string = "[REDACTED]"
): string {
  // List of terms to sanitize
  const sensitivePatterns = [
    /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // Credit card
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
    /\b\d{3}-\d{3}-\d{4}\b/g, // Phone
  ];

  let sanitized = text;
  for (const pattern of sensitivePatterns) {
    sanitized = sanitized.replace(pattern, replacement);
  }

  return sanitized;
}

/**
 * Middleware-style function to moderate and optionally block content
 */
export async function moderateAndBlock(
  text: string,
  options: {
    blockOnFlag?: boolean;
    logViolations?: boolean;
    customThreshold?: number;
  } = {}
): Promise<{
  allowed: boolean;
  result: ModerationResult;
  reason?: string;
}> {
  const { blockOnFlag = true, logViolations = true } = options;

  const result = await moderateContent(text);

  if (result.flagged && logViolations) {
    // Log the violation (in production, save to database)
    console.warn("Content moderation violation:", {
      severity: result.severity,
      categories: result.flagged_categories,
      timestamp: new Date().toISOString(),
    });
  }

  const allowed = !blockOnFlag || !result.flagged;

  return {
    allowed,
    result,
    reason: allowed ? undefined : getModerationReason(result),
  };
}
