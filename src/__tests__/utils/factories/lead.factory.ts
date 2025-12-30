import type { Lead } from "@/shared/models/types";

let leadCounter = 1;

export const createMockLead = (overrides: Partial<Lead> = {}): Lead => ({
  id: `lead-${leadCounter++}`,
  name: "John Doe",
  email: `john.doe${leadCounter}@example.com`,
  company: "Example Corp",
  phone: "+1234567890",
  status: "new",
  score: 75,
  source: "website",
  budget: "medium",
  timeline: "1-3months",
  interests: ["web-development", "consulting"],
  notes: null,
  qualified_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const createMockLeads = (
  count: number,
  overrides: Partial<Lead>[] | Partial<Lead> = {},
): Lead[] => {
  return Array.from({ length: count }, (_, index) => {
    const leadOverrides = Array.isArray(overrides)
      ? overrides[index] || {}
      : overrides;
    return createMockLead({
      id: `lead-${index + 1}`,
      email: `lead${index + 1}@example.com`,
      ...leadOverrides,
    });
  });
};

export const createMockQualifiedLead = (
  overrides: Partial<Lead> = {},
): Lead => {
  return createMockLead({
    status: "qualified",
    score: 85,
    qualified_at: new Date().toISOString(),
    budget: "high",
    timeline: "immediate",
    ...overrides,
  });
};

export const createMockWonLead = (overrides: Partial<Lead> = {}): Lead => {
  return createMockLead({
    status: "won",
    score: 95,
    qualified_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week ago
    ...overrides,
  });
};
