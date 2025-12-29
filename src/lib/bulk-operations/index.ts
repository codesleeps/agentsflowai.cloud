import { prisma } from "@/server-lib/prisma";
import { updateLeadScore, batchUpdateLeadScores } from "@/lib/lead-scoring";
import { enrichLead, batchEnrichLeads } from "@/lib/lead-enrichment";
import type { Lead } from "@/shared/models/types";
import { z } from "zod";

// Bulk operation types
export type BulkOperationType =
  | "import"
  | "update"
  | "delete"
  | "export"
  | "enrich"
  | "score_update";

export interface BulkOperationResult {
  success: boolean;
  operationId: string;
  type: BulkOperationType;
  totalRecords: number;
  processedRecords: number;
  failedRecords: number;
  errors: BulkOperationError[];
  createdAt: Date;
  completedAt?: Date;
  resultData?: any;
}

export interface BulkOperationError {
  recordIndex: number;
  recordId?: string;
  error: string;
  details?: any;
}

// CSV Import schema
const LeadImportSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email required").optional(),
  company: z.string().optional(),
  phone: z.string().optional(),
  status: z
    .enum(["new", "contacted", "qualified", "proposal", "won", "lost"])
    .default("new"),
  budget: z.enum(["low", "medium", "high", "enterprise"]).optional(),
  timeline: z.string().optional(),
  notes: z.string().optional(),
  source: z.enum(["website", "chat", "referral", "ads"]).default("website"),
});

// Bulk update schema
const BulkUpdateSchema = z.object({
  leadIds: z.array(z.string().min(1)).min(1, "At least one lead ID required"),
  updates: z.object({
    status: z
      .enum(["new", "contacted", "qualified", "proposal", "won", "lost"])
      .optional(),
    budget: z.enum(["low", "medium", "high", "enterprise"]).optional(),
    timeline: z.string().optional(),
    notes: z.string().optional(),
    source: z.enum(["website", "chat", "referral", "ads"]).optional(),
  }),
});

// Parse CSV content
function parseCSV(csvContent: string): any[] {
  const lines = csvContent.trim().split("\n");
  if (lines.length < 2) {
    throw new Error("CSV must have at least a header row and one data row");
  }

  const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
  const rows: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""));
    const row: any = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });

    rows.push(row);
  }

  return rows;
}

// Validate and transform CSV data
function validateCSVData(csvData: any[]): {
  valid: any[];
  invalid: BulkOperationError[];
} {
  const valid: any[] = [];
  const invalid: BulkOperationError[] = [];

  csvData.forEach((row, index) => {
    try {
      // Map CSV columns to expected schema
      const mappedRow = {
        name: row.name || row.Name || row.full_name || row.FullName,
        email: row.email || row.Email,
        company:
          row.company || row.Company || row.organization || row.Organization,
        phone: row.phone || row.Phone || row.mobile || row.Mobile,
        status: row.status || row.Status || "new",
        budget: row.budget || row.Budget,
        timeline: row.timeline || row.Timeline,
        notes: row.notes || row.Notes || row.comments || row.Comments,
        source: row.source || row.Source || "website",
      };

      const validated = LeadImportSchema.parse(mappedRow);
      valid.push(validated);
    } catch (error) {
      invalid.push({
        recordIndex: index + 1,
        error:
          error instanceof z.ZodError
            ? error.errors.map((e) => e.message).join(", ")
            : "Validation failed",
        details: error,
      });
    }
  });

  return { valid, invalid };
}

