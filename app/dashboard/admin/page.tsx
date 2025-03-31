import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { RecentActivityTabs } from "./RecentActivityTabs";
import { AdminStats } from "./AdminStats";
import { unstable_noStore as noStore } from "next/cache";

// Force dynamic rendering for real-time data
export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  noStore();
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const userRole = session.user.role as string;
  if (!["MODERATOR", "ADMIN", "MASTER_ADMIN"].includes(userRole)) {
    redirect("/dashboard");
  }

  const [newUsers, recentReports, userReports] = await Promise.all([
    db.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        image: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    }),
    db.report.findMany({
      select: {
        id: true,
        createdAt: true,
        reason: true,
        user: {
          select: {
            id: true,
            username: true,
            image: true,
            name: true,
          },
        },
        post: {
          select: {
            id: true,
            fileUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    }),
    db.userReport.findMany({
      select: {
        id: true,
        createdAt: true,
        reason: true,
        reporter: {
          select: {
            id: true,
            username: true,
            image: true,
            name: true,
          },
        },
        reported: {
          select: {
            id: true,
            username: true,
            image: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    }),
  ]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      <AdminStats />
      <RecentActivityTabs 
        newUsers={newUsers}
        recentReports={recentReports}
        userReports={userReports}
      />
    </div>
  );
} 