import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

export async function POST(req: Request) {
  try {
    const session = await auth();
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

    // Check if story exists and is not expired (24 hours)
    const story = await prisma.story.findFirst({
      where: {
        id: storyId,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    });

    if (!story) {
      return NextResponse.json(
        { success: false, error: "Story not found or expired" },
        { status: 404 }
      );
    }

    // Use a transaction to handle race conditions
    const result = await prisma.$transaction(async (tx) => {
      // Try to find existing view
      const existingView = await tx.storyview.findFirst({
        where: {
          storyId: storyId,
          user_id: session.user.id
        }
      });

      if (existingView) {
        // Update existing view's timestamp
        return await tx.storyview.update({
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
      } else {
        // Create new view
        return await tx.storyview.create({
          data: {
            id: nanoid(),
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
      }
    });

    return NextResponse.json({
      success: true,
      message: "View recorded successfully",
      data: result
    });
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

    return NextResponse.json(
      { success: false, error: "Failed to record story view" },
      { status: 500 }
    );
  }
} 