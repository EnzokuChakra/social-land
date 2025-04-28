import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface User {
  id: string;
  username: string;
  name: string;
  image: string | null;
  verified: boolean;
}

interface Block {
  blockerId: string;
}

export async function GET(request: Request) {
  try {
    console.log("[SEARCH_USERS] Request URL:", request.url);
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      console.log("[SEARCH_USERS] Unauthorized request");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query) {
      console.log("[SEARCH_USERS] No query provided");
      return new NextResponse("Query parameter is required", { status: 400 });
    }

    console.log("[SEARCH_USERS] Searching for:", query);

    // Get all users that have blocked the current user
    const blockedByUsers = await prisma.block.findMany({
      where: {
        blockedId: session.user.id,
      },
      select: {
        blockerId: true,
      },
    });

    const blockedUserIds = blockedByUsers.map((block: Block) => block.blockerId);
    console.log("[SEARCH_USERS] Blocked user IDs:", blockedUserIds);

    // First, try to find exact matches
    const exactMatches = await prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              {
                username: {
                  contains: query
                }
              },
              {
                name: {
                  contains: query
                }
              }
            ]
          },
          {
            id: {
              not: session.user.id,
              notIn: blockedUserIds
            }
          },
          {
            OR: [
              { status: 'ACTIVE' },
              { status: 'NORMAL' }
            ]
          }
        ]
      },
      select: {
        id: true,
        username: true,
        name: true,
        image: true,
        verified: true
      },
      take: 5
    });

    console.log("[SEARCH_USERS] Exact matches:", exactMatches.length);

    // Then, find partial matches excluding exact matches
    const exactMatchIds = exactMatches.map((u: User) => u.id);
    const partialMatches = await prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              {
                username: {
                  contains: query
                }
              },
              {
                name: {
                  contains: query
                }
              }
            ]
          },
          {
            id: {
              not: session.user.id,
              notIn: [...blockedUserIds, ...exactMatchIds]
            }
          },
          {
            OR: [
              { status: 'ACTIVE' },
              { status: 'NORMAL' }
            ]
          }
        ]
      },
      select: {
        id: true,
        username: true,
        name: true,
        image: true,
        verified: true
      },
      orderBy: [
        {
          username: 'asc'
        }
      ],
      take: 45
    });

    console.log("[SEARCH_USERS] Partial matches:", partialMatches.length);

    const users = [...exactMatches, ...partialMatches];
    console.log("[SEARCH_USERS] Total users found:", users.length);

    return NextResponse.json(users);
  } catch (error) {
    console.error("[SEARCH_USERS] Error:", {
      error,
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    return new NextResponse("Internal Error", { status: 500 });
  }
} 