import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

// Add block model to Prisma client
declare module "@prisma/client" {
  interface PrismaClient {
    block: {
      findFirst: (args: any) => Promise<any>;
      create: (args: any) => Promise<any>;
      delete: (args: any) => Promise<any>;
    };
  }
} 