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

    if (!db) {
      throw new Error("Database connection not available");
    }

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
      db.verificationrequest.count({ 
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
      <Card className="relative overflow-hidden bg-gradient-to-br from-indigo-500 to-blue-600 dark:from-indigo-600 dark:to-blue-800 border-none text-white">
        <div className="absolute inset-0 bg-white/5 transform rotate-12 translate-x-1/2 translate-y-1/2 rounded-full blur-3xl"></div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          <Users className="h-4 w-4 opacity-75" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
          <p className="text-xs text-white/75 mt-1">
            {stats.usersRegisteredToday} new today
          </p>
        </CardContent>
      </Card>
      
      <Card className="relative overflow-hidden bg-gradient-to-br from-fuchsia-500 to-purple-600 dark:from-fuchsia-600 dark:to-purple-800 border-none text-white">
        <div className="absolute inset-0 bg-white/5 transform -rotate-12 translate-x-1/3 translate-y-1/2 rounded-full blur-3xl"></div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Content</CardTitle>
          <FileImage className="h-4 w-4 opacity-75" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalPosts.toLocaleString()}</div>
          <p className="text-xs text-white/75 mt-1">
            {stats.pendingReels} pending reels
          </p>
        </CardContent>
      </Card>
      
      <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-800 border-none text-white">
        <div className="absolute inset-0 bg-white/5 transform rotate-45 translate-x-1/4 -translate-y-1/4 rounded-full blur-3xl"></div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Verification</CardTitle>
          <BadgeCheck className="h-4 w-4 opacity-75" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.verificationRequests}</div>
          <p className="text-xs text-white/75 mt-1">
            Pending requests
          </p>
        </CardContent>
      </Card>
      
      <Card className="relative overflow-hidden bg-gradient-to-br from-rose-500 to-red-600 dark:from-rose-600 dark:to-red-800 border-none text-white">
        <div className="absolute inset-0 bg-white/5 transform -rotate-45 -translate-x-1/4 translate-y-1/4 rounded-full blur-3xl"></div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Reports</CardTitle>
          <Flag className="h-4 w-4 opacity-75" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalReports.toLocaleString()}</div>
          <p className="text-xs text-white/75 mt-1">
            Content reports to review
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 