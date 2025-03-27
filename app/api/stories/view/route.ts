import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getErrorMessage } from "@/lib/utils";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { storyId } = await req.json();
    if (!storyId) {
      return NextResponse.json(
        { success: false, error: "Story ID is required" },
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
          user: true
        }
      });

      if (!story) {
        throw new Error("Story not found or expired");
      }

      // Try to find existing view
      const existingView = await tx.storyview.findUnique({
        where: {
          storyId_user_id: {
            storyId: storyId,
            user_id: session.user.id
          }
        }
      });

      if (existingView) {
        // Update existing view's timestamp
        const updatedView = await tx.storyview.update({
          where: {
            id: existingView.id
          },
          data: {
            createdAt: new Date()
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

        return {
          success: true,
          message: "View updated",
          data: updatedView
        };
      }

      // Create new view
      const newView = await tx.storyview.create({
        data: {
          id: crypto.randomUUID(),
          storyId: storyId,
          user_id: session.user.id
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

      return {
        success: true,
        message: "View created",
        data: newView
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[STORY_VIEW_ERROR]", {
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
      { success: false, error: "Failed to record story view" },
      { status: 500 }
    );
  }
} 