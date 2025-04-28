import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.error("[FOLLOW_CHECK_API] Unauthorized request - no session");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const followingId = searchParams.get("followingId");

    if (!followingId) {
      console.error("[FOLLOW_CHECK_API] Missing followingId parameter");
      return new NextResponse("Following ID is required", { status: 400 });
    }

    // Get follow relationship
    const follow = await prisma.follows.findUnique({
      where: {
        followerId_followingId: {
          followerId: session.user.id,
          followingId: followingId
        }
      }
    });

    // Get reverse follow relationship
    const reverseFollow = await prisma.follows.findUnique({
      where: {
        followerId_followingId: {
          followerId: followingId,
          followingId: session.user.id
        }
      }
    });

    return NextResponse.json({
      isFollowing: follow?.status === "ACCEPTED" || false,
      hasPendingRequest: follow?.status === "PENDING" || false,
      isFollowedByUser: reverseFollow?.status === "ACCEPTED" || false,
      hasPendingRequestFromUser: reverseFollow?.status === "PENDING" || false
    });
  } catch (error) {
    console.error("[FOLLOW_CHECK_API] Error:", {
      error,
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 