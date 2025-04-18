import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { subHours } from "date-fns";
import { ApiResponse, StoryWithExtras } from "@/lib/definitions";
import { PrismaClient } from "@prisma/client";

// Ensure prisma is properly typed
const db = prisma as PrismaClient;

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

    // Check if user is blocked
    const blockRecord = await db.block.findFirst({
      where: {
        blockerId: session.user.id,
        blockedId: userId,
      },
    });

    if (blockRecord) {
      return NextResponse.json(
        { success: false, error: "Cannot view stories of blocked users" },
        { status: 403 }
      );
    }

    // Check if user is blocked by the target user
    const blockedByRecord = await db.block.findFirst({
      where: {
        blockerId: userId,
        blockedId: session.user.id,
      },
    });

    if (blockedByRecord) {
      return NextResponse.json(
        { success: false, error: "You have been blocked by this user" },
        { status: 403 }
      );
    }

    // Get stories from the last 24 hours
    const stories = await db.story.findMany({
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
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { id: true }
      });

      if (!user) {
        return NextResponse.json(
          { success: false, error: "User not found" },
          { status: 404 }
        );
      }

      const story = await db.story.create({
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

      // Make sure the hasActiveStory flag is correctly set for the user (in-memory only)
      // This is to ensure they see their own story ring properly
      try {
        // Find the user's settings
        const userSettings = await db.user_setting.findUnique({
          where: {
            user_id: session.user.id
          }
        });

        // Reset lastViewedOwnStories to null or a past date to ensure the story appears as unviewed
        if (userSettings) {
          // Set to null or a past date to make story appear unviewed
          await db.user_setting.update({
            where: {
              id: userSettings.id
            },
            data: {
              // Set to null to make sure the story is unviewed
              lastViewedOwnStories: null
            }
          });
        }
      } catch (settingsError) {
        console.error("[STORY_CREATE_SETTINGS_ERROR]", settingsError);
        // Don't fail the whole request if this part fails
      }

      return NextResponse.json({ success: true, data: story });
    }

    const storyId = searchParams.get("storyId");

    if (!storyId || !action) {
      return NextResponse.json(
        { success: false, error: "Missing storyId or action" },
        { status: 400 }
      );
    }

    // Handle story like
    if (action === "like") {
      const existingLike = await db.like.findFirst({
        where: {
          storyId,
          user_id: session.user.id,
        },
      });

      if (existingLike) {
        await db.like.delete({
          where: {
            id: existingLike.id,
          },
        });

        return NextResponse.json({ success: true, data: { liked: false } });
      }

      const like = await db.like.create({
        data: {
          id: crypto.randomUUID(),
          storyId,
          user_id: session.user.id,
          createdAt: new Date(),
          updatedAt: new Date()
        },
      });

      return NextResponse.json({ success: true, data: { liked: true } });
    }

    // Handle story view
    if (action === "view") {
      const existingView = await db.storyview.findFirst({
        where: {
          storyId,
          user_id: session.user.id,
        },
      });

      if (existingView) {
        return NextResponse.json({ success: true, data: { viewed: true } });
      }

      await db.storyview.create({
        data: {
          id: crypto.randomUUID(),
          storyId,
          user_id: session.user.id,
        },
      });

      return NextResponse.json({ success: true, data: { viewed: true } });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[STORIES_POST_ERROR]", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
} 