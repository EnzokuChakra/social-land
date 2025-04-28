"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, X, Clock } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

type VerificationRequest = {
  id: string;
  createdAt: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  user: {
    id: string;
    username: string | null;
    name: string | null;
    image: string | null;
  };
};

export default function VerifiedBadgePage() {
  const { data: session } = useSession();
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.role !== "MASTER_ADMIN") {
      redirect("/dashboard");
    }

    fetchRequests();
  }, [session]);

  async function fetchRequests() {
    try {
      const response = await fetch("/api/admin/verification-requests");
      const data = await response.json();
      setRequests(data.requests);
    } catch (error) {
      console.error("Error fetching verification requests:", error);
      toast.error("Failed to load verification requests");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerificationAction(requestId: string, action: "APPROVED" | "REJECTED") {
    try {
      const response = await fetch(`/api/admin/verification-requests/${requestId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: action }),
      });

      if (!response.ok) throw new Error("Failed to update request status");

      toast.success(`Request ${action.toLowerCase()} successfully`);
      fetchRequests(); // Refresh the list
    } catch (error) {
      console.error("Error updating request:", error);
      toast.error("Failed to update request status");
    }
  }

  async function handleRemoveVerification(requestId: string) {
    try {
      const response = await fetch(`/api/admin/verification-requests/${requestId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to remove verification");

      toast.success("Verification removed successfully");
      fetchRequests(); // Refresh the list
    } catch (error) {
      console.error("Error removing verification:", error);
      toast.error("Failed to remove verification");
    }
  }

  if (loading) {
    return <div className="text-center py-4">Loading requests...</div>;
  }

  return (
    <div className="px-4 py-6 max-w-6xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Verification Requests</CardTitle>
          <CardDescription>
            Manage user verification badge requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {requests.map((request) => (
                <div key={request.id} className="flex items-center gap-4 rounded-lg border p-4">
                  <Link href={`/dashboard/${request.user.username}`} className="hover:opacity-75 transition">
                    <Avatar>
                      <AvatarImage src={request.user.image ?? ''} alt={request.user.username ?? 'User'} />
                      <AvatarFallback>
                        {request.user.username?.[0] ?? '?'}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 space-y-1">
                    <Link 
                      href={`/dashboard/${request.user.username}`}
                      className="font-medium hover:underline"
                    >
                      {request.user.username ?? 'Unknown User'}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      Requested on {new Date(request.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {request.status === "PENDING" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        className="bg-green-500 hover:bg-green-600"
                        onClick={() => handleVerificationAction(request.id, "APPROVED")}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleVerificationAction(request.id, "REJECTED")}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Deny
                      </Button>
                    </div>
                  )}
                  {request.status === "APPROVED" && (
                    <div className="flex items-center gap-2">
                      <div className="text-green-500 flex items-center gap-1">
                        <Check className="h-4 w-4" />
                        Approved
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRemoveVerification(request.id)}
                        className="ml-2"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  )}
                  {request.status === "REJECTED" && (
                    <div className="text-red-500 flex items-center gap-1">
                      <X className="h-4 w-4" />
                      Rejected
                    </div>
                  )}
                </div>
              ))}
              {requests.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-4">
                  No verification requests found
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
} 