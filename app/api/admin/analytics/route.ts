import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { subDays } from "date-fns";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    if (session.user.role !== "ADMIN" && session.user.role !== "MASTER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!db) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }

    // Get total users
    const totalUsers = await db!.user.count();

    // Get active users (users who have been active in the last 24 hours)
    const activeUsers = await db!.user.count({
      where: {
        updatedAt: {
          gte: subDays(new Date(), 1)
        }
      }
    });

    // Get total page views from stories and reels
    const [storyViews, reelViews] = await Promise.all([
      db!.storyview.count(),
      db!.reelview.count()
    ]);

    const totalPageViews = storyViews + reelViews;

    // Get average session duration (placeholder - you'll need to implement this based on your tracking)
    const averageSessionDuration = 5; // minutes

    // Get daily stats for the last 7 days
    const dailyStats = await Promise.all(
      Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), i);
        const startOfDay = new Date(date.setHours(0, 0, 0, 0));
        const endOfDay = new Date(date.setHours(23, 59, 59, 999));

        return Promise.all([
          db!.user.count({
            where: {
              updatedAt: {
                gte: startOfDay,
                lte: endOfDay
              }
            }
          }),
          Promise.all([
            db!.storyview.count({
              where: {
                createdAt: {
                  gte: startOfDay,
                  lte: endOfDay
                }
              }
            }),
            db!.reelview.count({
              where: {
                createdAt: {
                  gte: startOfDay,
                  lte: endOfDay
                }
              }
            })
          ])
        ]).then(([users, [storyViews, reelViews]]) => ({
          date: startOfDay.toISOString().split('T')[0],
          users,
          pageViews: storyViews + reelViews
        }));
      })
    );

    return NextResponse.json({
      totalUsers,
      activeUsers,
      pageViews: totalPageViews,
      averageSessionDuration,
      dailyStats: dailyStats.reverse()
    });
  } catch (error) {
    console.error("[ANALYTICS_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
} 