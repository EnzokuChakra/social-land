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

    // Get the user's followers
    const followers = await prisma.follows.findMany({
      where: {
        followingId: user.id,
        status: "ACCEPTED"
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
      }
    });

    // Transform the data to match the expected format
    const transformedFollowers = followers.map(f => ({
      ...f.follower,
      followerId: f.followerId,
      followingId: f.followingId,
      status: f.status
    }));

    return NextResponse.json(transformedFollowers);
  } catch (error) {
    console.error("[FOLLOWERS_API] Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 