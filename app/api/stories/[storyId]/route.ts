import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { auth as authLib } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteUploadedFile } from "@/lib/server-utils";

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

    // Delete the file first
    await deleteUploadedFile(story.fileUrl);

    // Then delete the database record
    await db.story.delete({
      where: {
        id: params.storyId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[STORY_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 