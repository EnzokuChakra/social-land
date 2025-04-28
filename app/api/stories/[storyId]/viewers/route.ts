import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { ApiResponse } from "@/lib/definitions";

export async function GET(
  req: Request,
  { params }: { params: { storyId: string } }
): Promise<NextResponse<ApiResponse<{ viewers: any[]; count: number }>>> {
  try {
    const session = await auth();
    const storyId = params?.storyId;

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!storyId) {
      return NextResponse.json(
        { success: false, error: "Story ID is required" },
        { status: 400 }
      );
    }

    if (!prisma) {
      return NextResponse.json(
        { success: false, error: "Database connection error" },
        { status: 500 }
      );
    }

    const viewers = await prisma.storyview.findMany({
      where: {
        storyId: storyId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        viewers,
        count: viewers.length,
      },
    });
  } catch (error) {
    console.error("[STORY_VIEWERS]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch story viewers" },
      { status: 500 }
    );
  }
} 