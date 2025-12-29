import { prisma } from "@/server-lib/prisma";
import type { Lead } from "@/shared/models/types";

// Segment types and interfaces
export type SegmentConditionOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "greater_than"
  | "less_than"
  | "greater_than_equal"
  | "less_than_equal"
  | "between"
  | "in"
  | "not_in"
  | "is_empty"
  | "is_not_empty";

export interface SegmentCondition {
  id: string;
  field: string;
  operator: SegmentConditionOperator;
  value?: any;
  value2?: any; // For between operator
  logicalOperator?: "AND" | "OR"; // For combining conditions
}

export interface Segment {
  id: string;
  name: string;
  description?: string;
  conditions: SegmentCondition[];
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  leadCount?: number; // Cached count
  lastCountUpdate?: Date;
}

// Available segment fields with their types and descriptions
export const SEGMENT_FIELDS = {
  // Basic lead fields
  name: { type: "string", label: "Name", description: "Lead's full name" },
  email: {
    type: "string",
    label: "Email",
    description: "Lead's email address",
  },
  company: { type: "string", label: "Company", description: "Company name" },
  phone: { type: "string", label: "Phone", description: "Phone number" },
  status: {
    type: "enum",
    label: "Status",
    description: "Lead status",
    options: ["new", "contacted", "qualified", "proposal", "won", "lost"],
  },
  score: { type: "number", label: "Score", description: "Lead score (0-100)" },
  source: {
    type: "enum",
    label: "Source",
    description: "How the lead was acquired",
    options: ["website", "chat", "referral", "ads"],
  },
  budget: {
    type: "enum",
    label: "Budget",
    description: "Lead's budget range",
    options: ["low", "medium", "high", "enterprise"],
  },
  timeline: {
    type: "enum",
    label: "Timeline",
    description: "Lead's timeline preference",
    options: ["immediate", "1-3months", "3-6months", "exploring"],
  },

  // Date fields
  created_at: {
    type: "date",
    label: "Created Date",
    description: "When the lead was created",
  },
  updated_at: {
    type: "date",
    label: "Updated Date",
    description: "When the lead was last updated",
  },
  qualified_at: {
    type: "date",
    label: "Qualified Date",
    description: "When the lead was qualified",
  },

  // Enrichment fields
  company_size: {
    type: "string",
    label: "Company Size",
    description: "Company size from enrichment",
  },
  company_industry: {
    type: "string",
    label: "Industry",
    description: "Company industry from enrichment",
  },
  job_title: {
    type: "string",
    label: "Job Title",
    description: "Lead's job title from enrichment",
  },

  // Interaction fields
  last_interaction: {
    type: "date",
    label: "Last Interaction",
    description: "Date of last interaction",
  },
  interaction_count: {
    type: "number",
    label: "Interaction Count",
    description: "Number of interactions",
  },
  has_appointment: {
    type: "boolean",
    label: "Has Appointment",
    description: "Whether the lead has scheduled appointments",
  },
  appointment_status: {
    type: "enum",
    label: "Appointment Status",
    description: "Status of the lead's appointments",
    options: ["scheduled", "completed", "cancelled", "no-show"],
  },

  // Tags and interests (array fields)
  interests: {
    type: "array",
    label: "Interests",
    description: "Lead's interests and tags",
  },
} as const;

