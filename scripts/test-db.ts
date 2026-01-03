import { PrismaClient } from "@prisma/client";

async function testConnection() {
    const prisma = new PrismaClient();
    try {
        console.log("Testing database connection...");
        await prisma.$connect();
        console.log("Successfully connected to the database.");
        const userCount = await prisma.user.count();
        console.log(`User count: ${userCount}`);
    } catch (error) {
        console.error("Database connection failed:");
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

testConnection();
