import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { auth as authLib } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteUploadedFile } from "@/lib/server-utils";
import fs from "fs";
import path from "path";

export async function GET(
  request: Request,
  { params }: { params: { storyId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
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
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // First check if the story exists and belongs to the user
    const story = await db.story.findUnique({
      where: {
        id: params.storyId,
      },
      select: {
        user_id: true,
        fileUrl: true,
      },
    });

    if (!story) {
      return new NextResponse("Story not found", { status: 404 });
    }

    if (story.user_id !== session.user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Delete the file from the filesystem
    if (story.fileUrl) {
      const filePath = path.join(process.cwd(), "public", story.fileUrl.replace(/^\//, ""));
      try {
        fs.unlinkSync(filePath);
        console.log("Successfully deleted file:", filePath);
      } catch (error) {
        console.error("Error deleting file:", error);
        // Continue with database deletion even if file deletion fails
      }
    }

    // Delete associated records in the correct order
    await db.$transaction(async (tx) => {
      // Delete story views
      await tx.storyview.deleteMany({
        where: {
          storyId: params.storyId,
        },
      });

      // Delete story likes
      await tx.like.deleteMany({
        where: {
          storyId: params.storyId,
        },
      });

      // Delete story notifications
      await tx.notification.deleteMany({
        where: {
          storyId: params.storyId,
        },
      });

      // Finally, delete the story
      await tx.story.delete({
        where: {
          id: params.storyId,
        },
      });
    });

    return new NextResponse("Story deleted successfully", { status: 200 });
  } catch (error) {
    console.error("[STORY_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 