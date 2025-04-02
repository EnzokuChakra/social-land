import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      console.error("[FOLLOW_STATUS_API] Unauthorized request - no session");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      console.error("[FOLLOW_STATUS_API] Missing userId parameter");
      return new NextResponse("User ID is required", { status: 400 });
    }

    // Check if the current user is following the target user
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

    return NextResponse.json({
      status: follow?.status || null,
    });
  } catch (error) {
    console.error("[FOLLOW_STATUS_API] Error:", {
      error,
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 