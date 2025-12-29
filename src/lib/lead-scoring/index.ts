import type { Lead } from "@/shared/models/types";
import { prisma } from "@/server-lib/prisma";

// Database Lead type (with string status)
type DbLead = {
  id: string;
  created_at: Date;
  name: string;
  source: string;
  updated_at: Date;
  email: string;
  company: string;
  phone: string;
  status: string;
  score: number;
  budget: string;
  timeline: string;
  interests: string[];
  notes: string;
  qualified_at: Date;
};

// Scoring factors and their weights
const SCORING_FACTORS = {
  // Demographic factors (40% total)
  companySize: { weight: 15, maxScore: 15 },
  jobTitle: { weight: 12, maxScore: 12 },
  industry: { weight: 8, maxScore: 8 },
  location: { weight: 5, maxScore: 5 },

  // Behavioral factors (35% total)
  sourceQuality: { weight: 15, maxScore: 15 },
  engagement: { weight: 10, maxScore: 10 },
  budget: { weight: 6, maxScore: 6 },
  timeline: { weight: 4, maxScore: 4 },

  // Intent factors (25% total)
  intentSignals: { weight: 15, maxScore: 15 },
  leadStatus: { weight: 10, maxScore: 10 },
};

// Scoring rules
const SCORING_RULES = {
  // Company size scoring
  companySize: {
    "10001+": 15, // Enterprise
    "1001-10000": 12, // Large
    "501-1000": 10, // Medium-Large
    "101-500": 8, // Medium
    "51-100": 6, // Small-Medium
    "11-50": 4, // Small
    "1-10": 2, // Micro
    unknown: 0,
  },

  // Job title scoring (seniority level)
  jobTitle: {
    executive: 12, // CEO, CTO, CFO, etc.
    director: 10, // Director, VP, Head
    manager: 8, // Manager, Lead, Senior
    specialist: 6, // Specialist, Consultant
    individual: 4, // Individual contributor
    unknown: 0,
  },

  // Industry scoring (B2B SaaS focus)
  industry: {
    technology: 8,
    finance: 7,
    healthcare: 7,
    manufacturing: 6,
    retail: 6,
    education: 5,
    government: 4,
    other: 3,
    unknown: 0,
  },

  // Source quality scoring
  sourceQuality: {
    referral: 15,
    direct: 12,
    organic: 10,
    paid: 8,
    partnership: 6,
    unknown: 0,
  },

  // Budget scoring
  budget: {
    enterprise: 6,
    high: 5,
    medium: 4,
    low: 2,
    unknown: 0,
  },

  // Timeline scoring
  timeline: {
    immediate: 4,
    "1-3months": 3,
    "3-6months": 2,
    "6-12months": 1,
    exploring: 1,
    unknown: 0,
  },

  // Lead status scoring
  leadStatus: {
    qualified: 10,
    proposal: 8,
    contacted: 6,
    new: 2,
    won: 10, // Already converted
    lost: 0,
  },
};

// Helper functions for scoring
function scoreCompanySize(companySize?: string): number {
  if (!companySize) return SCORING_RULES.companySize.unknown;

  // Try to parse company size from enrichment data
  const size = parseInt(companySize);
  if (isNaN(size)) return SCORING_RULES.companySize.unknown;

  if (size > 10000) return SCORING_RULES.companySize["10001+"];
  if (size > 1000) return SCORING_RULES.companySize["1001-10000"];
  if (size > 500) return SCORING_RULES.companySize["501-1000"];
  if (size > 100) return SCORING_RULES.companySize["101-500"];
  if (size > 50) return SCORING_RULES.companySize["51-100"];
  if (size > 10) return SCORING_RULES.companySize["11-50"];
  if (size > 0) return SCORING_RULES.companySize["1-10"];

  return SCORING_RULES.companySize.unknown;
}

function scoreJobTitle(jobTitle?: string): number {
  if (!jobTitle) return SCORING_RULES.jobTitle.unknown;

  const title = jobTitle.toLowerCase();

  // Executive level
  if (/(ceo|cto|cfo|coo|chief|founder|owner|president)/.test(title)) {
    return SCORING_RULES.jobTitle.executive;
  }

  // Director/VP level
  if (/(director|vp|vice president|head of|chief of)/.test(title)) {
    return SCORING_RULES.jobTitle.director;
  }

  // Manager level
  if (/(manager|lead|senior|principal|architect)/.test(title)) {
    return SCORING_RULES.jobTitle.manager;
  }

  // Specialist level
  if (/(specialist|consultant|analyst|developer|engineer)/.test(title)) {
    return SCORING_RULES.jobTitle.specialist;
  }

  // Individual contributor
  return SCORING_RULES.jobTitle.individual;
}

