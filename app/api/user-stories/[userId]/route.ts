import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { ApiResponse, StoryWithExtras, UserRole, UserStatus } from "@/lib/definitions";
import type { Prisma } from "@prisma/client";

export async function GET(
  req: Request,
  { params }: { params: { userId: string } }
): Promise<NextResponse<ApiResponse<StoryWithExtras[]>>> {
  try {
    const session = await auth();
    const { userId } = await params;

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    if (!prisma) {
      return NextResponse.json(
        { success: false, error: "Database connection error" },
        { status: 500 }
      );
    }

    const stories = await prisma.story.findMany({
      where: {
        user_id: userId,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            emailVerified: true,
            image: true,
            username: true,
            bio: true,
            verified: true,
            isPrivate: true,
            role: true,
            status: true,
            password: true,
            createdAt: true,
            updatedAt: true,
            lastUsernameChange: true,
          },
        },
        views: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                emailVerified: true,
                image: true,
                username: true,
                bio: true,
                verified: true,
                isPrivate: true,
                role: true,
                status: true,
                password: true,
                createdAt: true,
                updatedAt: true,
                lastUsernameChange: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        likes: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                emailVerified: true,
                image: true,
                username: true,
                bio: true,
                verified: true,
                isPrivate: true,
                role: true,
                status: true,
                password: true,
                createdAt: true,
                updatedAt: true,
                lastUsernameChange: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc'
      },
    });

    // Cast the role and status to their correct types
    const typedStories = stories.map(story => ({
      ...story,
      user: {
        ...story.user,
        role: story.user.role as UserRole,
        status: story.user.status as UserStatus
      },
      views: story.views.map(view => ({
        ...view,
        user: {
          ...view.user,
          role: view.user.role as UserRole,
          status: view.user.status as UserStatus
        }
      })),
      likes: story.likes.map(like => ({
        ...like,
        user: {
          ...like.user,
          role: like.user.role as UserRole,
          status: like.user.status as UserStatus
        }
      }))
    }));

    return NextResponse.json({ success: true, data: typedStories });
  } catch (error) {
    console.error("[USER_STORIES]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch stories" },
      { status: 500 }
    );
  }
} 