import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SERVICE_PACKAGES = [
    {
        name: "Basic",
        description: "Perfect for getting started with essential features",
        tier: "basic",
        price: 99,
        features: [
            "Up to 1,000 leads per month",
            "Basic lead scoring",
            "Email notifications",
            "Standard support",
            "Basic analytics dashboard",
        ],
        is_active: true,
    },
    {
        name: "Growth",
        description: "Ideal for growing businesses with advanced features",
        tier: "growth",
        price: 299,
        features: [
            "Up to 10,000 leads per month",
            "Advanced lead scoring with AI",
            "Priority email & chat support",
            "Custom workflows automation",
            "Advanced analytics & reporting",
            "Lead enrichment (up to 500/month)",
            "Integration with popular CRM tools",
        ],
        is_active: true,
    },
    {
        name: "Enterprise",
        description: "Complete solution for large organizations",
        tier: "enterprise",
        price: 999,
        features: [
            "Unlimited leads",
            "AI-powered lead scoring & insights",
            "Dedicated account manager",
            "Custom integrations & API access",
            "Advanced team collaboration tools",
            "Unlimited lead enrichment",
            "White-label solutions",
            "SLA guarantees & premium support",
            "Custom feature development",
        ],
        is_active: true,
    },
];

async function main() {
    console.log("Connecting to DB...");

    // Clean existing services
    const deleteResult = await prisma.service.deleteMany();
    console.log(`Deleted ${deleteResult.count} existing services.`);

    // Insert new services
    for (const service of SERVICE_PACKAGES) {
        await prisma.service.create({
            data: service,
        });
        console.log(`Created service: ${service.name}`);
    }

    // Verify
    const count = await prisma.service.count();
    console.log(`Total services in DB: ${count}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
