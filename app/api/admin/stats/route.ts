import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserRole } from "@/lib/definitions";

// Get admin stats
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userRole = session.user.role as UserRole;
    if (!["MODERATOR", "ADMIN", "MASTER_ADMIN"].includes(userRole)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Get current date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Execute all queries in parallel
    const [
      userStats,
      totalPosts,
      pendingReels,
      totalReports,
      verificationRequests,
      newUsers,
      recentReports
    ] = await Promise.all([
      // User stats
      db.user.aggregate({
        _count: {
          id: true
        }
      }).then(result => ({
        total: result._count.id,
        today: result._count.id
      })),

      // Content stats
      db.post.count(),
      db.reel.count({ where: { status: "PENDING" } }),
      db.report.count({ where: { status: "PENDING" } }),
      db.verificationRequest.count({ where: { status: "PENDING" } }),

      // Recent activity
      db.user.findMany({
        where: {
          createdAt: {
            gte: today
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          username: true,
          image: true,
          name: true,
          createdAt: true
        }
      }),

      db.report.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              image: true,
              name: true
            }
          },
          post: {
            select: {
              id: true,
              fileUrl: true
            }
          }
        }
      })
    ]);

    return NextResponse.json({
      totalUsers: userStats.total,
      totalPosts,
      totalReports,
      pendingReels,
      verificationRequests,
      usersRegisteredToday: userStats.today,
      newUsers,
      recentReports
    });
  } catch (error) {
    console.error("[ADMIN_STATS]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 