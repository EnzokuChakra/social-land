import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { username: string } }
) {
  try {
    const username = params.username;

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
      return new NextResponse(
        JSON.stringify({
          error: "User not found"
        }),
        { status: 404 }
      );
    }

    const stats = {
      posts: user.posts.length,
      followers: user.following.length,
      following: user.followers.length,
      reels: 0 // We'll implement reels count later
    };

    return new NextResponse(
      JSON.stringify({
        stats
      })
    );
  } catch (error) {
    console.error("[PROFILE_STATS_ERROR]", error);
    return new NextResponse(
      JSON.stringify({
        error: "Internal Server Error"
      }),
      { status: 500 }
    );
  }
} 