// Pre-built segment templates
export const SEGMENT_TEMPLATES = {
  hot_leads: {
    name: "Hot Leads",
    description: "High-scoring leads ready for immediate follow-up",
    conditions: [
      {
        id: "score_gt_80",
        field: "score",
        operator: "greater_than",
        value: 80,
        logicalOperator: "AND",
      },
      {
        id: "status_new_or_contacted",
        field: "status",
        operator: "in",
        value: ["new", "contacted"],
        logicalOperator: "AND",
      },
    ],
  },

  qualified_enterprise: {
    name: "Qualified Enterprise",
    description: "Qualified leads from enterprise companies",
    conditions: [
      {
        id: "status_qualified",
        field: "status",
        operator: "equals",
        value: "qualified",
        logicalOperator: "AND",
      },
      {
        id: "budget_enterprise",
        field: "budget",
        operator: "equals",
        value: "enterprise",
        logicalOperator: "AND",
      },
    ],
  },

  inactive_leads: {
    name: "Inactive Leads",
    description: "Leads with no recent activity",
    conditions: [
      {
        id: "last_interaction_old",
        field: "last_interaction",
        operator: "less_than",
        value: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        logicalOperator: "AND",
      },
      {
        id: "status_not_won_lost",
        field: "status",
        operator: "not_in",
        value: ["won", "lost"],
      },
    ],
  },

  ready_for_proposal: {
    name: "Ready for Proposal",
    description: "Qualified leads ready to receive proposals",
    conditions: [
      {
        id: "status_qualified",
        field: "status",
        operator: "equals",
        value: "qualified",
        logicalOperator: "AND",
      },
      {
        id: "score_gt_70",
        field: "score",
        operator: "greater_than",
        value: 70,
        logicalOperator: "AND",
      },
      {
        id: "timeline_immediate",
        field: "timeline",
        operator: "equals",
        value: "immediate",
      },
    ],
  },
};

// Build Prisma where clause from segment conditions
function buildWhereClause(conditions: SegmentCondition[]): any {
  if (conditions.length === 0) return {};

  const whereConditions: any[] = [];

  for (const condition of conditions) {
    const fieldDef =
      SEGMENT_FIELDS[condition.field as keyof typeof SEGMENT_FIELDS];
    if (!fieldDef) continue;

    let prismaCondition: any = {};

    switch (condition.operator) {
      case "equals":
        prismaCondition[condition.field] = condition.value;
        break;
      case "not_equals":
        prismaCondition[condition.field] = { not: condition.value };
        break;
      case "contains":
        if (fieldDef.type === "array") {
          prismaCondition[condition.field] = { has: condition.value };
        } else {
          prismaCondition[condition.field] = {
            contains: condition.value,
            mode: "insensitive",
          };
        }
        break;
      case "not_contains":
        if (fieldDef.type === "array") {
          prismaCondition[condition.field] = {
            hasSome: { not: condition.value },
          };
        } else {
          prismaCondition[condition.field] = {
            not: { contains: condition.value, mode: "insensitive" },
          };
        }
        break;
      case "starts_with":
        prismaCondition[condition.field] = {
          startsWith: condition.value,
          mode: "insensitive",
        };
        break;
      case "ends_with":
        prismaCondition[condition.field] = {
          endsWith: condition.value,
          mode: "insensitive",
        };
        break;
      case "greater_than":
        prismaCondition[condition.field] = { gt: condition.value };
        break;
      case "less_than":
        prismaCondition[condition.field] = { lt: condition.value };
        break;
      case "greater_than_equal":
        prismaCondition[condition.field] = { gte: condition.value };
        break;
      case "less_than_equal":
        prismaCondition[condition.field] = { lte: condition.value };
        break;
      case "between":
        prismaCondition[condition.field] = {
          gte: condition.value,
          lte: condition.value2,
        };
        break;
      case "in":
        prismaCondition[condition.field] = { in: condition.value };
        break;
      case "not_in":
        prismaCondition[condition.field] = { notIn: condition.value };
        break;
      case "is_empty":
        prismaCondition[condition.field] =
          fieldDef.type === "array" ? { isEmpty: true } : { equals: null };
        break;
      case "is_not_empty":
        prismaCondition[condition.field] =
          fieldDef.type === "array" ? { isEmpty: false } : { not: null };
        break;
    }

    // Handle special field mappings
    switch (condition.field) {
      case "last_interaction":
        // This would require joining with activity logs or interactions
        // For now, we'll use updated_at as a proxy
        prismaCondition = {
          updated_at: prismaCondition[condition.field],
        };
        break;
      case "interaction_count":
        // This would require counting related records
        // For now, we'll skip this complex case
        continue;
      case "has_appointment":
        if (condition.value === true) {
          prismaCondition.appointments = { some: {} };
        } else {
          prismaCondition.appointments = { none: {} };
        }
        delete prismaCondition.has_appointment;
        break;
      case "appointment_status":
        prismaCondition.appointments = {
          some: { status: condition.value },
        };
        delete prismaCondition.appointment_status;
        break;
      case "company_size":
      case "company_industry":
      case "job_title":
        // These come from enrichment data
        prismaCondition.leadEnrichments = {
          some: { [condition.field]: prismaCondition[condition.field] },
        };
        delete prismaCondition[condition.field];
        break;
    }

    whereConditions.push(prismaCondition);
  }

  // Combine conditions with logical operators
  // For simplicity, we'll use AND for all conditions
  // A full implementation would need to handle the logicalOperator properly
  if (whereConditions.length === 1) {
    return whereConditions[0];
  }

  return { AND: whereConditions };
}

