import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Only initialize Prisma on the server side
const prismaClientSingleton = () => {
  if (typeof window !== 'undefined') {
    return undefined;
  }

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not defined in environment variables');
    throw new Error('DATABASE_URL is not defined in environment variables');
  }

  return new PrismaClient({
    log: ['error', 'warn'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

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

export default prisma;
