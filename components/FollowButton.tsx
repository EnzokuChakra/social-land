"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

interface FollowButtonProps {
  followingId: string;
  isFollowing: boolean;
  hasPendingRequest: boolean;
  isPrivate?: boolean;
  isFollowedByUser?: boolean;
  className?: string;
  buttonClassName?: string;
  variant?: "default" | "profile";
  onSuccess?: (success: boolean) => void;
}

export default function FollowButton({
  followingId,
  isFollowing,
  hasPendingRequest,
  isPrivate = false,
  isFollowedByUser = false,
  className,
  buttonClassName,
  variant = "default",
  onSuccess
}: FollowButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [followState, setFollowState] = useState({
    isFollowing,
    hasPendingRequest,
    isFollowedByUser,
    hasPendingRequestFromUser: false
  });
  const { data: session } = useSession();
  const isOwnProfile = session?.user?.id === followingId;

  const handleFollow = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/users/follow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          followingId,
          action: isFollowing ? "unfollow" : "follow"
        })
      });

      if (!response.ok) {
        setFollowState(prev => ({
          ...prev,
          isFollowing: false,
          hasPendingRequest: false
        }));
        throw new Error("Failed to follow user");
      }

      const data = await response.json();

      toast.success(data.status === "ACCEPTED" ? "Following user" : "Follow request sent");

      setFollowState(prev => ({
        ...prev,
        isFollowing: data.status === "ACCEPTED",
        hasPendingRequest: data.status === "PENDING"
      }));

      // Remove user from suggestions immediately after successful follow request
      if (onSuccess) {
        onSuccess(true);
      }

      // Force a router refresh to update the UI
      router.refresh();
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnfollow = async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);

      // Optimistically update the UI
      setFollowState(prev => ({
        ...prev,
        isFollowing: false,
        hasPendingRequest: false
      }));

      const response = await fetch("/api/users/follow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          followingId,
          action: "unfollow"
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setFollowState(prev => ({
          ...prev,
          isFollowing: true,
          hasPendingRequest: false
        }));
        throw new Error(data.error || "Failed to unfollow user");
      }

      // Update state based on the response
      setFollowState(prev => ({
        ...prev,
        isFollowing: false,
        hasPendingRequest: false
      }));

      if (onSuccess) {
        onSuccess(false);
      }

      router.refresh();
    } catch (error) {
      toast.error("Failed to unfollow user");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);
      const response = await fetch("/api/users/follow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          followingId,
          followerId: followingId,
          action: "delete"
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel follow request");
      }

      const newState = {
        isFollowing: false,
        hasPendingRequest: false,
        isFollowedByUser: followState.isFollowedByUser,
        hasPendingRequestFromUser: followState.hasPendingRequestFromUser
      };
      setFollowState(newState);
      onSuccess?.(true);

      toast.success("Follow request cancelled");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to cancel follow request");
      onSuccess?.(false);
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonText = () => {
    if (followState.hasPendingRequest) {
      return isHovered ? "Cancel" : "Requested";
    }
    if (followState.isFollowing) {
      return isHovered ? "Unfollow" : "Following";
    }
    if (followState.hasPendingRequestFromUser) {
      return "Accept Request";
    }
    return followState.isFollowedByUser ? "Follow Back" : "Follow";
  };

  const handleClick = async () => {
    if (followState.isFollowing) {
      await handleUnfollow();
    } else if (followState.hasPendingRequest) {
      await handleCancelRequest();
    } else {
      await handleFollow();
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={isLoading}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "relative font-semibold transition-all duration-200 px-6",
        "hover:scale-[0.98] active:scale-[0.97]",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        followState.isFollowing || followState.hasPendingRequest
          ? cn(
              "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300",
              followState.hasPendingRequest && isHovered
                ? "hover:bg-red-500/10 hover:text-red-500 dark:hover:bg-red-500/20"
                : "hover:bg-neutral-200 dark:hover:bg-neutral-700",
              "border border-neutral-200 dark:border-neutral-700",
              followState.hasPendingRequest && isHovered && "hover:border-red-500/50 dark:hover:border-red-500/50"
            )
          : cn(
              "bg-blue-500 hover:bg-blue-600 text-white",
              "shadow-sm hover:shadow-md",
              "border border-blue-600 hover:border-blue-700",
              isFollowedByUser && "transition-all duration-300"
            ),
        className
      )}
    >
      <span className={cn(
        "flex items-center gap-1",
        isLoading && "opacity-0"
      )}>
        {getButtonText()}
      </span>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
    </Button>
  );
}
