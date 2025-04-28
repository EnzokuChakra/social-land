import VerifiedBadge from "./VerifiedBadge";
import { User } from "@/lib/definitions";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ProfileProps {
  user: User;
}

export default function Profile({ user }: ProfileProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [followState, setFollowState] = useState({
    isFollowing: user.isFollowing || false,
    hasPendingRequest: user.hasPendingRequest || false,
    isFollowedByUser: user.isFollowedByUser || false,
    hasPendingRequestFromUser: user.hasPendingRequestFromUser || false
  });
  const router = useRouter();

  // Verify the actual follow request status when component mounts
  useEffect(() => {
    const verifyFollowRequest = async () => {
      try {
        const response = await fetch(`/api/users/follow/check?followingId=${user.id}`);
        const data = await response.json();
        
        if (response.ok) {
          console.log('Profile - Follow check response:', data);
          setFollowState(prev => ({
            ...prev,
            isFollowing: data.isFollowing || false,
            hasPendingRequest: data.hasPendingRequest || false,
            isFollowedByUser: data.isFollowedByUser || false,
            hasPendingRequestFromUser: data.hasPendingRequestFromUser || false
          }));
        }
      } catch (error) {
        console.error("Error verifying follow request:", error);
      }
    };

    verifyFollowRequest();
  }, [user.id]);

  const handleFollow = async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);
      const response = await fetch("/api/users/follow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          followingId: user.id,
          action: "follow"
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        // If it's already pending, don't show an error, just update the UI
        if (data.status === "PENDING") {
          setFollowState(prev => ({
            ...prev,
            isFollowing: false,
            hasPendingRequest: true
          }));
          toast.success("Follow request pending");
          return;
        }
        throw new Error(data.error || "Failed to follow user");
      }

      // Update local state based on the response status
      setFollowState(prev => ({
        ...prev,
        isFollowing: data.status === "ACCEPTED",
        hasPendingRequest: data.status === "PENDING",
        isFollowedByUser: prev.isFollowedByUser
      }));

      toast.success(
        data.status === "PENDING" 
          ? "Follow request sent" 
          : "Successfully followed user"
      );
      
      router.refresh();
    } catch (error) {
      console.error("Error following user:", error);
      toast.error(error instanceof Error ? error.message : "Failed to follow user");
    } finally {
      setIsLoading(false);
    }
  };

  const getFollowButtonText = () => {
    if (followState.isFollowing) return "Following";
    if (followState.hasPendingRequest) return "Requested";
    if (followState.isFollowedByUser) return "Follow Back";
    return "Follow";
  };

  return (
    <div className="flex flex-col items-start gap-4" suppressHydrationWarning>
      <div className="flex flex-col items-start gap-2" suppressHydrationWarning>
        <div className="flex items-center gap-x-1" suppressHydrationWarning>
          <h1 className="text-2xl font-semibold">{user.name}</h1>
          {user.verified && <VerifiedBadge />}
        </div>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          @{user.username}
        </p>
      </div>
      <Button
        onClick={handleFollow}
        disabled={isLoading}
        className={cn(
          "px-4 font-semibold text-sm",
          followState.isFollowing || followState.hasPendingRequest
            ? "bg-neutral-500 hover:bg-neutral-400 text-white"
            : "bg-blue-500 hover:bg-blue-400 text-white"
        )}
      >
        {getFollowButtonText()}
      </Button>
    </div>
  );
} 