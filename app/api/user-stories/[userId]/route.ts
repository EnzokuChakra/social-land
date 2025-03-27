import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { ApiResponse, StoryWithExtras } from "@/lib/definitions";
import { Like, Story, StoryView, User } from "@prisma/client";

export async function GET(
  req: Request,
  { params }: { params: { userId: string } }
): Promise<NextResponse<ApiResponse<StoryWithExtras[]>>> {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const stories = await prisma.story.findMany({
      where: {
        user_id: params.userId,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            image: true,
            verified: true,
          },
        },
        views: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                image: true,
              },
            },
          },
          where: {
            user_id: {
              not: undefined,
            },
          },
        },
        likes: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                image: true,
              },
            },
          },
          where: {
            user_id: {
              not: undefined,
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Filter out any stories where the user relation is null
    const validStories = stories.filter((story) => {
      return (
        story.user !== null &&
        story.views.every((view) => view.user !== null) &&
        story.likes.every((like) => like.user !== null)
      );
    }) as StoryWithExtras[];

    return NextResponse.json({ 
      success: true, 
      data: validStories 
    });
  } catch (error) {
    console.error("[USER_STORIES_GET_ERROR]", {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : String(error),
      userId: params.userId,
      context: {
        timestamp: new Date().toISOString(),
        nodeEnv: process.env.NODE_ENV
      }
    });
    
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
} 