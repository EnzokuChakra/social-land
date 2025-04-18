import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      console.error("[FOLLOWING_SEARCH_API] Unauthorized request - no session");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.toLowerCase();

    if (!query) {
      return NextResponse.json({ users: [] });
    }

    // Get users that follow the current user
    const users = await prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              {
                username: {
                  contains: query
                },
              },
              {
                name: {
                  contains: query
                },
              },
            ],
          },
          {
            followers: {
              some: {
                followingId: session.user.id,
                status: "ACCEPTED"
              }
            }
          }
        ]
      },
      select: {
        id: true,
        username: true,
        name: true,
        image: true,
        verified: true,
        isPrivate: true,
      },
      take: 10,
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("[FOLLOWING_SEARCH_API] Error:", {
      error,
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    return new NextResponse("Internal Error", { status: 500 });
  }
} 