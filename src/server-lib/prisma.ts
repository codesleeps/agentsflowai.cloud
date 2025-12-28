import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["query"],
  });

// Also export as db for backward compatibility
export const db = prisma;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
