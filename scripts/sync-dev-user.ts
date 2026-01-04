import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const email = process.env.NEXT_PUBLIC_DEV_USER_EMAIL || "dev@example.com";
    const name = process.env.NEXT_PUBLIC_DEV_USER_NAME || "Dev User";

    console.log(`Ensuring dev user exists in database...`);
    console.log(`Email: ${email}`);
    console.log(`Name: ${name}`);

    const user = await prisma.user.upsert({
        where: { email },
        update: {
            name,
            onboarding_completed: true,
            role: 'admin',
        },
        create: {
            id: "dev-user", // Match the ID used in auth-helpers.ts dev bypass
            email,
            name,
            onboarding_completed: true,
            role: 'admin',
        },
    });

    console.log("Dev user synchronized in database:", user.id);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