// Create a new segment
export async function createSegment(
  name: string,
  description: string | undefined,
  conditions: SegmentCondition[],
  createdBy: string,
): Promise<Segment> {
  // Validate conditions
  for (const condition of conditions) {
    if (!SEGMENT_FIELDS[condition.field as keyof typeof SEGMENT_FIELDS]) {
      throw new Error(`Invalid field: ${condition.field}`);
    }
  }

  const segment = await prisma.leadSegment.create({
    data: {
      name,
      description,
      conditions: conditions as any, // JSON field
      is_active: true,
      created_by: createdBy,
    },
  });

  return {
    id: segment.id,
    name: segment.name,
    description: segment.description || undefined,
    conditions,
    isActive: segment.is_active,
    createdBy: segment.created_by,
    createdAt: segment.created_at,
    updatedAt: segment.updated_at,
  };
}

// Update an existing segment
export async function updateSegment(
  id: string,
  updates: {
    name?: string;
    description?: string;
    conditions?: SegmentCondition[];
    isActive?: boolean;
  },
): Promise<Segment> {
  const updateData: any = {
    updated_at: new Date(),
  };

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.description !== undefined)
    updateData.description = updates.description;
  if (updates.conditions !== undefined)
    updateData.conditions = updates.conditions;
  if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

  const segment = await prisma.leadSegment.update({
    where: { id },
    data: updateData,
  });

  return {
    id: segment.id,
    name: segment.name,
    description: segment.description || undefined,
    conditions: segment.conditions as unknown as SegmentCondition[],
    isActive: segment.is_active,
    createdBy: segment.created_by,
    createdAt: segment.created_at,
    updatedAt: segment.updated_at,
  };
}

// Delete a segment
export async function deleteSegment(id: string): Promise<void> {
  await prisma.leadSegment.delete({
    where: { id },
  });
}

// Get all segments
export async function getSegments(createdBy?: string): Promise<Segment[]> {
  const where: any = {};
  if (createdBy) {
    where.created_by = createdBy;
  }

  const segments = await prisma.leadSegment.findMany({
    where,
    orderBy: { created_at: "desc" },
  });

  return segments.map((segment) => ({
    id: segment.id,
    name: segment.name,
    description: segment.description || undefined,
    conditions: segment.conditions as SegmentCondition[],
    isActive: segment.is_active,
    createdBy: segment.created_by,
    createdAt: segment.created_at,
    updatedAt: segment.updated_at,
    leadCount: segment.lead_count || undefined,
    lastCountUpdate: segment.last_count_update || undefined,
  }));
}

// Get a specific segment
export async function getSegment(id: string): Promise<Segment | null> {
  const segment = await prisma.leadSegment.findUnique({
    where: { id },
  });

  if (!segment) return null;

  return {
    id: segment.id,
    name: segment.name,
    description: segment.description || undefined,
    conditions: segment.conditions as SegmentCondition[],
    isActive: segment.is_active,
    createdBy: segment.created_by,
    createdAt: segment.created_at,
    updatedAt: segment.updated_at,
    leadCount: segment.lead_count || undefined,
    lastCountUpdate: segment.last_count_update || undefined,
  };
}

