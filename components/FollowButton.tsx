"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useFollowStatus } from "@/lib/hooks/use-follow-status";
import { CustomLoader } from "@/components/ui/custom-loader";
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from "@/lib/socket";

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
  isFollowing: initialIsFollowing,
  hasPendingRequest: initialHasPendingRequest,
  isPrivate = false,
  isFollowedByUser: initialIsFollowedByUser = false,
  className,
  buttonClassName,
  variant = "default",
  onSuccess
}: FollowButtonProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const { data: session } = useSession();
  const isOwnProfile = session?.user?.id === followingId;
  const lastActionTime = useRef<number>(0);
  const socket = getSocket();
  
  // Use the follow status hook to get real-time status
  const { data: followStatus, isLoading: isLoadingStatus } = useFollowStatus(followingId);
  
  const [followState, setFollowState] = useState({
    isFollowing: initialIsFollowing,
    hasPendingRequest: initialHasPendingRequest,
    isFollowedByUser: initialIsFollowedByUser,
    hasPendingRequestFromUser: false
  });

  // Update follow state when follow status changes
  useEffect(() => {
    if (followStatus) {
      setFollowState({
        isFollowing: followStatus.isFollowing,
        hasPendingRequest: followStatus.hasPendingRequest,
        isFollowedByUser: followStatus.isFollowedByUser,
        hasPendingRequestFromUser: followStatus.hasPendingRequestFromUser
      });
    }
  }, [followStatus]);

  // Listen for followRequestsCleared event and handle socket reconnection
  useEffect(() => {
    if (!socket) return;

    const handleFollowRequestsCleared = (data: { userId: string }) => {
      if (data.userId === followingId) {
        console.log("[FollowButton] Received followRequestsCleared event for user:", followingId);
        setFollowState(prev => ({
          ...prev,
          hasPendingRequest: false
        }));
      }
    };

    const handleConnect = () => {
      console.log("[FollowButton] Socket connected, re-registering event listeners");
      socket.on("followRequestsCleared", handleFollowRequestsCleared);
    };

    const handleDisconnect = () => {
      console.log("[FollowButton] Socket disconnected");
      socket.off("followRequestsCleared", handleFollowRequestsCleared);
    };

    // Register event listeners
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("followRequestsCleared", handleFollowRequestsCleared);

    // Initial connection check
    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("followRequestsCleared", handleFollowRequestsCleared);
    };
  }, [socket, followingId]);

  // Check initial block status
  useEffect(() => {
    const checkBlockStatus = async () => {
      try {
        const response = await fetch(`/api/users/block?userId=${followingId}`);
        if (response.ok) {
          const data = await response.json();
          setIsBlocked(data.isBlocked);
        }
      } catch (error) {
        console.error("[FollowButton] Error checking block status:", error);
      }
    };
    
    if (session?.user?.id && followingId && session.user.id !== followingId) {
      checkBlockStatus();
    }
  }, [followingId, session?.user?.id]);

  // Listen for block status changes and refresh follow status
  useEffect(() => {
    const handleFollowStatusRefresh = (event: CustomEvent) => {
      if (event.detail.userId === followingId) {
        console.log("[FollowButton] Received followStatusRefresh event, refreshing follow status");
        queryClient.invalidateQueries({ queryKey: ['followStatus', followingId] });
      }
    };
    
    const handleFollowStatusChanged = (event: CustomEvent) => {
      if (event.detail.userId === followingId) {
        console.log("[FollowButton] Received followStatusChanged event:", event.detail);
        setFollowState(prev => ({
          ...prev,
          isFollowing: event.detail.isFollowing,
          hasPendingRequest: event.detail.hasPendingRequest
        }));
        queryClient.invalidateQueries({ queryKey: ['followStatus', followingId] });
      }
    };
    
    // Listen for block status changes
    const handleBlockStatusChange = (event: CustomEvent) => {
      if (event.detail.userId === followingId) {
        console.log("[FollowButton] Received blockStatusChanged event:", event.detail);
        setIsBlocked(event.detail.isBlocked);
      }
    };
    
    window.addEventListener('followStatusRefresh', handleFollowStatusRefresh as EventListener);
    window.addEventListener('followStatusChanged', handleFollowStatusChanged as EventListener);
    window.addEventListener('blockStatusChanged', handleBlockStatusChange as EventListener);
    
    return () => {
      window.removeEventListener('followStatusRefresh', handleFollowStatusRefresh as EventListener);
      window.removeEventListener('followStatusChanged', handleFollowStatusChanged as EventListener);
      window.removeEventListener('blockStatusChanged', handleBlockStatusChange as EventListener);
    };
  }, [followingId, queryClient]);

  useEffect(() => {
    if (socket) {
      socket.on("followRequestDeleted", (data) => {
        console.log("[FollowButton] Received followRequestDeleted event:", data);
        if (data.followingId === followingId || data.followerId === followingId) {
          setFollowState(prev => ({
            ...prev,
            isFollowing: false,
            hasPendingRequest: false
          }));
          setIsLoading(false);
        }
      });

      // Listen for block events
      socket.on("userBlocked", (data) => {
        console.log("[FollowButton] Received userBlocked event:", data);
        // If current user blocked the target user OR the target user blocked the current user
        if ((data.blockerId === session?.user?.id && data.blockedId === followingId) || 
            (data.blockerId === followingId && data.blockedId === session?.user?.id)) {
          setIsBlocked(true);
          setFollowState(prev => ({
            ...prev,
            isFollowing: false,
            hasPendingRequest: false
          }));
        }
      });

      socket.on("userUnblocked", (data) => {
        console.log("[FollowButton] Received userUnblocked event:", data);
        // If current user unblocked the target user
        if (data.blockerId === session?.user?.id && data.blockedId === followingId) {
          setIsBlocked(false);
          // Don't automatically follow - just update the block status
        }
      });

      return () => {
        socket.off("followRequestDeleted");
        socket.off("userBlocked");
        socket.off("userUnblocked");
      };
    }
  }, [socket, followingId, session?.user?.id]);

  const canPerformAction = () => {
    const now = Date.now();
    const timeSinceLastAction = now - lastActionTime.current;
    const cooldownPeriod = 5000; // 5 seconds in milliseconds

    if (timeSinceLastAction < cooldownPeriod) {
      const remainingTime = Math.ceil((cooldownPeriod - timeSinceLastAction) / 1000);
      toast.error(`Please wait ${remainingTime} seconds before trying again`);
      return false;
    }

    lastActionTime.current = now;
    return true;
  };

  const handleFollow = async () => {
    if (isLoading || !canPerformAction()) return;

    setIsLoading(true);
    try {
      // Optimistically update the UI
      setFollowState(prev => ({
        ...prev,
        isFollowing: true,
        hasPendingRequest: false
      }));

      const response = await fetch("/api/users/follow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          followingId,
          action: "follow"
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // Revert optimistic update on error
        setFollowState(prev => ({
          ...prev,
          isFollowing: false,
          hasPendingRequest: false
        }));
        throw new Error(data.error || "Failed to follow user");
      }

      toast.success(data.status === "ACCEPTED" ? "Following user" : "Follow request sent");

      // Invalidate both follow status and profile stats queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['followStatus', followingId] }),
        queryClient.invalidateQueries({ queryKey: ['profileStats'] }),
        queryClient.invalidateQueries({ queryKey: ['followers'] })
      ]);

      if (onSuccess) {
        onSuccess(true);
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnfollow = async () => {
    if (isLoading || !canPerformAction()) return;

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
        // Revert optimistic update on error
        setFollowState(prev => ({
          ...prev,
          isFollowing: true,
          hasPendingRequest: false
        }));
        throw new Error(data.error || "Failed to unfollow user");
      }

      toast.success("Successfully unfollowed user");

      // Invalidate both follow status and profile stats queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['followStatus', followingId] }),
        queryClient.invalidateQueries({ queryKey: ['profileStats'] }),
        queryClient.invalidateQueries({ queryKey: ['followers'] })
      ]);

      if (onSuccess) {
        onSuccess(false);
      }
    } catch (error) {
      toast.error("Failed to unfollow user");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (isLoading || !canPerformAction()) return;

    try {
      setIsLoading(true);
      
      // Optimistically update UI
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
          action: "unfollow"  // Use unfollow since we're canceling our own request
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // Revert optimistic update on error
        setFollowState(prev => ({
          ...prev,
          isFollowing: false,
          hasPendingRequest: true
        }));
        throw new Error(data.error || "Failed to cancel follow request");
      }

      // Invalidate both follow status and profile stats queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['followStatus', followingId] }),
        queryClient.invalidateQueries({ queryKey: ['profileStats'] }),
        queryClient.invalidateQueries({ queryKey: ['followers'] })
      ]);

      onSuccess?.(true);
      toast.success("Follow request cancelled");
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

  if (isLoadingStatus) {
    return (
      <div className={cn(
        "relative font-semibold transition-all duration-200 px-6 h-10 flex items-center justify-center",
        className
      )}>
        <CustomLoader size="sm" />
      </div>
    );
  }
  
  // Hide button if user is blocked
  if (isBlocked) {
    return null;
  }

  return (
    <Button
      onClick={handleClick}
      disabled={isLoading}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "relative font-semibold transition-all duration-200",
        variant === "profile" ? "px-4 h-9" : "px-6 h-10",
        "min-w-[120px] w-[120px]",
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
              followState.isFollowedByUser && "transition-all duration-300"
            ),
        className
      )}
    >
      <span className={cn(
        "flex items-center justify-center gap-1 w-full text-sm",
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
