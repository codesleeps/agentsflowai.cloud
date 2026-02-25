/**
 * AI Safety Guard
 * Centralized safety checks combining content moderation and PII detection
 * Provides middleware-style protection for AI inputs and outputs
 */

import { moderateContent, moderateAndBlock, ModerationResult } from "./content-moderation";
import { detectPII, sanitizePII, PIIDetectionResult, PIICategory } from "./pii-detection";

export interface SafetyCheckOptions {
  // Moderation options
  enableModeration?: boolean;
  blockOnModeration?: boolean;
  
  // PII options
  enablePIIDetection?: boolean;
  blockOnPII?: boolean;
  allowedPIICategories?: PIICategory[];
  redactPII?: boolean;
  
  // General options
  logViolations?: boolean;
  customBlockMessage?: string;
}

export interface SafetyCheckResult {
  safe: boolean;
  blocked: boolean;
  reason?: string;
  moderationResult?: ModerationResult;
  piiResult?: PIIDetectionResult;
  sanitizedText?: string;
  violations: string[];
}

const DEFAULT_OPTIONS: SafetyCheckOptions = {
  enableModeration: true,
  blockOnModeration: true,
  enablePIIDetection: true,
  blockOnPII: true,
  allowedPIICategories: [],
  redactPII: false,
  logViolations: true,
  customBlockMessage: "Content blocked due to safety concerns",
};

/**
 * Comprehensive safety check for text content
 */
export async function checkSafety(
  text: string,
  options: SafetyCheckOptions = {}
): Promise<SafetyCheckResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const violations: string[] = [];
  let blocked = false;
  let reason: string | undefined;

  let moderationResult: ModerationResult | undefined;
  let piiResult: PIIDetectionResult | undefined;
  let sanitizedText: string | undefined;

  // Content Moderation Check
  if (opts.enableModeration) {
    moderationResult = await moderateContent(text);

    if (moderationResult.flagged) {
      violations.push(`Moderation: ${moderationResult.flagged_categories.join(", ")}`);
      
      if (opts.blockOnModeration) {
        blocked = true;
        reason = `Content flagged for: ${moderationResult.flagged_categories.join(", ")}`;
      }
    }
  }

  // PII Detection Check
  if (opts.enablePIIDetection && !blocked) {
    piiResult = detectPII(text);

    if (piiResult.hasPII) {
      const unauthorizedPII = piiResult.detections.filter(
        (d) => !opts.allowedPIICategories?.includes(d.category)
      );

      if (unauthorizedPII.length > 0) {
        violations.push(`PII detected: ${unauthorizedPII.map((d) => d.type).join(", ")}`);

        if (opts.blockOnPII) {
          blocked = true;
          reason = `Unauthorized PII detected: ${unauthorizedPII.map((d) => d.type).join(", ")}`;
        } else if (opts.redactPII) {
          sanitizedText = sanitizePII(text);
        }
      }
    }
  }

  // Log violations if enabled
  if (opts.logViolations && violations.length > 0) {
    console.warn("[Safety Guard] Violations detected:", {
      violations,
      timestamp: new Date().toISOString(),
      textPreview: text.substring(0, 100) + (text.length > 100 ? "..." : ""),
    });
  }

  return {
    safe: !blocked && violations.length === 0,
    blocked,
    reason: reason || opts.customBlockMessage,
    moderationResult,
    piiResult,
    sanitizedText,
    violations,
  };
}

/**
 * Middleware for API routes - checks request body
 */
export async function safetyMiddleware(
  body: Record<string, unknown>,
  fieldsToCheck: string[],
  options: SafetyCheckOptions = {}
): Promise<{
  allowed: boolean;
  result?: SafetyCheckResult;
  sanitizedBody?: Record<string, unknown>;
}> {
  const sanitizedBody = { ...body };

  for (const field of fieldsToCheck) {
    const value = body[field];
    if (typeof value === "string") {
      const result = await checkSafety(value, options);

      if (result.blocked) {
        return { allowed: false, result };
      }

      if (result.sanitizedText) {
        sanitizedBody[field] = result.sanitizedText;
      }
    }
  }

  return {
    allowed: true,
    sanitizedBody,
  };
}