function scoreIndustry(industry?: string): number {
  if (!industry) return SCORING_RULES.industry.unknown;

  const ind = industry.toLowerCase();

  if (/(technology|software|it|internet|web|mobile|ai|ml|data)/.test(ind)) {
    return SCORING_RULES.industry.technology;
  }
  if (/(finance|banking|financial|insurance|investment)/.test(ind)) {
    return SCORING_RULES.industry.finance;
  }
  if (/(healthcare|medical|pharma|biotech|hospital)/.test(ind)) {
    return SCORING_RULES.industry.healthcare;
  }
  if (/(manufacturing|industrial|engineering|construction)/.test(ind)) {
    return SCORING_RULES.industry.manufacturing;
  }
  if (/(retail|ecommerce|consumer|shopping)/.test(ind)) {
    return SCORING_RULES.industry.retail;
  }
  if (/(education|school|university|academic)/.test(ind)) {
    return SCORING_RULES.industry.education;
  }
  if (/(government|public sector|defense|military)/.test(ind)) {
    return SCORING_RULES.industry.government;
  }

  return SCORING_RULES.industry.other;
}

function scoreSource(source: string): number {
  return (
    SCORING_RULES.sourceQuality[
      source as keyof typeof SCORING_RULES.sourceQuality
    ] || SCORING_RULES.sourceQuality.unknown
  );
}

function scoreBudget(budget?: string): number {
  return (
    SCORING_RULES.budget[budget as keyof typeof SCORING_RULES.budget] ||
    SCORING_RULES.budget.unknown
  );
}

function scoreTimeline(timeline?: string): number {
  return (
    SCORING_RULES.timeline[timeline as keyof typeof SCORING_RULES.timeline] ||
    SCORING_RULES.timeline.unknown
  );
}

function scoreStatus(status: string): number {
  return (
    SCORING_RULES.leadStatus[status as keyof typeof SCORING_RULES.leadStatus] ||
    0
  );
}

async function scoreIntentSignals(leadId: string): Promise<number> {
  try {
    // Get intent signals for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const signals = await prisma.intentSignal.findMany({
      where: {
        lead_id: leadId,
        created_at: {
          gte: thirtyDaysAgo,
        },
      },
    });

    let totalScore = 0;

    signals.forEach((signal) => {
      totalScore += signal.score_impact;
    });

    // Normalize to 0-15 range
    return Math.min(Math.max(totalScore, 0), 15);
  } catch (error) {
    console.error("Error calculating intent signals score:", error);
    return 0;
  }
}

async function scoreEngagement(leadId: string): Promise<number> {
  try {
    // Count recent activities
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentActivities = await prisma.activityLog.count({
      where: {
        resource_type: "lead",
        resource_id: leadId,
        created_at: {
          gte: sevenDaysAgo,
        },
      },
    });

    // Count conversations
    const conversationCount = await prisma.conversation.count({
      where: {
        lead_id: leadId,
      },
    });

    // Calculate engagement score (0-10)
    const activityScore = Math.min(recentActivities * 2, 6);
    const conversationScore = Math.min(conversationCount, 4);

    return activityScore + conversationScore;
  } catch (error) {
    console.error("Error calculating engagement score:", error);
    return 0;
  }
}

/**
 * Calculate lead score based on multiple factors
 */
export async function calculateLeadScore(lead: DbLead): Promise<number> {
  try {
    // Get enrichment data for additional scoring
    const enrichment = await prisma.leadEnrichment.findFirst({
      where: {
        lead_id: lead.id,
        source: { in: ["crustdata", "people_data_labs"] },
      },
      orderBy: {
        enriched_at: "desc",
      },
    });

    // Calculate individual factor scores
    const scores = {
      companySize: scoreCompanySize(enrichment?.company_size),
      jobTitle: scoreJobTitle(enrichment?.job_title || lead.notes),
      industry: scoreIndustry(enrichment?.company_industry),
      location: enrichment?.company_website ? 5 : 0, // Simple location scoring
      sourceQuality: scoreSource(lead.source),
      budget: scoreBudget(lead.budget),
      timeline: scoreTimeline(lead.timeline),
      intentSignals: await scoreIntentSignals(lead.id),
      engagement: await scoreEngagement(lead.id),
      leadStatus: scoreStatus(lead.status),
    };

    // Calculate weighted total score
    const totalScore =
      scores.companySize +
      scores.jobTitle +
      scores.industry +
      scores.location +
      scores.sourceQuality +
      scores.budget +
      scores.timeline +
      scores.intentSignals +
      scores.engagement +
      scores.leadStatus;

    // Ensure score is between 0-100
    return Math.min(Math.max(Math.round(totalScore), 0), 100);
  } catch (error) {
    console.error("Error calculating lead score:", error);
    // Return current score if calculation fails
    return lead.score || 0;
  }
}

