"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRight, User, Flag, Ban, ArrowDownToLine } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

// Define the type for comment reports based on the fetched data
interface CommentReportWithDetails {
  id: string;
  createdAt: Date;
  reason: string | null;
  reporter: {
    id: string;
    username: string | null;
    image: string | null;
    name: string | null;
  };
  comment: {
    id: string;
    body: string;
    user: {
      id: string;
      username: string | null;
      image: string | null;
      name: string | null;
    }
  };
}

interface RecentActivityTabsProps {
  newUsers: Array<{
    id: string;
    username: string;
    image: string | null;
    name: string | null;
    createdAt: Date;
  }>;
  recentReports: Array<{
    id: string;
    createdAt: Date;
    reason: string | null;
    user: {
      id: string;
      username: string;
      image: string | null;
      name: string | null;
    } | null;
    post: {
      id: string;
      fileUrl: string;
    } | null;
  }>;
  userReports: Array<{
    id: string;
    createdAt: Date;
    reason: string | null;
    reporter: {
      id: string;
      username: string | null;
      image: string | null;
      name: string | null;
    };
    reported: {
      id: string;
      username: string | null;
      image: string | null;
      name: string | null;
    };
  }>;
  commentReports: CommentReportWithDetails[];
}

export function RecentActivityTabs({ newUsers, recentReports, userReports, commentReports }: RecentActivityTabsProps) {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const isAdmin = userRole === "ADMIN" || userRole === "MASTER_ADMIN";

  return (
    <Tabs defaultValue="new-users" className="w-full">
      <TabsList className={cn(
        "w-full h-auto p-2 bg-neutral-100 dark:bg-neutral-900",
        isAdmin ? "grid grid-cols-4" : "grid grid-cols-1",
        "gap-2 rounded-lg"
      )}>
        <TabsTrigger 
          value="new-users" 
          className={cn(
            "data-[state=active]:bg-white dark:data-[state=active]:bg-black",
            "data-[state=active]:text-primary",
            "data-[state=active]:shadow-sm",
            "rounded-md transition-all duration-200",
            "hover:bg-white/50 dark:hover:bg-neutral-800/50",
            "py-2"
          )}
        >
          New Users
        </TabsTrigger>
        {isAdmin && (
          <>
            <TabsTrigger 
              value="reports" 
              className={cn(
                "data-[state=active]:bg-white dark:data-[state=active]:bg-black",
                "data-[state=active]:text-primary",
                "data-[state=active]:shadow-sm",
                "rounded-md transition-all duration-200",
                "hover:bg-white/50 dark:hover:bg-neutral-800/50",
                "py-2"
              )}
            >
              Post Reports
            </TabsTrigger>
            <TabsTrigger 
              value="user-reports" 
              className={cn(
                "data-[state=active]:bg-white dark:data-[state=active]:bg-black",
                "data-[state=active]:text-primary",
                "data-[state=active]:shadow-sm",
                "rounded-md transition-all duration-200",
                "hover:bg-white/50 dark:hover:bg-neutral-800/50",
                "py-2"
              )}
            >
              User Reports
            </TabsTrigger>
            <TabsTrigger 
              value="comment-reports" 
              className={cn(
                "data-[state=active]:bg-white dark:data-[state=active]:bg-black",
                "data-[state=active]:text-primary",
                "data-[state=active]:shadow-sm",
                "rounded-md transition-all duration-200",
                "hover:bg-white/50 dark:hover:bg-neutral-800/50",
                "py-2"
              )}
            >
              Comment Reports
            </TabsTrigger>
          </>
        )}
      </TabsList>
      <TabsContent value="new-users">
        <Card>
          <CardHeader>
            <CardTitle>New Users</CardTitle>
            <CardDescription>Recently registered users on the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {newUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarImage src={user.image || undefined} />
                        <AvatarFallback>
                          {user.name?.[0] || user.username[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium leading-none">{user.username}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <Link href={`/dashboard/${user.username}`}>
                      <Button variant="ghost" size="sm">
                        View Profile
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </TabsContent>
      {isAdmin && (
        <>
          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>Recent Post Reports</CardTitle>
                <CardDescription>Recently reported posts that need review</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-4">
                    {recentReports.map((report) => (
                      <div key={report.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <Avatar>
                            <AvatarImage src={report.user?.image || undefined} />
                            <AvatarFallback>
                              {report.user?.name?.[0] || report.user?.username?.[0] || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium leading-none">
                              {report.user?.username || "Unknown User"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {report.reason || "No reason provided"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        <Link href={`/dashboard/admin/reports/${report.id}`}>
                          <Button variant="ghost" size="sm">
                            Review
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="user-reports">
            <Card>
              <CardHeader>
                <CardTitle>User Reports</CardTitle>
                <CardDescription>Recently reported users that need review</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-4">
                    {userReports.map((report) => (
                      <div key={report.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex -space-x-2">
                            <Avatar className="border-2 border-background">
                              <AvatarImage src={report.reporter?.image || undefined} />
                              <AvatarFallback>
                                {report.reporter?.name?.[0] || report.reporter?.username?.[0] || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <Avatar className="border-2 border-background">
                              <AvatarImage src={report.reported?.image || undefined} />
                              <AvatarFallback>
                                {report.reported?.name?.[0] || report.reported?.username?.[0] || "?"}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                          <div>
                            <p className="text-sm font-medium leading-none">
                              {report.reporter?.username || "Unknown"} reported {report.reported?.username || "Unknown"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {report.reason || "No reason provided"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        <Link href={`/dashboard/${report.reported.username}`}>
                          <Button variant="ghost" size="sm">
                            Review
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="comment-reports">
            <Card>
              <CardHeader>
                <CardTitle>Recent Comment Reports</CardTitle>
                <CardDescription>Recently reported comments that need review</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-4">
                    {commentReports.map((report) => (
                      <div key={report.id} className="flex items-start justify-between gap-4">
                        <div className="flex items-start space-x-4">
                          <Avatar>
                            <AvatarImage src={report.reporter?.image || undefined} />
                            <AvatarFallback>
                              {report.reporter?.name?.[0] || report.reporter?.username?.[0] || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm font-medium leading-none">
                              <Link href={`/dashboard/${report.reporter.username}`} className="hover:underline">
                                {report.reporter.username || "Unknown User"}
                              </Link> reported:
                            </p>
                            <blockquote className="mt-1 border-l-2 pl-3 italic text-sm text-muted-foreground">{report.comment.body}</blockquote>
                            <p className="text-sm text-muted-foreground mt-1"><span className="font-medium">Reason:</span> {report.reason || "No reason provided"}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </>
      )}
    </Tabs>
  );
} 