import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface FollowingResult {
  followingId: string;
}

interface FollowerResult {
  followerId: string;
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.toLowerCase();

    if (!query) {
      return NextResponse.json([]);
    }

    console.log(`[MUTUAL_SEARCH_API] Searching for "${query}" for user: ${session.user.id}`);

    // Get users that current user is following
    const currentUser = await prisma.user.findUnique({
      where: {
        id: session.user.id
      },
      select: {
        following: {
          where: {
            status: "ACCEPTED"
          },
          select: {
            followingId: true
          }
        },
        followers: {
          where: {
            status: "ACCEPTED"
          },
          select: {
            followerId: true
          }
        }
      }
    });

    if (!currentUser) {
      return NextResponse.json([]);
    }

    // Extract IDs of users the current user is following
    const followingIds = currentUser.following.map((f: FollowingResult) => f.followingId);
    console.log(`[MUTUAL_SEARCH_API] User is following ${followingIds.length} users`);

    // Extract IDs of users following the current user
    const followerIds = currentUser.followers.map((f: FollowerResult) => f.followerId);
    console.log(`[MUTUAL_SEARCH_API] User is followed by ${followerIds.length} users`);

    // Find mutual followers (intersection of followers and following)
    const mutualIds = followingIds.filter((id: string) => followerIds.includes(id));
    console.log(`[MUTUAL_SEARCH_API] Found ${mutualIds.length} mutual followers`);

    // Search for users among the mutual followers that match the query
    const users = await prisma.user.findMany({
      where: {
        id: {
          in: mutualIds
        },
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
      select: {
        id: true,
        username: true,
        name: true,
        image: true,
        verified: true,
        isPrivate: true
      }
    });

    console.log(`[MUTUAL_SEARCH_API] Found ${users.length} matching users`);
    return NextResponse.json(users);
  } catch (error) {
    console.error("[MUTUAL_SEARCH_API] Error:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 