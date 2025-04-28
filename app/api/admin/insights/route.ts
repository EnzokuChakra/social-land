import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || !["MODERATOR", "ADMIN", "MASTER_ADMIN"].includes(session.user.role)) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!prisma) {
      throw new Error("Database connection not available");
    }

    // Get current date and start of day
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    // Get counts for today
    const [
      newUsersToday,
      totalPosts,
      totalComments,
      activeUsers
    ] = await Promise.all([
      // New users today
      prisma.user.count({
        where: {
          createdAt: {
            gte: startOfDay
          }
        }
      }),
      // Total posts
      prisma.post.count(),
      // Total comments
      prisma.comment.count(),
      // Active users (users who have created posts or comments in the last 24 hours)
      prisma.user.count({
        where: {
          OR: [
            { posts: { some: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } } },
            { comments: { some: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } } }
          ]
        }
      })
    ]);

    // Get system metrics (these would be fetched from your monitoring system)
    // For now, we'll return simulated data
    const systemMetrics = {
      cpuUsage: Math.floor(Math.random() * 30) + 20, // Simulated CPU usage between 20-50%
      memoryUsage: Math.floor(Math.random() * 30) + 40, // Simulated memory usage between 40-70%
      diskUsage: Math.floor(Math.random() * 20) + 60, // Simulated disk usage between 60-80%
      networkUsage: Math.floor(Math.random() * 20) + 10, // Simulated network usage between 10-30%
      activeConnections: Math.floor(Math.random() * 500) + 1000, // Simulated active connections between 1000-1500
      responseTime: Math.floor(Math.random() * 50) + 50, // Simulated response time between 50-100ms
      uptime: "7d 12h 30m" // This would be calculated from your server start time
    };

    const userActivity = {
      activeUsers,
      newUsers: newUsersToday,
      totalPosts,
      totalComments,
      moderationActions: 0 // Default to 0 since moderationAction model might not exist
    };

    return NextResponse.json({
      metrics: systemMetrics,
      activity: userActivity
    });
  } catch (error) {
    console.error("[ADMIN_INSIGHTS] Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 