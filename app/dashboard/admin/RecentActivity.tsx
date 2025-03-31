import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@/lib/definitions";
import { RecentActivityTabs } from "./RecentActivityTabs";
import Image from "next/image";
import { unstable_noStore as noStore } from "next/cache";

interface User {
  id: string;
  username: string | null;
  name: string | null;
  image: string | null;
  createdAt: Date;
}

interface Report {
  id: string;
  createdAt: Date;
  reason: string | null;
  user: {
    id: string;
    username: string | null;
    name: string | null;
    image: string | null;
  } | null;
  post: {
    id: string;
    fileUrl: string;
  } | null;
}

interface UserReport {
  id: string;
  createdAt: Date;
  reason: string;
  reporter: {
    id: string;
    username: string | null;
    name: string | null;
    image: string | null;
  };
  reported: {
    id: string;
    username: string | null;
    name: string | null;
    image: string | null;
  };
}

export async function RecentActivity() {
  noStore();

  const [newUsers, recentReports] = await Promise.all([
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
            name: true,
            image: true,
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
  ]);

  // Filter out users with null usernames and transform the data
  const validNewUsers = newUsers
    .filter((user: User) => user.username !== null)
    .map((user: User) => ({
      ...user,
      username: user.username as string // We know it's not null after filtering
    }));

  // Transform reports data to handle nullable fields
  const validReports = recentReports.map((report: Report) => ({
    ...report,
    user: report.user ? {
      ...report.user,
      username: report.user.username as string // We know it's not null from the database
    } : null,
    post: report.post || null
  }));

  // Since userReport model doesn't exist yet, we'll pass an empty array
  const validUserReports: UserReport[] = [];

  return (
    <div className="bg-white dark:bg-black rounded-lg shadow">
      <div className="p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <RecentActivityTabs 
          newUsers={validNewUsers}
          recentReports={validReports}
          userReports={validUserReports}
        />
      </div>
    </div>
  );
} 