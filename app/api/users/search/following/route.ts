import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    console.log("Session:", session?.user);
    
    if (!session?.user?.id) {
      console.log("No session or user ID found");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.toLowerCase();
    console.log("Received search query:", query);

    if (!query) {
      console.log("No query provided, returning empty array");
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

    console.log("Search query:", query);
    console.log("Found users:", JSON.stringify(users, null, 2));
    console.log("Number of users found:", users.length);

    return NextResponse.json({ users });
  } catch (error) {
    console.error("[USERS_SEARCH_FOLLOWING]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 