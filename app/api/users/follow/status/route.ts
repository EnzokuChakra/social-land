import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    console.log("[Follow Status API] Received status check request");
    const session = await auth();
    
    console.log("[Follow Status API] Session check:", {
      hasSession: !!session,
      userId: session?.user?.id,
      timestamp: new Date().toISOString()
    });

    if (!session?.user?.id) {
      console.log("[Follow Status API] Unauthorized request - no session");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    console.log("[Follow Status API] Request parameters:", {
      userId,
      sessionUserId: session.user.id
    });

    if (!userId) {
      console.log("[Follow Status API] Missing userId parameter");
      return new NextResponse("User ID is required", { status: 400 });
    }

    // Check if the current user is following the target user
    console.log("[Follow Status API] Checking follow relationship");
    const follow = await prisma.follows.findUnique({
      where: {
        followerId_followingId: {
          followerId: session.user.id,
          followingId: userId,
        },
      },
      select: {
        status: true,
      },
    });

    console.log("[Follow Status API] Follow relationship result:", {
      found: !!follow,
      status: follow?.status
    });

    return NextResponse.json({
      status: follow?.status || null,
    });
  } catch (error) {
    console.error("[Follow Status API] Error:", {
      error,
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 