/**
 * Update lead score in database
 */
export async function updateLeadScore(leadId: string): Promise<number> {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new Error("Lead not found");
    }

    const newScore = await calculateLeadScore(lead);

    await prisma.lead.update({
      where: { id: leadId },
      data: { score: newScore },
    });

    // Log the score update
    await prisma.activityLog.create({
      data: {
        user_id: lead.created_at ? "system" : undefined, // TODO: Get actual user ID
        type: "LEAD_UPDATE",
        description: `Lead score updated to ${newScore}`,
        metadata: {
          lead_id: leadId,
          old_score: lead.score,
          new_score: newScore,
        },
        resource_type: "lead",
        resource_id: leadId,
      },
    });

    return newScore;
  } catch (error) {
    console.error("Error updating lead score:", error);
    throw error;
  }
}

/**
 * Get scoring factors breakdown for a lead
 */
export async function getLeadScoreBreakdown(lead: Lead): Promise<{
  totalScore: number;
  factors: Record<string, { score: number; maxScore: number; weight: number }>;
}> {
  try {
    const enrichment = await prisma.leadEnrichment.findFirst({
      where: {
        lead_id: lead.id,
        source: { in: ["crustdata", "people_data_labs"] },
      },
      orderBy: {
        enriched_at: "desc",
      },
    });

    const factors = {
      companySize: {
        score: scoreCompanySize(enrichment?.company_size),
        maxScore: SCORING_FACTORS.companySize.maxScore,
        weight: SCORING_FACTORS.companySize.weight,
      },
      jobTitle: {
        score: scoreJobTitle(enrichment?.job_title || lead.notes),
        maxScore: SCORING_FACTORS.jobTitle.maxScore,
        weight: SCORING_FACTORS.jobTitle.weight,
      },
      industry: {
        score: scoreIndustry(enrichment?.company_industry),
        maxScore: SCORING_FACTORS.industry.maxScore,
        weight: SCORING_FACTORS.industry.weight,
      },
      sourceQuality: {
        score: scoreSource(lead.source),
        maxScore: SCORING_FACTORS.sourceQuality.maxScore,
        weight: SCORING_FACTORS.sourceQuality.weight,
      },
      budget: {
        score: scoreBudget(lead.budget),
        maxScore: SCORING_FACTORS.budget.maxScore,
        weight: SCORING_FACTORS.budget.weight,
      },
      timeline: {
        score: scoreTimeline(lead.timeline),
        maxScore: SCORING_FACTORS.timeline.maxScore,
        weight: SCORING_FACTORS.timeline.weight,
      },
      intentSignals: {
        score: await scoreIntentSignals(lead.id),
        maxScore: SCORING_FACTORS.intentSignals.maxScore,
        weight: SCORING_FACTORS.intentSignals.weight,
      },
      engagement: {
        score: await scoreEngagement(lead.id),
        maxScore: SCORING_FACTORS.engagement.maxScore,
        weight: SCORING_FACTORS.engagement.weight,
      },
      leadStatus: {
        score: scoreStatus(lead.status),
        maxScore: SCORING_FACTORS.leadStatus.maxScore,
        weight: SCORING_FACTORS.leadStatus.weight,
      },
    };

    const totalScore = Object.values(factors).reduce(
      (sum, factor) => sum + factor.score,
      0,
    );

    return {
      totalScore: Math.min(Math.max(Math.round(totalScore), 0), 100),
      factors,
    };
  } catch (error) {
    console.error("Error getting lead score breakdown:", error);
    return {
      totalScore: lead.score || 0,
      factors: {},
    };
  }
}

/**
 * Batch update lead scores for multiple leads
 */
export async function batchUpdateLeadScores(
  leadIds: string[],
): Promise<Record<string, number>> {
  const results: Record<string, number> = {};

  for (const leadId of leadIds) {
    try {
      const newScore = await updateLeadScore(leadId);
      results[leadId] = newScore;
    } catch (error) {
      console.error(`Failed to update score for lead ${leadId}:`, error);
      results[leadId] = -1; // Error indicator
    }
  }

  return results;
}
