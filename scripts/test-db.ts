import { PrismaClient } from "@prisma/client";

async function testConnection() {
    const prisma = new PrismaClient();
    try {
        console.log("Testing database connection...");
        await prisma.$connect();
        console.log("Successfully connected to the database.");
        const users = await prisma.user.findMany({
            select: { email: true }
        });
        console.log(`User count: ${users.length}`);
        console.log("Registered emails:", users.map(u => u.email).join(", "));
    } catch (error) {
        console.error("Database connection failed:");
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

testConnection();
