import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await auth();
    console.log("[USERS_SEARCH_FOLLOWERS] Session:", session?.user);
    
    if (!session?.user?.id) {
      console.log("[USERS_SEARCH_FOLLOWERS] No session or user ID found");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.toLowerCase();
    console.log("[USERS_SEARCH_FOLLOWERS] Received search query:", query);

    if (!query) {
      console.log("[USERS_SEARCH_FOLLOWERS] No query provided, returning empty array");
      return NextResponse.json({ users: [] });
    }

    // Get users that follow the current user (Enzoku)
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

    console.log("[USERS_SEARCH_FOLLOWERS] Search results:", {
      query,
      usersFound: users.length,
      users: users.map((u: { username: string | null }) => u.username)
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("[USERS_SEARCH_FOLLOWERS]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 