"use client";

import { useEffect, useState } from "react";
import { Report } from "@/lib/definitions";
import UserAvatar from "./UserAvatar";
import Link from "next/link";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { formatTimeToNow } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { cn } from "@/lib/utils";
import { MoreVertical, Trash2, Eye, CheckCircle2, XCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ArrowRight } from "lucide-react";

interface ReportUser {
  id: string;
  username: string | null;
  image: string | null;
  name: string | null;
}

interface ReportWithUser extends Omit<Report, 'user'> {
  user: ReportUser;
}

interface UserReport {
  id: string;
  createdAt: string;
  reason: string | null;
  status: string;
  reporter: ReportUser;
  reported: ReportUser;
}

interface StoryReport {
  id: string;
  createdAt: string;
  reason: string | null;
  status: string;
  reporter: ReportUser;
  story: {
    id: string;
    user: ReportUser;
  };
}

interface CommentReport {
  id: string;
  createdAt: string;
  reason: string | null;
  status: string;
  reporter: ReportUser;
  comment: {
    id: string;
    body: string;
    user: ReportUser;
  };
}

const ITEMS_PER_PAGE = 10;

export function ReportsList() {
  const [reports, setReports] = useState<ReportWithUser[]>([]);
  const [userReports, setUserReports] = useState<UserReport[]>([]);
  const [storyReports, setStoryReports] = useState<StoryReport[]>([]);
  const [commentReports, setCommentReports] = useState<CommentReport[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination states for each tab
  const [currentPage, setCurrentPage] = useState({
    posts: 1,
    users: 1,
    stories: 1,
    comments: 1
  });

  useEffect(() => {
    fetchReports();
  }, []);

  async function fetchReports() {
    try {
      const [postsResponse, usersResponse, storiesResponse, commentsResponse] = await Promise.all([
        fetch("/api/admin/reports"),
        fetch("/api/admin/user-reports"),
        fetch("/api/admin/story-reports"),
        fetch("/api/admin/comment-reports")
      ]);

      if (!postsResponse.ok || !usersResponse.ok || !storiesResponse.ok || !commentsResponse.ok) {
        throw new Error("Failed to fetch reports");
      }

      const postsData = await postsResponse.json();
      const usersData = await usersResponse.json();
      const storiesData = await storiesResponse.json();
      const commentsData = await commentsResponse.json();

      setReports(postsData.reports || []);
      setUserReports(usersData.reports || []);
      setStoryReports(storiesData.reports || []);
      setCommentReports(commentsData.reports || []);
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateStatus(reportId: string, status: "REVIEWED" | "DISMISSED", type: "post" | "user" | "story" | "comment") {
    try {
      let endpoint = '';
      switch (type) {
        case "post":
          endpoint = `/api/admin/reports/${reportId}`;
          break;
        case "user":
          endpoint = `/api/admin/user-reports/${reportId}`;
          break;
        case "story":
          endpoint = `/api/admin/story-reports/${reportId}`;
          break;
        case "comment":
          endpoint = `/api/admin/comment-reports/${reportId}`;
          break;
      }
        
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) throw new Error("Failed to update report status");

      toast.success("Report status updated");
      fetchReports(); // Refresh the list
    } catch (error) {
      console.error("Error updating report:", error);
      toast.error("Failed to update report status");
    }
  }

  function parseReviewInfo(reason: string | null) {
    if (!reason) return null;
    
    const reviewMatch = reason.match(/Reviewed by @(\w+) at (.+)$/);
    if (!reviewMatch) return null;

    return {
      username: reviewMatch[1],
      timestamp: reviewMatch[2]
    };
  }

  const getPaginatedReports = (reports: any[], page: number) => {
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return reports.slice(startIndex, endIndex);
  };

  const totalPages = (reports: any[]) => Math.ceil(reports.length / ITEMS_PER_PAGE);

  const PaginationControls = ({ 
    currentPage, 
    totalPages, 
    onPageChange,
    type 
  }: { 
    currentPage: number; 
    totalPages: number; 
    onPageChange: (page: number) => void;
    type: string;
  }) => {
    return (
      <div className="flex items-center justify-center gap-2 mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        <span className="text-sm">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </Button>
      </div>
    );
  };

  if (loading) {
    return <div className="text-center py-4">Loading reports...</div>;
  }

  if (!reports?.length && !userReports?.length && !storyReports?.length && !commentReports?.length) {
    return <div className="text-center py-4">No reports found.</div>;
  }

  return (
    <Tabs defaultValue="posts" className="w-full">
      <TabsList className={cn(
        "w-full h-auto p-1.5 bg-black/95 border border-neutral-800",
        "grid grid-cols-4 gap-1.5 rounded-xl"
      )}>
        <TabsTrigger 
          value="posts" 
          className={cn(
            "data-[state=active]:bg-gradient-to-br data-[state=active]:from-indigo-500 data-[state=active]:to-blue-600",
            "data-[state=active]:text-white",
            "data-[state=active]:border-none",
            "rounded-lg transition-all duration-200",
            "hover:bg-neutral-800/50",
            "py-2.5 text-sm font-medium"
          )}
        >
          Post Reports
        </TabsTrigger>
        <TabsTrigger 
          value="users" 
          className={cn(
            "data-[state=active]:bg-gradient-to-br data-[state=active]:from-fuchsia-500 data-[state=active]:to-purple-600",
            "data-[state=active]:text-white",
            "data-[state=active]:border-none",
            "rounded-lg transition-all duration-200",
            "hover:bg-neutral-800/50",
            "py-2.5 text-sm font-medium"
          )}
        >
          User Reports
        </TabsTrigger>
        <TabsTrigger 
          value="stories" 
          className={cn(
            "data-[state=active]:bg-gradient-to-br data-[state=active]:from-amber-400 data-[state=active]:to-orange-600",
            "data-[state=active]:text-white",
            "data-[state=active]:border-none",
            "rounded-lg transition-all duration-200",
            "hover:bg-neutral-800/50",
            "py-2.5 text-sm font-medium"
          )}
        >
          Story Reports
        </TabsTrigger>
        <TabsTrigger 
          value="comments" 
          className={cn(
            "data-[state=active]:bg-gradient-to-br data-[state=active]:from-rose-500 data-[state=active]:to-red-600",
            "data-[state=active]:text-white",
            "data-[state=active]:border-none",
            "rounded-lg transition-all duration-200",
            "hover:bg-neutral-800/50",
            "py-2.5 text-sm font-medium"
          )}
        >
          Comment Reports
        </TabsTrigger>
      </TabsList>

      <TabsContent value="posts">
        {reports.length > 0 ? (
          <>
            <div className="space-y-6">
              {getPaginatedReports(reports, currentPage.posts).map((report) => {
                const reviewInfo = parseReviewInfo(report.reason);
                const originalReason = report.reason?.split('\n\nReviewed by')[0];
                
                return (
                  <div
                    key={report.id}
                    className="bg-black rounded-lg border border-neutral-800 p-4 space-y-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <UserAvatar user={report.user} />
                        <div>
                          <div className="flex items-center space-x-2">
                            <Link
                              href={`/dashboard/${report.user.username}`}
                              className="font-semibold hover:underline text-white"
                            >
                              {report.user.username}
                            </Link>
                            <span className="text-neutral-400 text-sm">
                              reported a post
                            </span>
                          </div>
                          <p className="text-sm text-neutral-400">
                            {formatTimeToNow(new Date(report.createdAt))}
                          </p>
                          {originalReason && (
                            <p className="mt-2 text-sm text-neutral-300">{originalReason}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {report.status === "PENDING" ? (
                          <>
                            <Button
                              onClick={() => handleUpdateStatus(report.id, "REVIEWED", "post")}
                              variant="ghost"
                              size="sm"
                              className="text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Review
                            </Button>
                            <Button
                              onClick={() => handleUpdateStatus(report.id, "DISMISSED", "post")}
                              variant="ghost"
                              size="sm"
                              className="text-rose-500 hover:text-rose-400 hover:bg-rose-500/10"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Dismiss
                            </Button>
                          </>
                        ) : (
                          <div className="flex items-center space-x-1 text-sm">
                            <span className={cn(
                              "capitalize",
                              report.status === "REVIEWED" ? "text-emerald-500" : "text-rose-500"
                            )}>
                              {report.status.toLowerCase()}
                            </span>
                            {reviewInfo && (
                              <>
                                <span className="text-neutral-400">by</span>
                                <Link
                                  href={`/dashboard/${reviewInfo.username}`}
                                  className="font-medium hover:underline text-white"
                                >
                                  @{reviewInfo.username}
                                </Link>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="relative aspect-square w-48 rounded-lg overflow-hidden border border-neutral-800">
                      <img
                        src={report.post.fileUrl}
                        alt="Reported post"
                        className="object-cover w-full h-full"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-2">
                        <Link
                          href={`/dashboard/p/${report.post.id}`}
                          className="inline-flex items-center text-white hover:text-neutral-200 text-sm"
                        >
                          View Post
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <PaginationControls
              currentPage={currentPage.posts}
              totalPages={totalPages(reports)}
              onPageChange={(page) => setCurrentPage(prev => ({ ...prev, posts: page }))}
              type="posts"
            />
          </>
        ) : (
          <div className="text-center py-4">No post reports found.</div>
        )}
      </TabsContent>

      <TabsContent value="users">
        {userReports.length > 0 ? (
          <>
            <div className="space-y-6">
              {getPaginatedReports(userReports, currentPage.users).map((report) => {
                const reviewInfo = parseReviewInfo(report.reason);
                const originalReason = report.reason?.split('\n\nReviewed by')[0];
                
                return (
                  <div
                    key={report.id}
                    className="bg-black rounded-lg border border-neutral-800 p-4 space-y-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="flex -space-x-2">
                          <Avatar className="border-2 border-black">
                            <AvatarImage src={report.reporter?.image || undefined} />
                            <AvatarFallback>
                              {report.reporter?.name?.[0] || report.reporter?.username?.[0] || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <Avatar className="border-2 border-black">
                            <AvatarImage src={report.reported?.image || undefined} />
                            <AvatarFallback>
                              {report.reported?.name?.[0] || report.reported?.username?.[0] || "?"}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <Link
                              href={`/dashboard/${report.reporter.username}`}
                              className="font-semibold hover:underline text-white"
                            >
                              {report.reporter.username}
                            </Link>
                            <span className="text-neutral-400 text-sm">
                              reported
                            </span>
                            <Link
                              href={`/dashboard/${report.reported.username}`}
                              className="font-semibold hover:underline text-rose-500"
                            >
                              @{report.reported.username}
                            </Link>
                          </div>
                          <p className="text-sm text-neutral-400">
                            {formatTimeToNow(new Date(report.createdAt))}
                          </p>
                          {originalReason && (
                            <p className="mt-2 text-sm text-neutral-300">{originalReason}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {report.status === "PENDING" ? (
                          <>
                            <Button
                              onClick={() => handleUpdateStatus(report.id, "REVIEWED", "user")}
                              variant="ghost"
                              size="sm"
                              className="text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Review
                            </Button>
                            <Button
                              onClick={() => handleUpdateStatus(report.id, "DISMISSED", "user")}
                              variant="ghost"
                              size="sm"
                              className="text-rose-500 hover:text-rose-400 hover:bg-rose-500/10"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Dismiss
                            </Button>
                          </>
                        ) : (
                          <div className="flex items-center space-x-1 text-sm">
                            <span className={cn(
                              "capitalize",
                              report.status === "REVIEWED" ? "text-emerald-500" : "text-rose-500"
                            )}>
                              {report.status.toLowerCase()}
                            </span>
                            {reviewInfo && (
                              <>
                                <span className="text-neutral-400">by</span>
                                <Link
                                  href={`/dashboard/${reviewInfo.username}`}
                                  className="font-medium hover:underline text-white"
                                >
                                  @{reviewInfo.username}
                                </Link>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <PaginationControls
              currentPage={currentPage.users}
              totalPages={totalPages(userReports)}
              onPageChange={(page) => setCurrentPage(prev => ({ ...prev, users: page }))}
              type="users"
            />
          </>
        ) : (
          <div className="text-center py-4">No user reports found.</div>
        )}
      </TabsContent>

      <TabsContent value="stories">
        {storyReports.length > 0 ? (
          <>
            <div className="space-y-6">
              {getPaginatedReports(storyReports, currentPage.stories).map((report) => {
                const reviewInfo = parseReviewInfo(report.reason);
                const originalReason = report.reason?.split('\n\nReviewed by')[0];
                
                return (
                  <div
                    key={report.id}
                    className="bg-black rounded-lg border border-neutral-800 p-4 space-y-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <UserAvatar user={report.reporter} />
                        <div>
                          <div className="flex items-center space-x-2">
                            <Link
                              href={`/dashboard/${report.reporter.username}`}
                              className="font-semibold hover:underline text-white"
                            >
                              {report.reporter.username}
                            </Link>
                            <span className="text-neutral-400 text-sm">
                              reported a story by
                            </span>
                            <Link
                              href={`/dashboard/${report.story.user.username}`}
                              className="font-semibold hover:underline text-white"
                            >
                              {report.story.user.username}
                            </Link>
                          </div>
                          <p className="text-sm text-neutral-400">
                            {formatTimeToNow(new Date(report.createdAt))}
                          </p>
                          {originalReason && (
                            <p className="mt-2 text-sm text-neutral-300">{originalReason}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {report.status === "PENDING" ? (
                          <>
                            <Button
                              onClick={() => handleUpdateStatus(report.id, "REVIEWED", "story")}
                              variant="ghost"
                              size="sm"
                              className="text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Review
                            </Button>
                            <Button
                              onClick={() => handleUpdateStatus(report.id, "DISMISSED", "story")}
                              variant="ghost"
                              size="sm"
                              className="text-rose-500 hover:text-rose-400 hover:bg-rose-500/10"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Dismiss
                            </Button>
                          </>
                        ) : (
                          <div className="flex items-center space-x-1 text-sm">
                            <span className={cn(
                              "capitalize",
                              report.status === "REVIEWED" ? "text-emerald-500" : "text-rose-500"
                            )}>
                              {report.status.toLowerCase()}
                            </span>
                            {reviewInfo && (
                              <>
                                <span className="text-neutral-400">by</span>
                                <Link
                                  href={`/dashboard/${reviewInfo.username}`}
                                  className="font-medium hover:underline text-white"
                                >
                                  @{reviewInfo.username}
                                </Link>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <PaginationControls
              currentPage={currentPage.stories}
              totalPages={totalPages(storyReports)}
              onPageChange={(page) => setCurrentPage(prev => ({ ...prev, stories: page }))}
              type="stories"
            />
          </>
        ) : (
          <div className="text-center py-4">No story reports found.</div>
        )}
      </TabsContent>

      <TabsContent value="comments">
        {commentReports.length > 0 ? (
          <>
            <div className="space-y-6">
              {getPaginatedReports(commentReports, currentPage.comments).map((report) => {
                const reviewInfo = parseReviewInfo(report.reason);
                const originalReason = report.reason?.split('\n\nReviewed by')[0];
                
                return (
                  <div
                    key={report.id}
                    className="bg-black rounded-lg border border-neutral-800 p-4 space-y-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <UserAvatar user={report.reporter} />
                        <div>
                          <div className="flex items-center space-x-2">
                            <Link
                              href={`/dashboard/${report.reporter.username}`}
                              className="font-semibold hover:underline text-white"
                            >
                              {report.reporter.username}
                            </Link>
                            <span className="text-neutral-400 text-sm">
                              reported a comment by
                            </span>
                            <Link
                              href={`/dashboard/${report.comment.user.username}`}
                              className="font-semibold hover:underline text-white"
                            >
                              {report.comment.user.username}
                            </Link>
                          </div>
                          <p className="text-sm text-neutral-400">
                            {formatTimeToNow(new Date(report.createdAt))}
                          </p>
                          <blockquote className="mt-2 text-sm border-l-2 border-neutral-700 pl-3 italic text-neutral-300">
                            {report.comment.body}
                          </blockquote>
                          {originalReason && (
                            <p className="mt-2 text-sm text-neutral-300">
                              <span className="font-medium text-white">Reason:</span> {originalReason}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {report.status === "PENDING" ? (
                          <>
                            <Button
                              onClick={() => handleUpdateStatus(report.id, "REVIEWED", "comment")}
                              variant="ghost"
                              size="sm"
                              className="text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Review
                            </Button>
                            <Button
                              onClick={() => handleUpdateStatus(report.id, "DISMISSED", "comment")}
                              variant="ghost"
                              size="sm"
                              className="text-rose-500 hover:text-rose-400 hover:bg-rose-500/10"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Dismiss
                            </Button>
                          </>
                        ) : (
                          <div className="flex items-center space-x-1 text-sm">
                            <span className={cn(
                              "capitalize",
                              report.status === "REVIEWED" ? "text-emerald-500" : "text-rose-500"
                            )}>
                              {report.status.toLowerCase()}
                            </span>
                            {reviewInfo && (
                              <>
                                <span className="text-neutral-400">by</span>
                                <Link
                                  href={`/dashboard/${reviewInfo.username}`}
                                  className="font-medium hover:underline text-white"
                                >
                                  @{reviewInfo.username}
                                </Link>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <PaginationControls
              currentPage={currentPage.comments}
              totalPages={totalPages(commentReports)}
              onPageChange={(page) => setCurrentPage(prev => ({ ...prev, comments: page }))}
              type="comments"
            />
          </>
        ) : (
          <div className="text-center py-4">No comment reports found.</div>
        )}
      </TabsContent>
    </Tabs>
  );
} 