/**
 * Rate limiting with safety tracking
 */
interface SafetyViolationRecord {
  timestamp: number;
  violations: string[];
}

const violationStore = new Map<string, SafetyViolationRecord[]>();

export async function checkSafetyWithRateLimit(
  userId: string,
  text: string,
  options: SafetyCheckOptions & {
    maxViolations?: number;
    windowMs?: number;
  } = {}
): Promise<SafetyCheckResult & { rateLimited: boolean }> {
  const { maxViolations = 5, windowMs = 3600000, ...safetyOptions } = options; // 1 hour default

  const result = await checkSafety(text, safetyOptions);

  // Track violations for rate limiting
  if (!result.safe) {
    const now = Date.now();
    const userViolations = violationStore.get(userId) || [];
    
    // Clean old violations
    const recentViolations = userViolations.filter(
      (v) => now - v.timestamp < windowMs
    );
    
    recentViolations.push({
      timestamp: now,
      violations: result.violations,
    });
    
    violationStore.set(userId, recentViolations);

    // Check rate limit
    if (recentViolations.length >= maxViolations) {
      return {
        ...result,
        blocked: true,
        reason: "Rate limit exceeded due to multiple safety violations",
        rateLimited: true,
      };
    }
  }

  return { ...result, rateLimited: false };
}

/**
 * Guard for AI agent inputs
 */
export async function guardAgentInput(
  prompt: string,
  agentId: string,
  options: SafetyCheckOptions = {}
): Promise<{
  allowed: boolean;
  sanitizedPrompt?: string;
  reason?: string;
}> {
  const result = await checkSafety(prompt, {
    enableModeration: true,
    blockOnModeration: true,
    enablePIIDetection: true,
    blockOnPII: false, // Redact instead of block
    redactPII: true,
    ...options,
  });

  if (result.blocked) {
    return {
      allowed: false,
      reason: result.reason,
    };
  }

  return {
    allowed: true,
    sanitizedPrompt: result.sanitizedText || prompt,
  };
}

/**
 * Guard for AI agent outputs
 */
export async function guardAgentOutput(
  response: string,
  options: SafetyCheckOptions = {}
): Promise<{
  safe: boolean;
  sanitizedResponse?: string;
  reason?: string;
}> {
  const result = await checkSafety(response, {
    enableModeration: true,
    blockOnModeration: false, // Don't block, just flag
    enablePIIDetection: true,
    blockOnPII: false,
    redactPII: true,
    ...options,
  });

  return {
    safe: result.safe,
    sanitizedResponse: result.sanitizedText || response,
    reason: result.violations.length > 0 ? result.violations.join("; ") : undefined,
  };
}

/**
 * Batch safety check for multiple texts
 */
export async function batchSafetyCheck(
  texts: string[],
  options: SafetyCheckOptions = {}
): Promise<SafetyCheckResult[]> {
  return Promise.all(texts.map((text) => checkSafety(text, options)));
}

/**
 * Get safety statistics for a user
 */
export function getUserSafetyStats(userId: string): {
  totalViolations: number;
  recentViolations: number;
  violationTypes: Record<string, number>;
} {
  const now = Date.now();
  const windowMs = 3600000; // 1 hour
  const userViolations = violationStore.get(userId) || [];
  
  const recentViolations = userViolations.filter(
    (v) => now - v.timestamp < windowMs
  );

  const violationTypes: Record<string, number> = {};
  for (const violation of userViolations) {
    for (const type of violation.violations) {
      violationTypes[type] = (violationTypes[type] || 0) + 1;
    }
  }

  return {
    totalViolations: userViolations.length,
    recentViolations: recentViolations.length,
    violationTypes,
  };
}

/**
 * Clear violation history for a user
 */
export function clearUserSafetyHistory(userId: string): void {
  violationStore.delete(userId);
}
