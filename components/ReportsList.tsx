"use client";

import { useEffect, useState } from "react";
import { Report } from "@/lib/definitions";
import UserAvatar from "./UserAvatar";
import Link from "next/link";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { formatTimeToNow } from "@/lib/utils";

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
  reporter: {
    id: string;
    username: string | null;
    image: string | null;
  };
  story: {
    id: string;
    user: {
      id: string;
      username: string | null;
      image: string | null;
    };
  };
}

export function ReportsList() {
  const [reports, setReports] = useState<ReportWithUser[]>([]);
  const [userReports, setUserReports] = useState<UserReport[]>([]);
  const [storyReports, setStoryReports] = useState<StoryReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  async function fetchReports() {
    try {
      const [postsResponse, usersResponse] = await Promise.all([
        fetch("/api/admin/reports"),
        fetch("/api/admin/user-reports")
      ]);

      if (!postsResponse.ok || !usersResponse.ok) {
        throw new Error("Failed to fetch reports");
      }

      const postsData = await postsResponse.json();
      const usersData = await usersResponse.json();

      setReports(postsData.reports || []);
      setUserReports(usersData.reports || []);
      setStoryReports([]); // Set to empty array since story reports are not available
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateStatus(reportId: string, status: "REVIEWED" | "DISMISSED", type: "post" | "user") {
    try {
      const endpoint = type === "post" 
        ? `/api/admin/reports/${reportId}`
        : `/api/admin/user-reports/${reportId}`;
        
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

  if (loading) {
    return <div className="text-center py-4">Loading reports...</div>;
  }

  if (!reports?.length && !userReports?.length && !storyReports?.length) {
    return <div className="text-center py-4">No reports found.</div>;
  }

  return (
    <div className="space-y-8">
      {/* Post Reports */}
      {reports.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Post Reports</h2>
          <div className="space-y-6">
            {reports.map((report) => {
              const reviewInfo = parseReviewInfo(report.reason);
              const originalReason = report.reason?.split('\n\nReviewed by')[0];
              
              return (
                <div
                  key={report.id}
                  className="bg-white dark:bg-neutral-950 rounded-lg shadow p-4 border border-neutral-200 dark:border-neutral-800"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <UserAvatar user={report.user} />
                      <div>
                        <div className="flex items-center space-x-2">
                          <Link
                            href={`/dashboard/${report.user.username}`}
                            className="font-semibold hover:underline"
                          >
                            {report.user.username}
                          </Link>
                          <span className="text-neutral-500 dark:text-neutral-400 text-sm">
                            reported a post
                          </span>
                        </div>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                          {formatTimeToNow(new Date(report.createdAt))}
                        </p>
                        {originalReason && (
                          <p className="mt-2 text-sm">{originalReason}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      {report.status === "PENDING" ? (
                        <>
                          <Button
                            onClick={() => handleUpdateStatus(report.id, "REVIEWED", "post")}
                            variant="default"
                            size="sm"
                          >
                            Review
                          </Button>
                          <Button
                            onClick={() => handleUpdateStatus(report.id, "DISMISSED", "post")}
                            variant="outline"
                            size="sm"
                          >
                            Dismiss
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center space-x-1">
                            <span className="text-sm text-neutral-500 dark:text-neutral-400 capitalize">
                              {report.status.toLowerCase()}
                            </span>
                            {reviewInfo && (
                              <>
                                <span className="text-sm text-neutral-500 dark:text-neutral-400">by</span>
                                <Link
                                  href={`/dashboard/${reviewInfo.username}`}
                                  className="text-sm font-medium hover:underline text-neutral-900 dark:text-neutral-100"
                                >
                                  @{reviewInfo.username}
                                </Link>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="mt-4">
                    <Link
                      href={`/dashboard/p/${report.post.id}`}
                      className="block relative aspect-square w-32 rounded-lg overflow-hidden"
                    >
                      <img
                        src={report.post.fileUrl}
                        alt="Reported post"
                        className="object-cover w-full h-full"
                      />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* User Reports */}
      {userReports.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">User Reports</h2>
          <div className="space-y-6">
            {userReports.map((report) => {
              const reviewInfo = parseReviewInfo(report.reason);
              const originalReason = report.reason?.split('\n\nReviewed by')[0];
              
              return (
                <div
                  key={report.id}
                  className="bg-white dark:bg-neutral-950 rounded-lg shadow p-4 border border-neutral-200 dark:border-neutral-800"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <UserAvatar user={report.reporter} />
                      <div>
                        <div className="flex items-center space-x-2">
                          <Link
                            href={`/dashboard/${report.reporter.username}`}
                            className="font-semibold hover:underline"
                          >
                            {report.reporter.username}
                          </Link>
                          <span className="text-neutral-500 dark:text-neutral-400 text-sm">
                            reported
                          </span>
                          <Link
                            href={`/dashboard/${report.reported.username}`}
                            className="font-semibold hover:underline text-red-500"
                          >
                            @{report.reported.username}
                          </Link>
                        </div>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                          {formatTimeToNow(new Date(report.createdAt))}
                        </p>
                        {originalReason && (
                          <p className="mt-2 text-sm">{originalReason}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      {report.status === "PENDING" ? (
                        <>
                          <Button
                            onClick={() => handleUpdateStatus(report.id, "REVIEWED", "user")}
                            variant="default"
                            size="sm"
                          >
                            Review
                          </Button>
                          <Button
                            onClick={() => handleUpdateStatus(report.id, "DISMISSED", "user")}
                            variant="outline"
                            size="sm"
                          >
                            Dismiss
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center space-x-1">
                            <span className="text-sm text-neutral-500 dark:text-neutral-400 capitalize">
                              {report.status.toLowerCase()}
                            </span>
                            {reviewInfo && (
                              <>
                                <span className="text-sm text-neutral-500 dark:text-neutral-400">by</span>
                                <Link
                                  href={`/dashboard/${reviewInfo.username}`}
                                  className="text-sm font-medium hover:underline text-neutral-900 dark:text-neutral-100"
                                >
                                  @{reviewInfo.username}
                                </Link>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Story Reports */}
      {storyReports.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Story Reports</h2>
          <div className="space-y-6">
            {storyReports.map((report) => {
              const reviewInfo = parseReviewInfo(report.reason);
              const originalReason = report.reason?.split('\n\nReviewed by')[0];
              
              return (
                <div
                  key={report.id}
                  className="bg-white dark:bg-neutral-950 rounded-lg shadow p-4 border border-neutral-200 dark:border-neutral-800"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden">
                        <img
                          src={report.reporter.image || "/default-avatar.png"}
                          alt={report.reporter.username || "User"}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <Link
                            href={`/dashboard/${report.reporter.username}`}
                            className="font-semibold hover:underline"
                          >
                            {report.reporter.username}
                          </Link>
                          <span className="text-neutral-500 dark:text-neutral-400 text-sm">
                            reported a story by
                          </span>
                          <Link
                            href={`/dashboard/${report.story.user.username}`}
                            className="font-semibold hover:underline text-red-500"
                          >
                            @{report.story.user.username}
                          </Link>
                        </div>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                          {formatTimeToNow(new Date(report.createdAt))}
                        </p>
                        {originalReason && (
                          <p className="mt-2 text-sm">{originalReason}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      {report.status === "PENDING" ? (
                        <>
                          <Button
                            onClick={() => handleUpdateStatus(report.id, "REVIEWED", "post")}
                            variant="default"
                            size="sm"
                          >
                            Review
                          </Button>
                          <Button
                            onClick={() => handleUpdateStatus(report.id, "DISMISSED", "post")}
                            variant="outline"
                            size="sm"
                          >
                            Dismiss
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center space-x-1">
                            <span className="text-sm text-neutral-500 dark:text-neutral-400 capitalize">
                              {report.status.toLowerCase()}
                            </span>
                            {reviewInfo && (
                              <>
                                <span className="text-sm text-neutral-500 dark:text-neutral-400">by</span>
                                <Link
                                  href={`/dashboard/${reviewInfo.username}`}
                                  className="text-sm font-medium hover:underline text-neutral-900 dark:text-neutral-100"
                                >
                                  @{reviewInfo.username}
                                </Link>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
} 