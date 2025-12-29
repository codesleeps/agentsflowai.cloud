import { prisma } from "@/server-lib/prisma";
import { updateLeadScore } from "@/lib/lead-scoring";
import { integrationsClient } from "@/client-lib/shared";
import type { Lead } from "@/shared/models/types";

// Database Lead type (with string status)
type DbLead = {
  id: string;
  name: string;
  email: string;
  company: string;
  phone: string;
  status: string;
  score: number;
  budget: string;
  timeline: string;
  interests: string[];
  notes: string;
  qualified_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

// Enrichment source configuration
export interface EnrichmentSource {
  name: string;
  priority: number;
  isActive: boolean;
  capabilities: string[];
}

// Available enrichment sources
const ENRICHMENT_SOURCES: Record<string, EnrichmentSource> = {
  crustdata: {
    name: "Crustdata",
    priority: 1,
    isActive: true,
    capabilities: [
      "company_info",
      "job_title",
      "industry",
      "company_size",
      "location",
    ],
  },
  forager: {
    name: "Forager",
    priority: 2,
    isActive: true,
    capabilities: ["personal_email"],
  },
  people_data_labs: {
    name: "People Data Labs",
    priority: 3,
    isActive: false, // Not implemented yet
    capabilities: ["company_info", "job_title", "social_profiles"],
  },
};

// Enrichment result interface
export interface EnrichmentResult {
  success: boolean;
  source: string;
  data: any;
  confidence?: number;
  error?: string;
}

// Determine which enrichment sources to use for a lead
function getEnrichmentStrategy(lead: Lead): string[] {
  const sources: string[] = [];

  // Use Crustdata for business/professional information
  if (ENRICHMENT_SOURCES.crustdata.isActive) {
    // Check if we have enough data for Crustdata enrichment
    if (lead.email || lead.company) {
      sources.push("crustdata");
    }
  }

  // Use Forager for personal email lookup
  if (ENRICHMENT_SOURCES.forager.isActive) {
    // Check if we have LinkedIn data or name for Forager
    if (lead.email || lead.name) {
      sources.push("forager");
    }
  }

  return sources.sort(
    (a, b) => ENRICHMENT_SOURCES[a].priority - ENRICHMENT_SOURCES[b].priority,
  );
}

// Enrich lead using Crustdata
async function enrichWithCrustdata(lead: Lead): Promise<EnrichmentResult> {
  try {
    const params = new URLSearchParams();

    if (lead.email) {
      params.set("business_email", lead.email);
    }

    const response = await integrationsClient.get(
      `/integrations/crustdata/enrich-person?${params.toString()}`,
    );

    if (response.data?.profiles?.length > 0) {
      const profile = response.data.profiles[0]; // Take the best match

      return {
        success: true,
        source: "crustdata",
        data: {
          company_name: profile.company?.name,
          company_size: profile.company?.size,
          company_industry: profile.company?.industry,
          company_website: profile.company?.website,
          company_linkedin_url: profile.company?.linkedin_url,
          job_title: profile.title,
          location: profile.location,
          linkedin_url: profile.linkedin_url,
          skills: profile.skills,
          enriched_at: new Date(),
        },
        confidence: profile.score || 0.8,
      };
    }

    return {
      success: false,
      source: "crustdata",
      data: null,
      error: "No matching profile found",
    };
  } catch (error: any) {
    return {
      success: false,
      source: "crustdata",
      data: null,
      error: error.response?.data?.error || error.message,
    };
  }
}

// Enrich lead using Forager
async function enrichWithForager(lead: Lead): Promise<EnrichmentResult> {
  try {
    // Forager needs LinkedIn identifier, so we might need to search or use available data
    // For now, we'll use email if available, or try to find LinkedIn URL from existing data
    let linkedinIdentifier = "";

    // Check if lead already has LinkedIn URL
    if (lead.notes?.includes("linkedin.com")) {
      const linkedinMatch = lead.notes.match(/linkedin\.com\/in\/([^\/\?\s]+)/);
      if (linkedinMatch) {
        linkedinIdentifier = linkedinMatch[1];
      }
    }

    if (!linkedinIdentifier) {
      // If no LinkedIn URL found, we can't enrich with Forager
      return {
        success: false,
        source: "forager",
        data: null,
        error: "No LinkedIn identifier available",
      };
    }

    const params = new URLSearchParams();
    params.set("linkedin_public_identifier", linkedinIdentifier);

    const response = await integrationsClient.get(
      `/integrations/forager/personal-email?${params.toString()}`,
    );

    if (response.data?.length > 0) {
      const emailResult = response.data[0]; // Take the first result

      return {
        success: true,
        source: "forager",
        data: {
          personal_email: emailResult.email,
          email_type: emailResult.email_type,
          validation_status: emailResult.validation_status,
          enriched_at: new Date(),
        },
        confidence:
          emailResult.validation_status === "valid"
            ? 0.9
            : emailResult.validation_status === "risky"
              ? 0.6
              : 0.3,
      };
    }

    return {
      success: false,
      source: "forager",
      data: null,
      error: "No email found",
    };
  } catch (error: any) {
    return {
      success: false,
      source: "forager",
      data: null,
      error: error.response?.data?.error || error.message,
    };
  }
}

// Main enrichment function
export async function enrichLead(
  leadId: string,
  forceRefresh = false,
): Promise<{
  success: boolean;
  results: EnrichmentResult[];
  updatedLead?: Lead;
}> {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new Error("Lead not found");
    }

    // Check if lead has already been enriched recently (unless force refresh)
    if (!forceRefresh) {
      const recentEnrichment = await prisma.leadEnrichment.findFirst({
        where: {
          lead_id: leadId,
          enriched_at: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
      });

      if (recentEnrichment) {
        return {
          success: false,
          results: [],
          updatedLead: lead as unknown as Lead,
        };
      }
    }

    const sources = getEnrichmentStrategy(lead as unknown as Lead);
    const results: EnrichmentResult[] = [];

    for (const source of sources) {
      let result: EnrichmentResult;

      switch (source) {
        case "crustdata":
          result = await enrichWithCrustdata(lead as unknown as Lead);
          break;
        case "forager":
          result = await enrichWithForager(lead as unknown as Lead);
          break;
        default:
          continue;
      }

      results.push(result);

      // If enrichment was successful, save to database
      if (result.success && result.data) {
        await prisma.leadEnrichment.create({
          data: {
            lead_id: leadId,
            source: result.source,
            enrichment_data: result.data,
            confidence_score: result.confidence,
            company_name: result.data.company_name,
            company_size: result.data.company_size,
            company_industry: result.data.company_industry,
            company_website: result.data.company_website,
            company_linkedin_url: result.data.company_linkedin_url,
            job_title: result.data.job_title,
            linkedin_url: result.data.linkedin_url,
            enriched_at: result.data.enriched_at || new Date(),
          },
        });

        // Log the enrichment activity
        await prisma.activityLog.create({
          data: {
            user_id: lead.created_at ? "system" : undefined, // TODO: Get actual user ID
            type: "LEAD_UPDATE",
            description: `Lead enriched using ${result.source}`,
            metadata: {
              lead_id: leadId,
              enrichment_source: result.source,
              confidence: result.confidence,
            },
            resource_type: "lead",
            resource_id: leadId,
          },
        });
      }
    }

    // Update lead score after enrichment
    if (results.some((r) => r.success)) {
      await updateLeadScore(leadId);
    }

    // Get updated lead data
    const updatedLead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    return {
      success: results.some((r) => r.success),
      results,
      updatedLead: updatedLead as unknown as Lead,
    };
  } catch (error) {
    console.error("Lead enrichment error:", error);
    throw error;
  }
}