// Get leads that match a segment
export async function getSegmentLeads(
  segmentId: string,
  options?: {
    limit?: number;
    offset?: number;
    includeEnrichment?: boolean;
  },
): Promise<{ leads: Lead[]; totalCount: number }> {
  const segment = await getSegment(segmentId);
  if (!segment) {
    throw new Error("Segment not found");
  }

  const whereClause = buildWhereClause(segment.conditions);

  const [leads, totalCount] = await Promise.all([
    prisma.lead.findMany({
      where: whereClause,
      include: options?.includeEnrichment
        ? {
            leadEnrichments: {
              orderBy: { enriched_at: "desc" },
              take: 1,
            },
          }
        : undefined,
      orderBy: { created_at: "desc" },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    }),
    prisma.lead.count({
      where: whereClause,
    }),
  ]);

  return {
    leads: leads as unknown as Lead[],
    totalCount,
  };
}

// Update segment lead count
export async function updateSegmentLeadCount(
  segmentId: string,
): Promise<number> {
  const segment = await getSegment(segmentId);
  if (!segment) {
    throw new Error("Segment not found");
  }

  const whereClause = buildWhereClause(segment.conditions);
  const count = await prisma.lead.count({
    where: whereClause,
  });

  await prisma.leadSegment.update({
    where: { id: segmentId },
    data: {
      lead_count: count,
      last_count_update: new Date(),
    },
  });

  return count;
}

// Get segment statistics
export async function getSegmentStatistics(segmentId: string) {
  const segment = await getSegment(segmentId);
  if (!segment) {
    throw new Error("Segment not found");
  }

  const whereClause = buildWhereClause(segment.conditions);

  const [totalCount, statusBreakdown, sourceBreakdown, scoreDistribution] =
    await Promise.all([
      prisma.lead.count({ where: whereClause }),

      prisma.lead.groupBy({
        by: ["status"],
        where: whereClause,
        _count: { id: true },
      }),

      prisma.lead.groupBy({
        by: ["source"],
        where: whereClause,
        _count: { id: true },
      }),

      prisma.lead.findMany({
        where: whereClause,
        select: { score: true },
      }),
    ]);

  // Calculate score distribution
  const scoreRanges = {
    "0-20": 0,
    "21-40": 0,
    "41-60": 0,
    "61-80": 0,
    "81-100": 0,
  };

  scoreDistribution.forEach((lead) => {
    if (lead.score <= 20) scoreRanges["0-20"]++;
    else if (lead.score <= 40) scoreRanges["21-40"]++;
    else if (lead.score <= 60) scoreRanges["41-60"]++;
    else if (lead.score <= 80) scoreRanges["61-80"]++;
    else scoreRanges["81-100"]++;
  });

  return {
    totalCount,
    statusBreakdown: statusBreakdown.map((item) => ({
      status: item.status,
      count: item._count.id,
    })),
    sourceBreakdown: sourceBreakdown.map((item) => ({
      source: item.source,
      count: item._count.id,
    })),
    scoreDistribution: scoreRanges,
  };
}

// Create segment from template
export async function createSegmentFromTemplate(
  templateKey: keyof typeof SEGMENT_TEMPLATES,
  createdBy: string,
  customName?: string,
): Promise<Segment> {
  const template = SEGMENT_TEMPLATES[templateKey];
  if (!template) {
    throw new Error(`Template not found: ${templateKey}`);
  }

  return createSegment(
    customName || template.name,
    template.description,
    template.conditions as SegmentCondition[],
    createdBy,
  );
}

