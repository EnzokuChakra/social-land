import { prisma } from "@/lib/prisma";

export const db = prisma;

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