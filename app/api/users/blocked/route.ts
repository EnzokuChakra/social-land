import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    if (!prisma) {
      console.error("[BLOCKED_USERS_API] Prisma client not initialized");
      return new NextResponse(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500 }
      );
    }

    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      console.error("[BLOCKED_USERS_API] Unauthorized request - no session");
      return new NextResponse(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401 }
      );
    }

    const blockedUsers = await prisma.blockedUser.findMany({
      where: {
        blockerId: session.user.id
      },
      include: {
        blocked: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return new NextResponse(
      JSON.stringify(blockedUsers.map(block => ({
        ...block.blocked,
        blockedAt: block.createdAt
      }))),
      { status: 200 }
    );
  } catch (error) {
    console.error("[BLOCKED_USERS_API] Error:", error);
    return new NextResponse(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Failed to fetch blocked users"
      }), 
      { status: 500 }
    );
  }
} 