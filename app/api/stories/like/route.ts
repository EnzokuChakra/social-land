import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!prisma) {
      return NextResponse.json(
        { success: false, error: "Database connection error" },
        { status: 500 }
      );
    }

    // Get request body
    const { storyId, action } = await req.json();

    if (!storyId) {
      return NextResponse.json(
        { success: false, error: "Story ID is required" },
        { status: 400 }
      );
    }

    // Check if the story exists
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    if (!story) {
      return NextResponse.json(
        { success: false, error: "Story not found" },
        { status: 404 }
      );
    }

    // Handle like/unlike based on action
    if (action === 'like') {
      // Check if the like already exists
      const existingLike = await prisma.like.findFirst({
        where: {
          storyId: storyId,
          user_id: session.user.id,
        },
      });

      if (existingLike) {
        return NextResponse.json({
          success: true,
          message: "Story already liked",
          alreadyLiked: true,
        });
      }

      // Create new like
      await prisma.like.create({
        data: {
          id: uuidv4(),
          storyId: storyId,
          user_id: session.user.id,
          updatedAt: new Date(),
        },
      });

      // Create notification for story owner (unless user is liking their own story)
      if (story.user.id !== session.user.id) {
        // Check if there's already a notification for this like
        const existingNotification = await prisma.notification.findFirst({
          where: {
            type: "STORY_LIKE",
            userId: story.user.id,
            sender_id: session.user.id,
            storyId: storyId,
          },
        });

        // Only create a new notification if one doesn't exist
        if (!existingNotification) {
          await prisma.notification.create({
            data: {
              id: uuidv4(),
              type: "STORY_LIKE",
              userId: story.user.id,
              sender_id: session.user.id,
              storyId: storyId,
              isRead: false,
            },
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: "Story liked successfully",
      });
    } else if (action === 'unlike') {
      // Delete like if it exists
      await prisma.like.deleteMany({
        where: {
          storyId: storyId,
          user_id: session.user.id,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Story unliked successfully",
      });
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid action. Use 'like' or 'unlike'." },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("[STORY_LIKE]", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
} 