// Validate segment conditions
export function validateSegmentConditions(conditions: SegmentCondition[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  for (let i = 0; i < conditions.length; i++) {
    const condition = conditions[i];

    // Check if field exists
    if (!SEGMENT_FIELDS[condition.field as keyof typeof SEGMENT_FIELDS]) {
      errors.push(`Invalid field "${condition.field}" in condition ${i + 1}`);
      continue;
    }

    const fieldDef =
      SEGMENT_FIELDS[condition.field as keyof typeof SEGMENT_FIELDS];

    // Validate operator based on field type
    switch (fieldDef.type) {
      case "string":
        if (
          ![
            "equals",
            "not_equals",
            "contains",
            "not_contains",
            "starts_with",
            "ends_with",
            "is_empty",
            "is_not_empty",
          ].includes(condition.operator)
        ) {
          errors.push(
            `Invalid operator "${condition.operator}" for string field "${condition.field}"`,
          );
        }
        break;
      case "number":
        if (
          ![
            "equals",
            "not_equals",
            "greater_than",
            "less_than",
            "greater_than_equal",
            "less_than_equal",
            "between",
            "is_empty",
            "is_not_empty",
          ].includes(condition.operator)
        ) {
          errors.push(
            `Invalid operator "${condition.operator}" for number field "${condition.field}"`,
          );
        }
        break;
      case "date":
        if (
          ![
            "equals",
            "not_equals",
            "greater_than",
            "less_than",
            "greater_than_equal",
            "less_than_equal",
            "between",
            "is_empty",
            "is_not_empty",
          ].includes(condition.operator)
        ) {
          errors.push(
            `Invalid operator "${condition.operator}" for date field "${condition.field}"`,
          );
        }
        break;
      case "enum":
        if (
          ![
            "equals",
            "not_equals",
            "in",
            "not_in",
            "is_empty",
            "is_not_empty",
          ].includes(condition.operator)
        ) {
          errors.push(
            `Invalid operator "${condition.operator}" for enum field "${condition.field}"`,
          );
        }
        // Validate enum values
        if (
          condition.operator === "equals" &&
          fieldDef.options &&
          !fieldDef.options.includes(condition.value)
        ) {
          errors.push(
            `Invalid value "${condition.value}" for enum field "${condition.field}"`,
          );
        }
        if (condition.operator === "in" && fieldDef.options) {
          const invalidValues = condition.value.filter(
            (v: any) => !fieldDef.options!.includes(v),
          );
          if (invalidValues.length > 0) {
            errors.push(
              `Invalid values ${invalidValues.join(", ")} for enum field "${condition.field}"`,
            );
          }
        }
        break;
      case "boolean":
        if (!["equals", "not_equals"].includes(condition.operator)) {
          errors.push(
            `Invalid operator "${condition.operator}" for boolean field "${condition.field}"`,
          );
        }
        break;
      case "array":
        if (
          !["contains", "not_contains", "is_empty", "is_not_empty"].includes(
            condition.operator,
          )
        ) {
          errors.push(
            `Invalid operator "${condition.operator}" for array field "${condition.field}"`,
          );
        }
        break;
    }

    // Check required values
    if (
      [
        "equals",
        "not_equals",
        "contains",
        "not_contains",
        "starts_with",
        "ends_with",
        "greater_than",
        "less_than",
        "greater_than_equal",
        "less_than_equal",
      ].includes(condition.operator)
    ) {
      if (
        condition.value === undefined ||
        condition.value === null ||
        condition.value === ""
      ) {
        errors.push(
          `Value is required for operator "${condition.operator}" in condition ${i + 1}`,
        );
      }
    }

    if (condition.operator === "between") {
      if (condition.value === undefined || condition.value2 === undefined) {
        errors.push(
          `Two values are required for "between" operator in condition ${i + 1}`,
        );
      }
    }

    if (["in", "not_in"].includes(condition.operator)) {
      if (!Array.isArray(condition.value) || condition.value.length === 0) {
        errors.push(
          `Array value is required for operator "${condition.operator}" in condition ${i + 1}`,
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
