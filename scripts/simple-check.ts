
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Connecting...');
        const userCount = await prisma.user.count();
        console.log('User count:', userCount);
        const serviceCount = await prisma.service.count();
        console.log('Service count:', serviceCount);
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
