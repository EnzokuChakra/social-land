import { DefaultSession } from "next-auth";
import { UserRoleType } from "@/lib/definitions";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string | null;
      role: UserRoleType;
      verified: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    username: string | null;
    role: UserRoleType;
    verified: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string | null;
    role: UserRoleType;
    verified: boolean;
  }
} 