// Import leads from CSV
export async function bulkImportLeads(
  csvContent: string,
  options: {
    skipDuplicates?: boolean;
    updateExisting?: boolean;
  } = {},
): Promise<BulkOperationResult> {
  const operationId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const csvData = parseCSV(csvContent);
    const { valid, invalid } = validateCSVData(csvData);

    let processedRecords = 0;
    const errors: BulkOperationError[] = [...invalid];

    // Process valid records
    for (let i = 0; i < valid.length; i++) {
      const leadData = valid[i];

      try {
        // Check for duplicates if skipDuplicates is enabled
        if (options.skipDuplicates && leadData.email) {
          const existing = await prisma.lead.findFirst({
            where: { email: leadData.email },
          });

          if (existing) {
            errors.push({
              recordIndex: i + 1,
              recordId: existing.id,
              error: "Duplicate email address",
            });
            continue;
          }
        }

        // Handle updates vs inserts
        if (options.updateExisting && leadData.email) {
          const existing = await prisma.lead.findFirst({
            where: { email: leadData.email },
          });

          if (existing) {
            await prisma.lead.update({
              where: { id: existing.id },
              data: {
                name: leadData.name,
                company: leadData.company || null,
                phone: leadData.phone || null,
                status: leadData.status,
                budget: leadData.budget || null,
                timeline: leadData.timeline || null,
                notes: leadData.notes || null,
                source: leadData.source,
                updated_at: new Date(),
              },
            });

            // Recalculate score for updated lead
            await updateLeadScore(existing.id);

            processedRecords++;
            continue;
          }
        }

        // Create new lead
        const newLead = await prisma.lead.create({
          data: {
            name: leadData.name,
            email: leadData.email || null,
            company: leadData.company || null,
            phone: leadData.phone || null,
            status: leadData.status,
            budget: leadData.budget || null,
            timeline: leadData.timeline || null,
            notes: leadData.notes || null,
            source: leadData.source,
            score: 0, // Will be calculated below
          },
        });

        // Calculate initial score
        await updateLeadScore(newLead.id);

        processedRecords++;

        // Log the import
        await prisma.activityLog.create({
          data: {
            user_id: null, // System operation
            type: "LEAD_IMPORT",
            description: `Lead imported via bulk operation: ${newLead.name}`,
            metadata: {
              operation_id: operationId,
              lead_id: newLead.id,
              source: "bulk_import",
            },
            resource_type: "lead",
            resource_id: newLead.id,
          },
        });
      } catch (error) {
        errors.push({
          recordIndex: i + 1,
          error: error instanceof Error ? error.message : "Import failed",
          details: error,
        });
      }
    }

    return {
      success: errors.length === 0,
      operationId,
      type: "import",
      totalRecords: csvData.length,
      processedRecords,
      failedRecords: errors.length,
      errors,
      createdAt: new Date(),
      completedAt: new Date(),
    };
  } catch (error) {
    return {
      success: false,
      operationId,
      type: "import",
      totalRecords: 0,
      processedRecords: 0,
      failedRecords: 0,
      errors: [
        {
          recordIndex: 0,
          error:
            error instanceof Error ? error.message : "Import operation failed",
          details: error,
        },
      ],
      createdAt: new Date(),
      completedAt: new Date(),
    };
  }
}

