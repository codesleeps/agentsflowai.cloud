import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testSchema() {
  console.log("Testing schema...\n");

  // Test Lead with enrichment
  console.log("1. Creating test lead...");
  const lead = await prisma.lead.create({
    data: {
      name: "Test Lead",
      email: "test@example.com",
      company: "Test Company",
      source: "website",
    },
  });
  console.log("✅ Lead created:", lead.id);

  // Test LeadEnrichment
  console.log("\n2. Creating lead enrichment...");
  const enrichment = await prisma.leadEnrichment.create({
    data: {
      lead_id: lead.id,
      source: "people_data_labs",
      enrichment_data: {
        test: "data",
        person: {
          name: "John Doe",
          email: "john@example.com",
        },
      },
      confidence_score: 0.95,
      company_name: "Acme Inc",
      job_title: "CTO",
      tech_stack: ["React", "Node.js", "TypeScript"],
      skills: ["Leadership", "Architecture"],
      enriched_at: new Date(),
    },
  });
  console.log("✅ LeadEnrichment created:", enrichment.id);

  // Test IntentSignal
  console.log("\n3. Creating intent signal...");
  const signal = await prisma.intentSignal.create({
    data: {
      lead_id: lead.id,
      signal_type: "website_visit",
      signal_data: { page: "/pricing", duration: 120 },
      score_impact: 10,
    },
  });
  console.log("✅ IntentSignal created:", signal.id);

  // Test EmailTemplate
  console.log("\n4. Creating email template...");
  const template = await prisma.emailTemplate.create({
    data: {
      name: "Test Template",
      subject: "Hello {{name}}",
      body: "Welcome {{name}} to our platform!",
      variables: ["name"],
      category: "welcome",
    },
  });
  console.log("✅ EmailTemplate created:", template.id);

  // Test EmailCampaign
  console.log("\n5. Creating email campaign...");
  const campaign = await prisma.emailCampaign.create({
    data: {
      name: "Test Campaign",
      status: "draft",
      target_audience: { location: "US", industry: "tech" },
    },
  });
  console.log("✅ EmailCampaign created:", campaign.id);

  // Test EmailSequenceStep
  console.log("\n6. Creating email sequence step...");
  const step = await prisma.emailSequenceStep.create({
    data: {
      campaign_id: campaign.id,
      template_id: template.id,
      step_number: 1,
      delay_hours: 24,
    },
  });
  console.log("✅ EmailSequenceStep created:", step.id);

  // Test Workflow
  console.log("\n7. Creating workflow...");
  const workflow = await prisma.workflow.create({
    data: {
      name: "Test Workflow",
      status: "draft",
      is_template: true,
    },
  });
  console.log("✅ Workflow created:", workflow.id);

  // Test WorkflowTrigger
  console.log("\n8. Creating workflow trigger...");
  const trigger = await prisma.workflowTrigger.create({
    data: {
      workflow_id: workflow.id,
      trigger_type: "lead_created",
      trigger_config: { conditions: { source: ["website"] } },
    },
  });
  console.log("✅ WorkflowTrigger created:", trigger.id);

  // Test WorkflowAction
  console.log("\n9. Creating workflow action...");
  const action = await prisma.workflowAction.create({
    data: {
      workflow_id: workflow.id,
      action_type: "send_email",
      action_config: { template_id: template.id },
      order: 1,
    },
  });
  console.log("✅ WorkflowAction created:", action.id);

  // Test ChannelConfig (skip since seed already created it)
  console.log("\n10. Skipping ChannelConfig (already seeded)...");

  // Test relationships
  console.log("\n11. Testing relationships...");
  const leadWithEnrichment = await prisma.lead.findUnique({
    where: { id: lead.id },
    include: {
      leadEnrichments: true,
      intentSignals: true,
    },
  });
  console.log(
    "✅ Lead with enrichments:",
    leadWithEnrichment?.leadEnrichments.length,
    "enrichments",
  );
  console.log(
    "✅ Lead with signals:",
    leadWithEnrichment?.intentSignals.length,
    "signals",
  );

  // Clean up test data
  console.log("\n12. Cleaning up test data...");
  await prisma.workflowAction.delete({ where: { id: action.id } });
  await prisma.workflowTrigger.delete({ where: { id: trigger.id } });
  await prisma.workflow.delete({ where: { id: workflow.id } });
  await prisma.emailSequenceStep.delete({ where: { id: step.id } });
  await prisma.emailCampaign.delete({ where: { id: campaign.id } });
  await prisma.emailTemplate.delete({ where: { id: template.id } });
  await prisma.intentSignal.delete({ where: { id: signal.id } });
  await prisma.leadEnrichment.delete({ where: { id: enrichment.id } });
  await prisma.lead.delete({ where: { id: lead.id } });
  console.log("✅ Test data cleaned up");

  console.log("\n🎉 All schema tests passed!");
}

testSchema()
  .catch((e) => {
    console.error("❌ Test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
