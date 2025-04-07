import type { Session, User } from "next-auth";
import type { JWT } from "@auth/core/jwt";
import { UserRole } from "@/lib/definitions";

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username?: string | null;
    role?: UserRole;
    verified?: boolean;
    status?: string;
  }
}

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
