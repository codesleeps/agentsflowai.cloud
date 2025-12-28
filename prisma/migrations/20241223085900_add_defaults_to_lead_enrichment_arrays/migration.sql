-- Add default values for tech_stack and skills arrays in lead_enrichments table
ALTER TABLE "lead_enrichments" ALTER COLUMN "tech_stack" SET DEFAULT ARRAY[]::text[];
ALTER TABLE "lead_enrichments" ALTER COLUMN "skills" SET DEFAULT ARRAY[]::text[];
