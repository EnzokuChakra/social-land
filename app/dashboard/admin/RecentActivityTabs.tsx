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
}

export function RecentActivityTabs({ newUsers, recentReports, userReports }: RecentActivityTabsProps) {
  return (
    <Tabs defaultValue="user-reports" className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-4">
        <TabsTrigger value="new-users" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
          New Users
        </TabsTrigger>
        <TabsTrigger value="reports" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
          Post Reports
        </TabsTrigger>
        <TabsTrigger value="user-reports" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
          User Reports
        </TabsTrigger>
      </TabsList>
      <TabsContent value="new-users">
        <Card>
          <CardHeader>
            <CardTitle>Recent User Registrations</CardTitle>
            <CardDescription>
              {newUsers.length} users registered in the last 24 hours
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {newUsers.length > 0 ? (
                <div className="space-y-4">
                  {newUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between">
                      <Link 
                        href={`/dashboard/${user.username}`}
                        className="flex items-center gap-3 hover:bg-accent rounded-md p-2 transition-colors flex-1"
                      >
                        <Avatar>
                          <AvatarImage src={user.image || ''} alt={user.username} />
                          <AvatarFallback>{user.username?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{user.name || user.username}</p>
                          <p className="text-xs text-muted-foreground">@{user.username}</p>
                        </div>
                      </Link>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                        </Badge>
                        <Link href={`/dashboard/${user.username}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-[200px]">
                  <p className="text-muted-foreground">No new users in the last 24 hours</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/dashboard/admin/users">View All Users</Link>
            </Button>
          </CardFooter>
        </Card>
      </TabsContent>
      <TabsContent value="reports">
        <Card>
          <CardHeader>
            <CardTitle>Recent Reports</CardTitle>
            <CardDescription>
              {recentReports.length} pending reports to review
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {recentReports.length > 0 ? (
                <div className="space-y-4">
                  {recentReports.map((report) => (
                    <div key={report.id} className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0 relative">
                        {report.post?.fileUrl && (
                          <Image 
                            src={report.post.fileUrl} 
                            alt="Reported content" 
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Link 
                            href={`/dashboard/${report.user?.username}`} 
                            className="text-sm font-medium hover:underline"
                          >
                            Reported by @{report.user?.username || 'Unknown'}
                          </Link>
                          <Badge variant="destructive" className="text-xs">
                            {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {report.reason || "No reason provided"}
                        </p>
                      </div>
                      <Link href={`/dashboard/admin/reports/${report.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-[200px]">
                  <p className="text-muted-foreground">No pending reports</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/dashboard/admin/reports">View All Reports</Link>
            </Button>
          </CardFooter>
        </Card>
      </TabsContent>
      <TabsContent value="user-reports">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold">User Reports</CardTitle>
                <CardDescription className="mt-2">
                  {userReports.length} user {userReports.length === 1 ? 'report' : 'reports'} to review
                </CardDescription>
              </div>
              <Badge variant="secondary" className="px-4 py-1">
                <Flag className="w-4 h-4 mr-2" />
                Active Reports
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              {userReports.length > 0 ? (
                <div className="space-y-4">
                  {userReports.map((report) => (
                    <div key={report.id} className="group relative bg-card hover:bg-accent rounded-lg p-4 transition-all">
                      <div className="flex items-start gap-6">
                        <div className="flex flex-col items-center space-y-1">
                          <Avatar className="h-12 w-12 border-2 border-background">
                            <AvatarImage src={report.reporter.image || undefined} />
                            <AvatarFallback className="bg-primary/10">
                              {report.reporter.username?.[0]?.toUpperCase() || <User className="h-6 w-6" />}
                            </AvatarFallback>
                          </Avatar>
                          <ArrowDownToLine className="h-4 w-4 text-muted-foreground" />
                          <Avatar className="h-12 w-12 border-2 border-destructive">
                            <AvatarImage src={report.reported.image || undefined} />
                            <AvatarFallback className="bg-destructive/10">
                              {report.reported.username?.[0]?.toUpperCase() || <User className="h-6 w-6" />}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              href={`/dashboard/${report.reporter.username}`}
                              className="font-semibold hover:underline"
                            >
                              @{report.reporter.username}
                            </Link>
                            <Badge variant="outline" className="text-xs">Reporter</Badge>
                            <span className="text-sm text-muted-foreground">reported</span>
                            <Link
                              href={`/dashboard/${report.reported.username}`}
                              className="font-semibold text-destructive hover:underline"
                            >
                              @{report.reported.username}
                            </Link>
                            <Badge variant="destructive" className="text-xs">
                              {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
                            </Badge>
                          </div>
                          {report.reason && (
                            <div className="bg-muted/50 rounded-md p-3">
                              <p className="text-sm text-muted-foreground leading-relaxed">{report.reason}</p>
                            </div>
                          )}
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[300px] text-center">
                  <Flag className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground font-medium">No user reports to review</p>
                  <p className="text-sm text-muted-foreground/70">When users report others, they'll appear here</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full" variant="outline">
              <Link href="/dashboard/admin/reports" className="flex items-center gap-2">
                <Flag className="h-4 w-4" />
                View All Reports
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </TabsContent>
    </Tabs>
  );
} 