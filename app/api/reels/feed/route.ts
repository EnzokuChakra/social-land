import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const session = await auth();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const reels = await prisma.reel.findMany({
      where: {
        status: "APPROVED",
        user: {
          status: {
            not: "BANNED"
          }
        }
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            image: true,
            verified: true
          }
        },
        likes: {
          where: {
            user_id: session.user.id
          },
          select: {
            id: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      skip,
      take: limit
    });

    // Get total count for pagination
    const totalReels = await prisma.reel.count({
      where: {
        status: "APPROVED",
        user: {
          status: {
            not: "BANNED"
          }
        }
      }
    });

    const hasMore = totalReels > skip + limit;

    // Transform the response to include isLiked and remove the likes array
    const transformedReels = reels.map(reel => ({
      ...reel,
      isLiked: reel.likes.length > 0,
      likes: undefined
    }));

    return NextResponse.json({
      reels: transformedReels,
      hasMore
    });
  } catch (error) {
    console.error("[REELS_FEED]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 