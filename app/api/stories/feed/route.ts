import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { story as PrismaStory } from "@prisma/client";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Story = PrismaStory & {
  user: {
    id: string;
    username: string | null;
    image: string | null;
    verified: boolean;
  };
  views: Array<{
    user: {
      id: string;
      username: string | null;
      image: string | null;
    };
  }>;
  likes: Array<{
    user: {
      id: string;
      username: string | null;
      image: string | null;
    };
  }>;
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Get user's stories with fresh user data
    const userStories = await prisma?.story.findMany({
      where: {
        user_id: userId,
        createdAt: {
          gte: twentyFourHoursAgo,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            image: true,
            verified: true,
          },
        },
        views: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                image: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc'
          }
        },
        likes: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                image: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc'
          }
        },
      },
      orderBy: {
        createdAt: 'asc', // Show oldest stories first
      },
    }) || [];

    // Filter out stories with null users
    const validUserStories = userStories.filter(story => story.user !== null);

    // Get following users' stories
    const following = await prisma?.follows.findMany({
      where: {
        followerId: userId,
        status: "ACCEPTED",
      },
      select: {
        followingId: true,
      },
    }) || [];

    const followingIds = following.map((f: { followingId: string }) => f.followingId);

    const otherStories = await prisma?.story.findMany({
      where: {
        user_id: {
          in: followingIds,
        },
        createdAt: {
          gte: twentyFourHoursAgo,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            image: true,
            verified: true,
          },
        },
        views: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                image: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc'
          }
        },
        likes: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                image: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc'
          }
        },
      },
      orderBy: {
        createdAt: 'asc', // Show oldest stories first
      },
    }) || [];

    // Filter out stories with null users
    const validOtherStories = otherStories.filter(story => story.user !== null);

    // Group stories by user
    const groupedOtherStories = validOtherStories.reduce((acc: { [key: string]: Story[] }, story: Story) => {
      if (!acc[story.user.id]) {
        acc[story.user.id] = [];
      }
      acc[story.user.id].push(story);
      return acc;
    }, {});

    // Convert to array and sort by most recent story and view status
    const sortedOtherStories = Object.values(groupedOtherStories)
      .map(stories => stories.sort((a, b) => {
        // First sort by view status (unviewed first)
        const aHasView = a.views.some(view => view.user.id === userId);
        const bHasView = b.views.some(view => view.user.id === userId);
        if (aHasView !== bHasView) {
          return aHasView ? 1 : -1;
        }
        // Then sort by creation time (newest first)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }));

    // Get fresh user data for the current user
    const currentUser = await prisma?.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        image: true,
        verified: true,
      },
    });

    return NextResponse.json({
      success: true,
      userStories: validUserStories.length > 0 ? validUserStories : [],
      otherStories: sortedOtherStories.flat(),
      currentUser,
    });
  } catch (error) {
    console.error("Error in /api/stories/feed:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// Add type for the filter function
const uniqueByUserId = (stories: Story[]) => {
  return stories.filter((f: Story, index: number, self: Story[]) =>
    index === self.findIndex((t) => t.user_id === f.user_id)
  );
}; 