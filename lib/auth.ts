import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import NextAuth, { DefaultSession, getServerSession, type NextAuthOptions } from "next-auth";
import { GetServerSidePropsContext } from "next";
import { compare } from "bcryptjs";
import CredentialsProvider from "next-auth/providers/credentials";
import type { DefaultJWT } from "next-auth/jwt";
import { UserRole } from "./definitions";
import { db } from "@/lib/db";

// Function to get base URL
const getBaseUrl = () => {
  // In production, use the APP_URL environment variable
  if (process.env.NODE_ENV === 'production') {
    return process.env.APP_URL || process.env.NEXTAUTH_URL || 'https://social-land.ro';
  }
  // In development, use localhost
  return 'http://localhost:3000';
};

// Extend the built-in session types
// @ts-ignore - Type declaration inconsistencies between next-auth and our implementation
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string | null;
      image: string | null;
      email: string | null;
      username?: string | null;
      role?: UserRole;
      verified?: boolean;
      status?: string;
      isBanned?: boolean;
    }
  }

  interface User {
    id: string;
    username?: string | null;
    role?: UserRole;
    verified?: boolean;
    status?: string;
  }
}

// Extend the built-in JWT types
// @ts-ignore - Type declaration inconsistencies between next-auth/jwt and our implementation
declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username?: string | null;
    role?: UserRole;
    verified?: boolean;
    status?: string;
  }
}

// Determine if we're in development or production
const isDevelopment = process.env.NODE_ENV === 'development';

export const authOptions: NextAuthOptions = {
  adapter: prisma ? PrismaAdapter(prisma) : undefined,
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
    updateAge: 12 * 60 * 60, // 12 hours
  },
  pages: {
    signIn: "/login",
    error: "/auth/error",
  },
  debug: isDevelopment,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        if (!prisma) {
          throw new Error("Database connection error");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          select: {
            id: true,
            email: true,
            password: true,
            name: true,
            image: true,
            username: true,
            role: true,
            verified: true,
            status: true
          }
        });

        if (!user) {
          throw new Error("User not found");
        }

        // Check if user is banned
        if (user.status === "BANNED") {
          throw new Error("Your account has been banned for violating our community guidelines.");
        }

        // Make sure password exists before comparing
        if (typeof user.password !== 'string') {
          throw new Error("Invalid account configuration");
        }

        const isPasswordValid = await compare(credentials.password, user.password);

        if (!isPasswordValid) {
          throw new Error("Invalid password");
        }

        // Return user with correct typing
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          username: user.username,
          role: user.role as UserRole,
          verified: user.verified,
          status: user.status
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Only include necessary user data in the JWT
        token.id = user.id;
        token.name = user.name;
        token.image = user.image;
        token.username = user.username;
        token.role = user.role as UserRole;
        token.verified = user.verified;
        
        // Get the user's current status
        if (db) {
          const currentUser = await db.user.findUnique({
            where: { id: user.id },
            select: { status: true }
          });
          token.status = currentUser?.status || 'NORMAL';
        } else {
          token.status = user.status || 'NORMAL';
        }
      } else if (token?.id) {
        // Check user status on every token refresh
        if (db) {
          const user = await db.user.findUnique({
            where: { id: token.id },
            select: { status: true }
          });
          token.status = user?.status || token.status;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        // Only include necessary user data in the session
        // @ts-ignore - We know these properties exist in our implementation
        session.user = {
          id: token.id,
          name: token.name,
          image: token.image,
          email: session.user.email,
          username: token.username,
          role: token.role,
          verified: token.verified,
          status: token.status
        };

        // If user is banned, add a flag to indicate this
        if (token.status === "BANNED") {
          // @ts-ignore - We know this property exists in our implementation
          session.user.isBanned = true;
        }
      }
      return session;
    },
    async signIn({ user, account }) {
      // Check if user is banned before allowing sign in
      if (db && user.id) {
        const userStatus = await db.user.findUnique({
          where: { id: user.id },
          select: { status: true }
        });

        if (userStatus?.status === "BANNED") {
          throw new Error("Your account has been banned for violating our community guidelines.");
        }
      }

      return true;
    }
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: isDevelopment ? 'next-auth.session-token' : '__Secure-next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: isDevelopment ? 'lax' : 'none',
        path: '/',
        secure: !isDevelopment,
        domain: isDevelopment ? undefined : process.env.COOKIE_DOMAIN
      }
    },
    callbackUrl: {
      name: isDevelopment ? 'next-auth.callback-url' : '__Secure-next-auth.callback-url',
      options: {
        sameSite: isDevelopment ? 'lax' : 'none',
        path: '/',
        secure: !isDevelopment
      }
    },
    csrfToken: {
      name: isDevelopment ? 'next-auth.csrf-token' : '__Host-next-auth.csrf-token',
      options: {
        httpOnly: true,
        sameSite: isDevelopment ? 'lax' : 'none',
        path: '/',
        secure: !isDevelopment
      }
    }
  },
  events: {
    async signIn({ user }) {
      console.log('[AUTH DEBUG] User signed in event:', { userId: user.id, timestamp: new Date().toISOString() });
    },
    async signOut({ session }) {
      console.log('[AUTH DEBUG] User signed out event:', { userId: session?.user?.id, timestamp: new Date().toISOString() });
    }
  }
};

export const auth = () => getServerSession(authOptions);

export async function getSession(
  req: GetServerSidePropsContext["req"],
  res: GetServerSidePropsContext["res"]
) {
  return await getServerSession(req, res, authOptions);
}

const handler = NextAuth(authOptions);
export default handler; 