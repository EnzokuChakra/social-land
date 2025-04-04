import { UserRole } from "@/lib/definitions"
import NextAuth, { DefaultSession } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name: string | null
      image: string | null
      username: string
      role: UserRole
      verified: boolean
    }
  }

  interface User {
    id: string
    name: string | null
    image: string | null
    username: string
    role: UserRole
    verified: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    name: string | null
    image: string | null
    username: string
    role: UserRole
    verified: boolean
  }
} 