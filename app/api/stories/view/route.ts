import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { nanoid } from "nanoid";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { storyIds } = await req.json();
    if (!storyIds || !Array.isArray(storyIds)) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // Create views for each story if they don't exist
    await Promise.all(
      storyIds.map(async (storyId: string) => {
        // Check if view already exists
        const existingView = await prisma.storyview.findFirst({
          where: {
            storyId: storyId,
            user_id: session.user.id
          },
        });

        // Only create view if it doesn't exist
        if (!existingView) {
          await prisma.storyview.create({
            data: {
              id: nanoid(),
              storyId: storyId,
              user_id: session.user.id,
            },
          });
        }
      })
    );

    return NextResponse.json({ 
      success: true,
      message: "Stories marked as viewed successfully" 
    });
  } catch (error) {
    console.error("[STORY_VIEW]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
} 