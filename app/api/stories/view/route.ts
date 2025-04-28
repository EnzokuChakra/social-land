import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";
import { authOptions } from "@/lib/auth";

interface StoryViewWithUser {
  id: string;
  user: {
    id: string;
    username: string;
    name: string | null;
    image: string | null;
  };
  createdAt: Date;
  liked: boolean;
}

interface ViewWithUser {
  id: string;
  createdAt: Date;
  storyId: string;
  user_id: string;
  user: {
    id: string;
    username: string;
    name: string | null;
    image: string | null;
  };
}

// GET handler for fetching story views
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!prisma) {
      return NextResponse.json({ success: false, error: "Database error" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const operation = searchParams.get('operation');

    // Handle own-status operation
    if (operation === 'own-status') {
      // Get all stories from the last 24 hours for the current user
      const stories = await prisma.story.findMany({
        where: {
          user_id: session.user.id,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
        include: {
          views: {
            where: {
              user_id: session.user.id
            }
          }
        }
      });

      // Check if any stories have no views from the current user
      const hasUnviewedStories = stories.some((story: { views: { length: number } }) => story.views.length === 0);

      return NextResponse.json({ 
        success: true, 
        hasUnviewedStories 
      });
    }

    // Handle user story view status
    if (userId) {
      // Get all stories from the last 24 hours for the specified user
      const stories = await prisma.story.findMany({
        where: {
          user_id: userId,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
        include: {
          views: {
            where: {
              user_id: session.user.id
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Get the most recent story's creation time
      const mostRecentStoryTime = stories.length > 0 ? new Date(stories[0].createdAt) : null;

      // Check if any stories have been viewed by the current user
      const viewed = stories.length > 0 && stories.every((story: { views: { length: number } }) => story.views.length > 0);

      let userSettings = null;
      // If all stories are viewed, update the user's last viewed timestamp
      if (viewed && mostRecentStoryTime) {
        try {
          userSettings = await prisma.user_setting.findUnique({
            where: {
              user_id: session.user.id
            }
          });

          if (userSettings) {
            // Only update if the last viewed timestamp is older than the most recent story
            // or if it doesn't exist
            if (!userSettings.lastViewedOwnStories || 
                new Date(userSettings.lastViewedOwnStories) < mostRecentStoryTime) {
              await prisma.user_setting.update({
                where: {
                  id: userSettings.id
                },
                data: {
                  lastViewedOwnStories: new Date()
                }
              });
            }
          } else {
            // Create new settings if they don't exist
            userSettings = await prisma.user_setting.create({
              data: {
                id: nanoid(),
                user_id: session.user.id,
                lastViewedOwnStories: new Date()
              }
            });
          }
        } catch (error) {
          console.error('[STORY_VIEW] Error updating last viewed timestamp:', error);
        }
      }

      return NextResponse.json({ 
        success: true, 
        viewed: viewed && (!mostRecentStoryTime || 
          (userSettings?.lastViewedOwnStories && 
           new Date(userSettings.lastViewedOwnStories) >= mostRecentStoryTime))
      });
    }

    return NextResponse.json({ success: false, error: "Invalid parameters" }, { status: 400 });
  } catch (error) {
    console.error('[STORY_VIEW] Error:', error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// POST handler for view operations
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!prisma) {
      return NextResponse.json({ success: false, error: "Database error" }, { status: 500 });
    }

    const body = await request.json();
    const { storyIds } = body;

    if (!Array.isArray(storyIds) || storyIds.length === 0) {
      return NextResponse.json({ success: false, error: "Invalid story IDs" }, { status: 400 });
    }

    // Process views sequentially to avoid race conditions
    for (const storyId of storyIds) {
      try {
        // Check if view already exists
        const existingView = await prisma.storyview.findFirst({
          where: {
            user_id: session.user.id,
            storyId: storyId
          }
        });

        if (!existingView) {
          // Only create a new view if it doesn't exist
          await prisma.storyview.create({
            data: {
              id: nanoid(),
              user_id: session.user.id,
              storyId: storyId
            }
          });
        }
      } catch (error) {
        // Log the error but continue with other stories
        console.error(`[STORY_VIEW] Error processing story ${storyId}:`, error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[STORY_VIEW] Error:', error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
} 