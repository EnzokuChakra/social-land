import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { username: string } }
) {
  try {
    const { username } = await params;
    console.log("[PROFILE_STATS_API] Fetching stats for username:", username);

    // First get the user to ensure they exist
    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true }
    });

    if (!user) {
      console.error("[PROFILE_STATS_API] User not found:", username);
      return new NextResponse(
        JSON.stringify({
          error: "User not found"
        }),
        { 
          status: 404,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        }
      );
    }

    // Get counts separately to ensure we're getting accurate numbers
    const [postsCount, followersCount, followingCount] = await Promise.all([
      prisma.post.count({
        where: { user_id: user.id }
      }),
      prisma.follows.count({
        where: {
          followingId: user.id,
          status: "ACCEPTED"
        }
      }),
      prisma.follows.count({
        where: {
          followerId: user.id,
          status: "ACCEPTED"
        }
      })
    ]);

    console.log("[PROFILE_STATS_API] Counts retrieved:", {
      username,
      postsCount,
      followersCount,
      followingCount
    });

    const stats = {
      posts: postsCount,
      followers: followersCount,
      following: followingCount,
      reels: 0 // We'll implement reels count later
    };

    console.log("[PROFILE_STATS_API] Returning stats:", stats);

    return new NextResponse(
      JSON.stringify({
        stats
      }),
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
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
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  }
} 