// Bulk update leads
export async function bulkUpdateLeads(
  updates: z.infer<typeof BulkUpdateSchema>,
): Promise<BulkOperationResult> {
  const operationId = `update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const validated = BulkUpdateSchema.parse(updates);
    let processedRecords = 0;
    const errors: BulkOperationError[] = [];

    // Process updates in batches
    for (let i = 0; i < validated.leadIds.length; i++) {
      const leadId = validated.leadIds[i];

      try {
        const updateData: any = {
          updated_at: new Date(),
        };

        // Apply updates
        if (validated.updates.status)
          updateData.status = validated.updates.status;
        if (validated.updates.budget)
          updateData.budget = validated.updates.budget;
        if (validated.updates.timeline)
          updateData.timeline = validated.updates.timeline;
        if (validated.updates.notes !== undefined)
          updateData.notes = validated.updates.notes;
        if (validated.updates.source)
          updateData.source = validated.updates.source;

        await prisma.lead.update({
          where: { id: leadId },
          data: updateData,
        });

        // Recalculate score if relevant fields changed
        if (
          validated.updates.status ||
          validated.updates.budget ||
          validated.updates.timeline
        ) {
          await updateLeadScore(leadId);
        }

        processedRecords++;

        // Log the update
        await prisma.activityLog.create({
          data: {
            user_id: null, // System operation
            type: "LEAD_UPDATE",
            description: `Lead updated via bulk operation`,
            metadata: {
              operation_id: operationId,
              lead_id: leadId,
              updates: validated.updates,
            },
            resource_type: "lead",
            resource_id: leadId,
          },
        });
      } catch (error) {
        errors.push({
          recordIndex: i + 1,
          recordId: leadId,
          error: error instanceof Error ? error.message : "Update failed",
          details: error,
        });
      }
    }

    return {
      success: errors.length === 0,
      operationId,
      type: "update",
      totalRecords: validated.leadIds.length,
      processedRecords,
      failedRecords: errors.length,
      errors,
      createdAt: new Date(),
      completedAt: new Date(),
    };
  } catch (error) {
    return {
      success: false,
      operationId,
      type: "update",
      totalRecords: updates.leadIds.length,
      processedRecords: 0,
      failedRecords: updates.leadIds.length,
      errors: [
        {
          recordIndex: 0,
          error: error instanceof Error ? error.message : "Bulk update failed",
          details: error,
        },
      ],
      createdAt: new Date(),
      completedAt: new Date(),
    };
  }
}

// Bulk delete leads
export async function bulkDeleteLeads(
  leadIds: string[],
): Promise<BulkOperationResult> {
  const operationId = `delete_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    let processedRecords = 0;
    const errors: BulkOperationError[] = [];

    // Delete leads (this will cascade to related records)
    for (let i = 0; i < leadIds.length; i++) {
      const leadId = leadIds[i];

      try {
        // Get lead info before deletion for logging
        const lead = await prisma.lead.findUnique({
          where: { id: leadId },
        });

        if (!lead) {
          errors.push({
            recordIndex: i + 1,
            recordId: leadId,
            error: "Lead not found",
          });
          continue;
        }

        await prisma.lead.delete({
          where: { id: leadId },
        });

        processedRecords++;

        // Log the deletion
        await prisma.activityLog.create({
          data: {
            user_id: null, // System operation
            type: "LEAD_DELETE",
            description: `Lead deleted via bulk operation: ${lead.name}`,
            metadata: {
              operation_id: operationId,
              lead_id: leadId,
              lead_name: lead.name,
            },
            resource_type: "lead",
            resource_id: leadId,
          },
        });
      } catch (error) {
        errors.push({
          recordIndex: i + 1,
          recordId: leadId,
          error: error instanceof Error ? error.message : "Delete failed",
          details: error,
        });
      }
    }

    return {
      success: errors.length === 0,
      operationId,
      type: "delete",
      totalRecords: leadIds.length,
      processedRecords,
      failedRecords: errors.length,
      errors,
      createdAt: new Date(),
      completedAt: new Date(),
    };
  } catch (error) {
    return {
      success: false,
      operationId,
      type: "delete",
      totalRecords: leadIds.length,
      processedRecords: 0,
      failedRecords: leadIds.length,
      errors: [
        {
          recordIndex: 0,
          error: error instanceof Error ? error.message : "Bulk delete failed",
          details: error,
        },
      ],
      createdAt: new Date(),
      completedAt: new Date(),
    };
  }
}

