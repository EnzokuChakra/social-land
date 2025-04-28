import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!prisma) {
      return new NextResponse("Database connection error", { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");
    const cursor = searchParams.get("cursor");
    const limit = parseInt(searchParams.get("limit") || "20");

    if (!username) {
      return new NextResponse("Username is required", { status: 400 });
    }

    // First get the user ID from the username
    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true }
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Get the user's followers with pagination
    const followers = await prisma.follows.findMany({
      where: {
        followingId: user.id,
        status: "ACCEPTED",
        ...(cursor ? {
          createdAt: {
            lt: new Date(cursor)
          }
        } : {})
      },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            name: true,
            image: true,
            verified: true,
            isPrivate: true,
            role: true,
            status: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc' // Sort by most recent followers first
      },
      take: limit + 1 // Get one extra to check if there are more
    });

    // Transform the data to match the expected format
    const transformedFollowers = followers.map((f: any) => ({
      ...f.follower,
      followerId: f.followerId,
      followingId: f.followingId,
      status: f.status,
      uniqueId: `${f.followerId}-${f.followingId}`,
      createdAt: f.createdAt
    }));

    // Check if there are more followers
    const hasMore = transformedFollowers.length > limit;
    if (hasMore) {
      transformedFollowers.pop(); // Remove the extra item
    }

    // Get the cursor for the next page
    const nextCursor = hasMore ? transformedFollowers[transformedFollowers.length - 1].createdAt : null;

    return NextResponse.json({
      followers: transformedFollowers,
      nextCursor,
      hasMore
    });
  } catch (error) {
    console.error("[FOLLOWERS_API] Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 