import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileImage, BadgeCheck, Flag } from "lucide-react";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@/lib/definitions";
import { unstable_cache } from 'next/cache';

// Cache the stats fetching for 30 seconds
const getStats = unstable_cache(
  async (userId: string, userRole: UserRole) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Execute all queries in parallel with optimized selections
    const [
      userStats,
      totalPosts,
      pendingReels,
      totalReports,
      verificationRequests
    ] = await Promise.all([
      // Optimize user stats query
      db.user.aggregate({
        _count: {
          id: true
        },
        where: {
          createdAt: {
            gte: today
          }
        }
      }).then(result => ({
        total: result._count.id,
        today: result._count.id
      })),

      // Optimize post count query
      db.post.count(),

      // Optimize reel count query
      db.reel.count({ 
        where: { status: "PENDING" }
      }),

      // Optimize report count query
      db.report.count({ 
        where: { status: "PENDING" }
      }),

      // Optimize verification request count query
      db.verificationRequest.count({ 
        where: { status: "PENDING" }
      })
    ]);

    return {
      totalUsers: userStats.total,
      totalPosts,
      totalReports,
      pendingReels,
      verificationRequests,
      usersRegisteredToday: userStats.today
    };
  },
  ['admin-stats'],
  { revalidate: 30 } // Cache for 30 seconds
);

export async function AdminStats() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const userRole = session.user.role as UserRole;
  if (!["MODERATOR", "ADMIN", "MASTER_ADMIN"].includes(userRole)) {
    throw new Error("Forbidden");
  }

  const stats = await getStats(session.user.id, userRole);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30 border-blue-200 dark:border-blue-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            {stats.usersRegisteredToday} new today
          </p>
        </CardContent>
      </Card>
      
      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/30 border-purple-200 dark:border-purple-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Content</CardTitle>
          <FileImage className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalPosts.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            {stats.pendingReels} pending reels
          </p>
        </CardContent>
      </Card>
      
      <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/50 dark:to-amber-900/30 border-amber-200 dark:border-amber-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Verification</CardTitle>
          <BadgeCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.verificationRequests}</div>
          <p className="text-xs text-muted-foreground">
            Pending requests
          </p>
        </CardContent>
      </Card>
      
      <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/30 border-red-200 dark:border-red-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Reports</CardTitle>
          <Flag className="h-4 w-4 text-red-600 dark:text-red-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalReports.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            Content reports to review
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 