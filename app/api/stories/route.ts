import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { subHours } from "date-fns";
import { ApiResponse, StoryWithExtras } from "@/lib/definitions";

// GET /api/stories - Get stories for a user
export async function GET(
  request: Request
): Promise<NextResponse<ApiResponse<StoryWithExtras[]>>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Missing userId" },
        { status: 400 }
      );
    }

    // Get stories from the last 24 hours
    const stories = await prisma.story.findMany({
      where: {
        user_id: userId,
        createdAt: {
          gte: subHours(new Date(), 24),
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
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Filter out any stories where the user relation is null
    const validStories = stories.filter((story): story is StoryWithExtras => 
      story.user !== null && 
      story.views.every(view => view.user !== null) &&
      story.likes.every(like => like.user !== null)
    );

    return NextResponse.json({ 
      success: true, 
      data: validStories 
    });
  } catch (error) {
    console.error("[STORIES_GET_ERROR]", {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : String(error),
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

// POST /api/stories - Create a new story or perform story actions (like, view)
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    // Handle story creation
    if (action === "create") {
      const body = await request.json();
      const { fileUrl, scale = 1 } = body;

      if (!fileUrl) {
        return NextResponse.json(
          { success: false, error: "File URL is required" },
          { status: 400 }
        );
      }

      // First verify the user exists
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true }
      });

      if (!user) {
        return NextResponse.json(
          { success: false, error: "User not found" },
          { status: 404 }
        );
      }

      const story = await prisma.story.create({
        data: {
          id: crypto.randomUUID(),
          fileUrl,
          scale,
          user_id: session.user.id,
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
          },
        },
      });

      return NextResponse.json({ success: true, data: story });
    }

    const storyId = searchParams.get("storyId");

    if (!storyId || !action) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Verify story exists before proceeding
    const story = await prisma.story.findUnique({
      where: { id: storyId }
    });

    if (!story) {
      return NextResponse.json(
        { success: false, error: "Story not found" },
        { status: 404 }
      );
    }

    if (action === "view") {
      try {
        // Check if already viewed
        const existingView = await prisma.storyview.findFirst({
          where: {
            storyId,
            user_id: session.user.id,
          },
        });

        if (!existingView) {
          await prisma.storyview.create({
            data: {
              id: crypto.randomUUID(),
              storyId,
              user_id: session.user.id,
            },
          });
          console.log("[STORY_VIEW_CREATED]", {
            storyId,
            userId: session.user.id,
            timestamp: new Date().toISOString()
          });
        }

        return NextResponse.json({ success: true, message: "Story viewed" });
      } catch (viewError) {
        console.error("[STORY_VIEW_ERROR]", {
          error: viewError instanceof Error ? {
            message: viewError.message,
            stack: viewError.stack,
            name: viewError.name
          } : String(viewError),
          context: {
            storyId,
            userId: session.user.id,
            timestamp: new Date().toISOString()
          }
        });
        return NextResponse.json(
          { success: false, error: "Failed to record story view" },
          { status: 500 }
        );
      }
    }

    if (action === "like") {
      try {
        const existingLike = await prisma.like.findFirst({
          where: {
            storyId,
            user_id: session.user.id,
          },
        });

        if (existingLike) {
          await prisma.like.delete({
            where: {
              id: existingLike.id,
            },
          });
        } else {
          await prisma.like.create({
            data: {
              id: crypto.randomUUID(),
              storyId,
              user_id: session.user.id,
            },
          });
        }

        return NextResponse.json({ success: true, message: "Like toggled" });
      } catch (likeError) {
        console.error("[STORY_LIKE_ERROR]", {
          error: likeError instanceof Error ? {
            message: likeError.message,
            stack: likeError.stack,
            name: likeError.name
          } : String(likeError),
          context: {
            storyId,
            userId: session.user.id,
            timestamp: new Date().toISOString()
          }
        });
        return NextResponse.json(
          { success: false, error: "Failed to toggle like" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[STORIES_POST_ERROR]", {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : String(error),
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