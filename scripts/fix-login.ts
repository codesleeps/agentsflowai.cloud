import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    const email = "codesleep43@gmail.com";
    const password = "Password123!";
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log(`Checking for user: ${email}...`);

    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (user) {
        console.log("User found, updating password...");
        await prisma.user.update({
            where: { email },
            data: {
                password: hashedPassword,
                onboarding_completed: true,
                role: 'admin'
            },
        });
        console.log("Password updated successfully!");
    } else {
        console.log("User not found, creating new user...");
        await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name: "CodeSleep",
                role: 'admin',
                onboarding_completed: true,
            },
        });
        console.log("User created successfully!");
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
