import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { PostTag, User } from "@/lib/definitions";
import { nanoid } from "nanoid";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { fileUrl, caption, location, aspectRatio, taggedUsers } = body;

    if (!fileUrl) {
      return NextResponse.json({ error: "No file URL provided" }, { status: 400 });
    }

    if (!db) {
      throw new Error("Database connection not available");
    }

    const post = await db.post.create({
      data: {
        id: nanoid(),
        caption,
        location,
        fileUrl,
        aspectRatio,
        user_id: session.user.id,
        updatedAt: new Date(),
        tags: {
          create: taggedUsers?.map((tag: any) => ({
            id: nanoid(),
            userId: tag.userId,
            x: tag.x || 0,
            y: tag.y || 0,
          })),
        },
      },
      include: {
        user: true,
        tags: {
          include: {
            user: true,
          },
        },
        likes: true,
        comments: true,
        savedBy: true,
      },
    });

    return NextResponse.json(post);
  } catch (error) {
    console.error("[POST_CREATE]", error);
    return NextResponse.json(
      { error: "Error creating post" },
      { status: 500 }
    );
  }
} 