// Bulk enrich leads
export async function bulkEnrichLeadsOperation(
  leadIds: string[],
  forceRefresh = false,
): Promise<BulkOperationResult> {
  const operationId = `enrich_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const result = await batchEnrichLeads(leadIds, forceRefresh);

    const errors: BulkOperationError[] = [];
    let processedRecords = 0;

    // Convert enrichment results to bulk operation errors
    Object.entries(result).forEach(([leadId, enrichmentResult], index) => {
      if (!enrichmentResult.success) {
        errors.push({
          recordIndex: index + 1,
          recordId: leadId,
          error: "Enrichment failed",
          details: enrichmentResult.results,
        });
      } else {
        processedRecords++;
      }
    });

    return {
      success: errors.length === 0,
      operationId,
      type: "enrich",
      totalRecords: leadIds.length,
      processedRecords,
      failedRecords: errors.length,
      errors,
      createdAt: new Date(),
      completedAt: new Date(),
      resultData: result,
    };
  } catch (error) {
    return {
      success: false,
      operationId,
      type: "enrich",
      totalRecords: leadIds.length,
      processedRecords: 0,
      failedRecords: leadIds.length,
      errors: [
        {
          recordIndex: 0,
          error:
            error instanceof Error ? error.message : "Bulk enrichment failed",
          details: error,
        },
      ],
      createdAt: new Date(),
      completedAt: new Date(),
    };
  }
}

// Bulk update lead scores
export async function bulkUpdateLeadScoresOperation(
  leadIds: string[],
): Promise<BulkOperationResult> {
  const operationId = `score_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const result = await batchUpdateLeadScores(leadIds);

    const errors: BulkOperationError[] = [];
    let processedRecords = 0;

    // Convert scoring results to bulk operation errors
    Object.entries(result).forEach(([leadId, score], index) => {
      if (score === -1) {
        // Error indicator
        errors.push({
          recordIndex: index + 1,
          recordId: leadId,
          error: "Score update failed",
        });
      } else {
        processedRecords++;
      }
    });

    return {
      success: errors.length === 0,
      operationId,
      type: "score_update",
      totalRecords: leadIds.length,
      processedRecords,
      failedRecords: errors.length,
      errors,
      createdAt: new Date(),
      completedAt: new Date(),
      resultData: result,
    };
  } catch (error) {
    return {
      success: false,
      operationId,
      type: "score_update",
      totalRecords: leadIds.length,
      processedRecords: 0,
      failedRecords: leadIds.length,
      errors: [
        {
          recordIndex: 0,
          error:
            error instanceof Error ? error.message : "Bulk score update failed",
          details: error,
        },
      ],
      createdAt: new Date(),
      completedAt: new Date(),
    };
  }
}

// Export leads to CSV
export async function bulkExportLeads(
  filters: {
    status?: string[];
    source?: string[];
    scoreMin?: number;
    scoreMax?: number;
    dateFrom?: Date;
    dateTo?: Date;
  } = {},
): Promise<BulkOperationResult> {
  const operationId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Build where clause
    const where: any = {};

    if (filters.status?.length) {
      where.status = { in: filters.status };
    }

    if (filters.source?.length) {
      where.source = { in: filters.source };
    }

    if (filters.scoreMin !== undefined || filters.scoreMax !== undefined) {
      where.score = {};
      if (filters.scoreMin !== undefined) where.score.gte = filters.scoreMin;
      if (filters.scoreMax !== undefined) where.score.lte = filters.scoreMax;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.created_at = {};
      if (filters.dateFrom) where.created_at.gte = filters.dateFrom;
      if (filters.dateTo) where.created_at.lte = filters.dateTo;
    }

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { created_at: "desc" },
    });

    // Convert to CSV
    const csvHeaders = [
      "ID",
      "Name",
      "Email",
      "Company",
      "Phone",
      "Status",
      "Score",
      "Budget",
      "Timeline",
      "Source",
      "Notes",
      "Created At",
    ];

    const csvRows = leads.map((lead) => [
      lead.id,
      lead.name,
      lead.email || "",
      lead.company || "",
      lead.phone || "",
      lead.status,
      lead.score.toString(),
      lead.budget || "",
      lead.timeline || "",
      lead.source,
      lead.notes || "",
      lead.created_at.toISOString(),
    ]);

    const csvContent = [csvHeaders, ...csvRows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    return {
      success: true,
      operationId,
      type: "export",
      totalRecords: leads.length,
      processedRecords: leads.length,
      failedRecords: 0,
      errors: [],
      createdAt: new Date(),
      completedAt: new Date(),
      resultData: {
        csvContent,
        filename: `leads_export_${new Date().toISOString().split("T")[0]}.csv`,
        recordCount: leads.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      operationId,
      type: "export",
      totalRecords: 0,
      processedRecords: 0,
      failedRecords: 0,
      errors: [
        {
          recordIndex: 0,
          error: error instanceof Error ? error.message : "Export failed",
          details: error,
        },
      ],
      createdAt: new Date(),
      completedAt: new Date(),
    };
  }
}
