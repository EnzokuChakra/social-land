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

export function ReportsList() {
  const [reports, setReports] = useState<ReportWithUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  async function fetchReports() {
    try {
      const response = await fetch("/api/admin/reports");
      const data = await response.json();
      setReports(data.reports);
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateStatus(reportId: string, status: "REVIEWED" | "DISMISSED") {
    try {
      const response = await fetch(`/api/admin/reports/${reportId}`, {
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

  if (loading) {
    return <div className="text-center py-4">Loading reports...</div>;
  }

  if (reports.length === 0) {
    return <div className="text-center py-4">No reports found.</div>;
  }

  return (
    <div className="space-y-6">
      {reports.map((report) => (
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
                {report.reason && (
                  <p className="mt-2 text-sm">{report.reason}</p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {report.status === "PENDING" && (
                <>
                  <Button
                    onClick={() => handleUpdateStatus(report.id, "REVIEWED")}
                    variant="default"
                    size="sm"
                  >
                    Review
                  </Button>
                  <Button
                    onClick={() => handleUpdateStatus(report.id, "DISMISSED")}
                    variant="outline"
                    size="sm"
                  >
                    Dismiss
                  </Button>
                </>
              )}
              {report.status !== "PENDING" && (
                <span className="text-sm text-neutral-500 dark:text-neutral-400">
                  {report.status.toLowerCase()}
                </span>
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
      ))}
    </div>
  );
} 