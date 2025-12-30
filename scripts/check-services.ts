import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const deleteResult = await prisma.service.deleteMany();
    console.log("Deleted services count:", deleteResult.count);
    const services = await prisma.service.findMany();
    console.log("Services in DB after delete:", JSON.stringify(services, null, 2));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
