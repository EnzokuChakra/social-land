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
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string | null;
      image: string | null;
      username: string;
      role: UserRole;
      verified: boolean;
    }
  }
}

// Extend the built-in JWT types
declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    role: UserRole;
    verified: boolean;
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
    updateAge: 12 * 60 * 60, // 12 hours
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  debug: process.env.NODE_ENV === 'development',
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
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
            verified: true
          }
        });

        if (!user) {
          throw new Error("User not found");
        }

        const isPasswordValid = await compare(credentials.password, user.password);

        if (!isPasswordValid) {
          throw new Error("Invalid password");
        }

        // Only return necessary user data
        return {
          id: user.id,
          name: user.name,
          image: user.image,
          username: user.username,
          role: user.role,
          verified: user.verified
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
        token.role = user.role;
        token.verified = user.verified;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        // Only include necessary user data in the session
        session.user = {
          id: token.id,
          name: token.name,
          image: token.image,
          username: token.username,
          role: token.role,
          verified: token.verified
        };
      }
      return session;
    },
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain: process.env.NODE_ENV === 'production' ? process.env.COOKIE_DOMAIN : undefined
      }
    },
    callbackUrl: {
      name: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.callback-url' : 'next-auth.callback-url',
      options: {
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    },
    csrfToken: {
      name: process.env.NODE_ENV === 'production' ? '__Host-next-auth.csrf-token' : 'next-auth.csrf-token',
      options: {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  },
  events: {
    async signIn({ user }) {
      console.log('[Auth] User signed in:', user.id);
    },
    async signOut({ session }) {
      console.log('[Auth] User signed out:', session?.user?.id);
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