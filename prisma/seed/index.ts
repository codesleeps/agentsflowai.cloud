import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Seed default services
  const defaultServices = [
    {
      name: "AI Agent Basic",
      description: "Basic AI Chatbot for your website",
      tier: "basic",
      price: 299,
      features: ["24/7 Availability", "Basic FAQs", "Lead Capture"],
      is_active: true,
    },
  ];

  for (const service of defaultServices) {
    await prisma.service.create({
      data: service,
    });
  }

  // Seed EnrichmentSource records
  const enrichmentSources = [
    {
      name: "people_data_labs",
      api_key_configured: false,
      is_active: false,
      priority: 1,
      rate_limit_per_minute: 60,
      cost_per_request: 0.02,
    },
    {
      name: "forager",
      api_key_configured: false,
      is_active: false,
      priority: 2,
      rate_limit_per_minute: 100,
      cost_per_request: 0.01,
    },
    {
      name: "crustdata",
      api_key_configured: false,
      is_active: false,
      priority: 3,
      rate_limit_per_minute: 50,
      cost_per_request: 0.03,
    },
  ];

  for (const source of enrichmentSources) {
    await prisma.enrichmentSource.create({ data: source });
  }

  // Seed AIProviderCosts records for OpenRouter models
  const aiProviderCosts = [
    // OpenRouter - Anthropic models
    {
      provider: "openrouter",
      model: "anthropic/claude-3.5-sonnet",
      input_cost_per_1k_tokens: 3.0,
      output_cost_per_1k_tokens: 15.0,
    },
    {
      provider: "openrouter",
      model: "anthropic/claude-3.5-haiku",
      input_cost_per_1k_tokens: 1.0,
      output_cost_per_1k_tokens: 5.0,
    },
    // OpenRouter - OpenAI models
    {
      provider: "openrouter",
      model: "openai/gpt-4-turbo",
      input_cost_per_1k_tokens: 10.0,
      output_cost_per_1k_tokens: 30.0,
    },
    {
      provider: "openrouter",
      model: "openai/gpt-4",
      input_cost_per_1k_tokens: 30.0,
      output_cost_per_1k_tokens: 60.0,
    },
    // OpenRouter - Google models
    {
      provider: "openrouter",
      model: "google/gemini-pro",
      input_cost_per_1k_tokens: 0.125,
      output_cost_per_1k_tokens: 0.375,
    },
    // OpenRouter - Meta models
    {
      provider: "openrouter",
      model: "meta-llama/llama-3.1-70b-instruct",
      input_cost_per_1k_tokens: 0.35,
      output_cost_per_1k_tokens: 1.05,
    },
    // Existing providers for reference
    {
      provider: "anthropic",
      model: "claude-3.5-sonnet-20241022",
      input_cost_per_1k_tokens: 3.0,
      output_cost_per_1k_tokens: 15.0,
    },
    {
      provider: "google",
      model: "gemini-2.0-flash",
      input_cost_per_1k_tokens: 0.075,
      output_cost_per_1k_tokens: 0.3,
    },
    {
      provider: "ollama",
      model: "mistral",
      input_cost_per_1k_tokens: 0.0,
      output_cost_per_1k_tokens: 0.0,
    },
  ];

  for (const cost of aiProviderCosts) {
    await prisma.aIProviderCost.create({ data: cost });
  }

  // Seed EmailTemplate records
  const emailTemplates = [
    {
      name: "Welcome Email",
      subject: "Welcome to {{company_name}}, {{name}}!",
      body: "Hi {{name}},\n\nThank you for your interest in our services. We're excited to help you grow your business with AI-powered solutions.\n\nBest regards,\nThe Team",
      variables: ["name", "company_name", "email"],
      category: "welcome",
    },
    {
      name: "Follow-up Email",
      subject: "Following up on our conversation",
      body: "Hi {{name}},\n\nI wanted to follow up on our recent conversation about {{company}}'s needs. Our AI solutions could help streamline your operations.\n\nWould you have time for a quick call this week?\n\nBest regards,\nThe Team",
      variables: ["name", "company"],
      category: "follow_up",
    },
    {
      name: "Nurture Sequence - Day 3",
      subject: "Quick tip for {{company_name}}",
      body: "Hi {{name}},\n\nHere's a quick tip that might help {{company_name}}:\n\n[Your tip here]\n\nLet us know if you'd like to learn more!\n\nBest regards,\nThe Team",
      variables: ["name", "company_name"],
      category: "nurture",
    },
  ];

  for (const template of emailTemplates) {
    await prisma.emailTemplate.create({ data: template });
  }

  // Seed ChannelConfig records
  const channelConfigs = [
    {
      channel_type: "whatsapp",
      is_active: false,
      provider: "twilio",
      api_credentials: {},
    },
    {
      channel_type: "sms",
      is_active: false,
      provider: "twilio",
      api_credentials: {},
    },
    {
      channel_type: "messenger",
      is_active: false,
      provider: "facebook",
      api_credentials: {},
    },
    {
      channel_type: "instagram",
      is_active: false,
      provider: "facebook",
      api_credentials: {},
    },
    {
      channel_type: "email",
      is_active: true,
      provider: "sendgrid",
      api_credentials: {},
    },
  ];

  for (const config of channelConfigs) {
    await prisma.channelConfig.create({ data: config });
  }

  // Skip workflow seeding for now to avoid TypeScript errors
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
