"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle, Eye, EyeOff } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getSocket } from "@/lib/socket";

interface Reel {
  id: string;
  caption: string | null;
  fileUrl: string;
  thumbnail: string;
  createdAt: string;
  user: {
    username: string;
    image: string;
  };
}

export default function AdminReelsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewNotes, setReviewNotes] = useState<{ [key: string]: string }>({});
  const [processingReels, setProcessingReels] = useState<{ [key: string]: boolean }>({});
  const [reelsEnabled, setReelsEnabled] = useState(true);
  const [isUpdatingReelsVisibility, setIsUpdatingReelsVisibility] = useState(false);

  const userRole = session?.user?.role;
  const isMasterAdmin = userRole === "MASTER_ADMIN";

  useEffect(() => {
    if (status === "loading") return;

    const userRole = session?.user?.role as string | undefined;
    if (!userRole || !["MODERATOR", "ADMIN", "MASTER_ADMIN"].includes(userRole)) {
      router.push("/dashboard");
      return;
    }

    fetchPendingReels();
    if (isMasterAdmin) {
      fetchReelsVisibilitySettings();
    }
  }, [session, status, router, isMasterAdmin]);

  const fetchPendingReels = async () => {
    try {
      const response = await fetch("/api/admin/reels/pending");
      if (response.ok) {
        const data = await response.json();
        setReels(data);
      } else {
        throw new Error("Failed to fetch pending reels");
      }
    } catch (error) {
      console.error("Error fetching pending reels:", error);
      toast.error("Failed to load pending reels");
    } finally {
      setLoading(false);
    }
  };

  const fetchReelsVisibilitySettings = async () => {
    try {
      const response = await fetch("/api/admin/settings/reels");
      if (response.ok) {
        const data = await response.json();
        setReelsEnabled(data.reelsEnabled);
      }
    } catch (error) {
      console.error("Error fetching reels visibility settings:", error);
    }
  };

  const handleReelsVisibilityToggle = async () => {
    if (!isMasterAdmin) return;

    setIsUpdatingReelsVisibility(true);
    try {
      const response = await fetch("/api/admin/settings/reels", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reelsEnabled: !reelsEnabled }),
      });

      if (response.ok) {
        setReelsEnabled(!reelsEnabled);
        // Emit WebSocket event for real-time updates
        const socket = getSocket();
        if (socket) {
          socket.emit('reels_visibility_changed', { reelsEnabled: !reelsEnabled });
        }
        toast.success(`Reels are now ${!reelsEnabled ? "enabled" : "disabled"} platform-wide`);
      } else {
        throw new Error("Failed to update reels visibility");
      }
    } catch (error) {
      console.error("Error updating reels visibility:", error);
      toast.error("Failed to update reels visibility");
    } finally {
      setIsUpdatingReelsVisibility(false);
    }
  };

  const handleReview = async (reelId: string, status: "APPROVED" | "REJECTED") => {
    setProcessingReels(prev => ({ ...prev, [reelId]: true }));
    try {
      const response = await fetch(`/api/admin/reels/${reelId}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
          note: reviewNotes[reelId]
        }),
      });

      if (response.ok) {
        toast.success(`Reel ${status.toLowerCase()}`);
        setReels(prev => prev.filter(reel => reel.id !== reelId));
        setReviewNotes(prev => {
          const newNotes = { ...prev };
          delete newNotes[reelId];
          return newNotes;
        });
      } else {
        throw new Error("Failed to review reel");
      }
    } catch (error) {
      console.error("Error reviewing reel:", error);
      toast.error("Failed to review reel");
    } finally {
      setProcessingReels(prev => ({ ...prev, [reelId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <h3 className="text-xl font-semibold">Loading reels...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Reels Moderation</h1>
        {isMasterAdmin && (
          <div className="flex items-center gap-2">
            <Label htmlFor="reels-visibility-toggle" className="text-sm font-normal">
              {reelsEnabled ? "Enabled" : "Disabled"}
            </Label>
            <Switch
              id="reels-visibility-toggle"
              checked={reelsEnabled}
              onCheckedChange={handleReelsVisibilityToggle}
              disabled={isUpdatingReelsVisibility}
            />
          </div>
        )}
      </div>

      {!reelsEnabled && (
        <Alert className="mb-6 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
          <AlertTitle className="text-amber-700 dark:text-amber-400 flex items-center gap-2">
            <EyeOff className="h-4 w-4" />
            Reels are currently disabled
          </AlertTitle>
          <AlertDescription className="text-amber-600 dark:text-amber-400/80 text-sm">
            While disabled, users cannot create or view reels across the platform. The reels feature is completely hidden.
          </AlertDescription>
        </Alert>
      )}

      {reels.length === 0 ? (
        <p className="text-neutral-600 dark:text-neutral-400">
          No pending reels to review
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reels.map((reel) => (
            <Card key={reel.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Link 
                    href={`/dashboard/${reel.user.username}`}
                    className="font-medium hover:underline"
                  >
                    @{reel.user.username}
                  </Link>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(reel.createdAt))} ago
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <video
                  src={reel.fileUrl}
                  controls
                  className="w-full rounded-lg"
                  style={{ maxHeight: "400px" }}
                />
                {reel.caption && (
                  <p className="text-sm text-muted-foreground">{reel.caption}</p>
                )}
                <Textarea
                  placeholder="Add review notes (optional)"
                  value={reviewNotes[reel.id] || ""}
                  onChange={(e) =>
                    setReviewNotes((prev) => ({
                      ...prev,
                      [reel.id]: e.target.value,
                    }))
                  }
                />
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => handleReview(reel.id, "APPROVED")}
                  disabled={processingReels[reel.id]}
                >
                  {processingReels[reel.id] ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </>
                  )}
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => handleReview(reel.id, "REJECTED")}
                  disabled={processingReels[reel.id]}
                >
                  {processingReels[reel.id] ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 