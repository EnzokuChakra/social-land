import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { username: string } }
) {
  try {
    const { username } = await params;

    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        posts: true,
        followers: {
          where: {
            status: "ACCEPTED"
          }
        },
        following: {
          where: {
            status: "ACCEPTED"
          }
        }
      }
    });

    if (!user) {
      console.error("[PROFILE_STATS_API] User not found:", username);
      return new NextResponse(
        JSON.stringify({
          error: "User not found"
        }),
        { status: 404 }
      );
    }

    const stats = {
      posts: user.posts.length,
      followers: user.followers.length,
      following: user.following.length,
      reels: 0 // We'll implement reels count later
    };

    return new NextResponse(
      JSON.stringify({
        stats
      })
    );
  } catch (error) {
    console.error("[PROFILE_STATS_API] Error:", {
      error,
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    return new NextResponse(
      JSON.stringify({
        error: "Internal Server Error"
      }),
      { status: 500 }
    );
  }
} 