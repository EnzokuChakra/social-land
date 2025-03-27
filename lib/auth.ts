import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import NextAuth, { DefaultSession, getServerSession, type NextAuthOptions } from "next-auth";
import { GetServerSidePropsContext } from "next";
import { compare } from "bcryptjs";
import CredentialsProvider from "next-auth/providers/credentials";
import type { DefaultJWT, JWT } from "next-auth/jwt";
import { UserRole, UserRoleType, UserStatus } from "./definitions";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    username?: string | null;
    role: UserRoleType;
    verified?: boolean;
  }

  interface Session {
    user: User & {
      username?: string | null;
      verified?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    username?: string | null;
    role: UserRoleType;
    verified?: boolean;
    email: string;
    name?: string | null;
    picture?: string | null;
  }
}

// Function to get base URL
const getBaseUrl = () => {
  // In production, use the APP_URL environment variable
  if (process.env.NODE_ENV === 'production') {
    return process.env.APP_URL || process.env.NEXTAUTH_URL || 'https://social-land.ro';
  }
  // In development, use localhost
  return 'http://localhost:3000';
};

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: "/login",
  },
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

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          },
        });

        if (!user) {
          throw new Error("No user found");
        }

        if (!user.password) {
          throw new Error("Invalid login method");
        }

        if (user.status === "BANNED") {
          throw new Error("AccessDenied");
        }

        const passwordValid = await compare(credentials.password, user.password);

        if (!passwordValid) {
          throw new Error("Invalid credentials");
        }

        console.log('[Auth] User authorized:', { id: user.id, email: user.email });
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username || null,
          image: user.image,
          role: user.role as UserRoleType,
          verified: user.verified,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      console.log('[Auth] SignIn callback:', { user, account, profile, email, credentials });
      if (!user?.email) return false;
      return true;
    },
    async jwt({ token, user, account, profile, trigger, session }) {
      console.log('[Auth] JWT callback:', { token, user, account, profile, trigger, session });
      if (user) {
        token.id = user.id;
        token.username = user.username ?? null;
        token.role = user.role;
        token.verified = user.verified;
        token.email = user.email;
        token.name = user.name;
        token.image = user.image;
      }

      if (trigger === "update" && session) {
        token = { ...token, ...session };
      }

      return token;
    },
    async session({ session, token, user }) {
      console.log('[Auth] Session callback:', { session, token, user });
      
      // Initialize session if it doesn't exist
      if (!session) {
        session = {
          user: {
            id: '',
            email: '',
            username: null,
            role: UserRole.USER,
            verified: false
          },
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
        };
      }

      // Initialize session.user if it doesn't exist
      if (!session.user) {
        session.user = {
          id: '',
          email: '',
          username: null,
          role: UserRole.USER,
          verified: false
        };
      }

      // Update session.user with token data
      if (token) {
        session.user = {
          ...session.user,
          id: token.id as string,
          email: token.email as string,
          username: token.username ?? null,
          role: token.role as UserRoleType,
          verified: token.verified as boolean,
          name: token.name as string | null,
          image: token.image as string | null
        };
      }

      // Ensure the session is properly typed and has all required properties
      const updatedSession = {
        ...session,
        expires: session.expires || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        user: {
          ...session.user,
          id: session.user.id || '',
          email: session.user.email || '',
          username: session.user.username ?? null,
          role: session.user.role || UserRole.USER,
          verified: session.user.verified ?? false,
          name: session.user.name ?? null,
          image: session.user.image ?? null
        }
      };

      console.log('[Auth] Final session:', updatedSession);
      return updatedSession;
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
        sameSite: 'lax',
        path: '/',
        secure: true,
        maxAge: 30 * 24 * 60 * 60, // 30 days
      },
    },
    callbackUrl: {
      name: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.callback-url' : 'next-auth.callback-url',
      options: {
        sameSite: 'lax',
        path: '/',
        secure: true,
      },
    },
    csrfToken: {
      name: process.env.NODE_ENV === 'production' ? '__Host-next-auth.csrf-token' : 'next-auth.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
      },
    },
  },
  debug: true,
  events: {
    async signIn(message) {
      console.log('[Auth] User signed in:', message);
    },
    async signOut(message) {
      console.log('[Auth] User signed out:', message);
    },
    async session(message) {
      console.log('[Auth] Session updated:', message);
    },
  },
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