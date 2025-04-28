import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { auth as authLib } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteUploadedFile } from "@/lib/server-utils";
import { deleteStory } from "@/lib/actions";

export async function GET(
  request: Request,
  { params }: { params: { storyId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!prisma) {
      return new NextResponse("Database error", { status: 500 });
    }

    const story = await prisma.story.findUnique({
      where: {
        id: params.storyId,
      },
    });

    if (!story) {
      return new NextResponse("Story not found", { status: 404 });
    }

    // Check if the story belongs to the user
    if (story.user_id !== session.user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    return NextResponse.json(story);
  } catch (error) {
    console.error("[STORY_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { storyId: string } }
) {
  try {
    const session = await authLib();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!prisma) {
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    // Properly handle the dynamic route parameter
    const { storyId } = await params;
    if (!storyId) {
      return NextResponse.json({ error: "Story ID is required" }, { status: 400 });
    }

    // First verify the story exists and belongs to the user
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      include: {
        user: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    if (story.user_id !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      // Delete all related records first
      await prisma.$transaction([
        // Delete story views
        prisma.storyview.deleteMany({
          where: { storyId }
        }),
        
        // Delete story likes
        prisma.like.deleteMany({
          where: { storyId }
        }),
        
        // Delete notifications
        prisma.notification.deleteMany({
          where: { storyId }
        }),
        
        // Delete story reports
        prisma.storyreport.deleteMany({
          where: { storyId }
        }),
        
        // Delete the story itself
        prisma.story.delete({
          where: { id: storyId }
        })
      ]);
      
      // Try to delete the file from storage
      if (story.fileUrl) {
        try {
          await deleteUploadedFile(story.fileUrl);
        } catch (fileError) {
          console.error("[STORY_DELETE] Error deleting file:", fileError);
          // Continue even if file deletion fails
        }
      }
      
      return NextResponse.json({ success: true, message: "Story deleted successfully" }, { status: 200 });
    } catch (dbError) {
      console.error("[STORY_DELETE] Database error:", {
        error: dbError instanceof Error ? {
          message: dbError.message,
          stack: dbError.stack,
          name: dbError.name
        } : String(dbError),
        storyId,
        timestamp: new Date().toISOString()
      });
      
      return NextResponse.json({ 
        error: "Database error", 
        message: dbError instanceof Error ? dbError.message : "Unknown database error" 
      }, { status: 500 });
    }
  } catch (error) {
    console.error("[STORY_DELETE]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
} 