// Batch enrich multiple leads
export async function batchEnrichLeads(
  leadIds: string[],
  forceRefresh = false,
): Promise<Record<string, { success: boolean; results: EnrichmentResult[] }>> {
  const results: Record<
    string,
    { success: boolean; results: EnrichmentResult[] }
  > = {};

  for (const leadId of leadIds) {
    try {
      const enrichment = await enrichLead(leadId, forceRefresh);
      results[leadId] = {
        success: enrichment.success,
        results: enrichment.results,
      };
    } catch (error) {
      console.error(`Failed to enrich lead ${leadId}:`, error);
      results[leadId] = {
        success: false,
        results: [],
      };
    }
  }

  return results;
}

// Get enrichment history for a lead
export async function getLeadEnrichmentHistory(leadId: string) {
  return prisma.leadEnrichment.findMany({
    where: { lead_id: leadId },
    orderBy: { enriched_at: "desc" },
  });
}

// Check if lead needs enrichment
export async function shouldEnrichLead(lead: Lead): Promise<boolean> {
  // Check if lead has minimal data for enrichment
  if (!lead.email && !lead.company && !lead.name) {
    return false;
  }

  // Check if recently enriched
  const recentEnrichment = await prisma.leadEnrichment.findFirst({
    where: {
      lead_id: lead.id,
      enriched_at: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      },
    },
  });

  return !recentEnrichment;
}

// Auto-enrich leads that need it (useful for background jobs)
export async function autoEnrichPendingLeads(limit = 10): Promise<number> {
  const leadsToEnrich = await prisma.lead.findMany({
    where: {
      // Add conditions for leads that should be enriched
      OR: [{ email: { not: null } }, { company: { not: null } }],
    },
    take: limit,
  });

  let enrichedCount = 0;

  for (const lead of leadsToEnrich) {
    const shouldEnrich = await shouldEnrichLead(lead as unknown as Lead);
    if (shouldEnrich) {
      try {
        const result = await enrichLead(lead.id);
        if (result.success) {
          enrichedCount++;
        }
      } catch (error) {
        console.error(`Auto-enrichment failed for lead ${lead.id}:`, error);
      }
    }
  }

  return enrichedCount;
}
