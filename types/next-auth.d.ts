import { DefaultSession } from "next-auth";
import { UserRoleType } from "@/lib/definitions";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string | null;
      image: string | null;
      username: string | null;
      role: UserRoleType;
      verified: boolean;
    };
  }

  interface User {
    id: string;
    name: string | null;
    image: string | null;
    username: string | null;
    role: UserRoleType;
    verified: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    name: string | null;
    image: string | null;
    username: string | null;
    role: UserRoleType;
    verified: boolean;
  }
} 