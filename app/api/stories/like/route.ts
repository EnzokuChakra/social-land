import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { storyId, action } = await req.json();

    if (!storyId) {
      return NextResponse.json(
        { success: false, error: "Story ID is required" },
        { status: 400 }
      );
    }

    if (!['like', 'unlike'].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Invalid action" },
        { status: 400 }
      );
    }

    // Use a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Check if story exists and is not expired (24 hours)
      const story = await tx.story.findFirst({
        where: {
          id: storyId,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              name: true,
              image: true
            }
          }
        }
      });

      if (!story) {
        throw new Error("Story not found or expired");
      }

      if (action === 'like') {
        // Check if like already exists using unique constraint
        const existingLike = await tx.like.findUnique({
          where: {
            storyId_user_id: {
              storyId,
              user_id: session.user.id
            }
          }
        });

        if (existingLike) {
          return {
            success: true,
            message: "Already liked",
            data: {
              ...existingLike,
              user: {
                id: session.user.id,
                username: session.user.username || '',
                name: session.user.name || null,
                image: session.user.image || null
              }
            }
          };
        }

        // Create new like
        const newLike = await tx.like.create({
          data: {
            id: crypto.randomUUID(),
            storyId,
            user_id: session.user.id,
            updatedAt: new Date()
          }
        });

        // Create notification for story owner if it's not their own story
        if (story.user.id !== session.user.id) {
          await tx.notification.create({
            data: {
              id: crypto.randomUUID(),
              type: 'STORY_LIKE',
              userId: story.user.id,
              sender_id: session.user.id,
              storyId: storyId,
              metadata: JSON.stringify({
                storyId: storyId,
                action: 'like'
              })
            }
          });
        }

        return {
          success: true,
          message: "Like created",
          data: {
            ...newLike,
            user: {
              id: session.user.id,
              username: session.user.username || '',
              name: session.user.name || null,
              image: session.user.image || null
            }
          }
        };
      } else {
        // Delete like using unique constraint
        const existingLike = await tx.like.findUnique({
          where: {
            storyId_user_id: {
              storyId,
              user_id: session.user.id
            }
          }
        });

        if (!existingLike) {
          return { success: true, message: "Like already removed" };
        }

        await tx.like.delete({
          where: {
            id: existingLike.id
          }
        });

        // Delete any related notifications
        if (story.user.id !== session.user.id) {
          await tx.notification.deleteMany({
            where: {
              type: 'STORY_LIKE',
              userId: story.user.id,
              sender_id: session.user.id,
              storyId: storyId
            }
          });
        }

        return { success: true, message: "Like removed" };
      }
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[STORY_LIKE_ERROR]", {
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

    if (error instanceof Error && error.message === "Story not found or expired") {
      return NextResponse.json(
        { success: false, error: "Story not found or expired" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to update like" },
      { status: 500 }
    );
  }
} 