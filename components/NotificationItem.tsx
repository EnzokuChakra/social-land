"use client";

import Link from "next/link";
import Image from "next/image";
import { NotificationWithExtras, NotificationType, FollowState } from "@/lib/definitions";
import { cn, formatTimeAgo } from "@/lib/utils";
import { useRouter } from "next/navigation";
import UserAvatar from "./UserAvatar";
import { Button } from "./ui/button";
import { useState, memo, useCallback, useEffect } from "react";
import { toast } from "sonner";
import FollowButton from "./FollowButton";

interface NotificationItemProps {
  notification: NotificationWithExtras;
}

function NotificationItem({ notification }: NotificationItemProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [followState, setFollowState] = useState<FollowState>(() => ({
    isFollowing: notification.sender?.isFollowing || false,
    hasPendingRequest: notification.sender?.hasPendingRequest || false,
    isFollowedByUser: notification.sender?.isFollowedByUser || false
  }));

  // Update follow state when notification changes
  useEffect(() => {
    if (notification.sender) {
      setFollowState({
        isFollowing: notification.sender.isFollowing || false,
        hasPendingRequest: notification.sender.hasPendingRequest || false,
        isFollowedByUser: notification.sender.isFollowedByUser || false
      });
    }
  }, [notification.sender]);

  const router = useRouter();

  const handleFollowBack = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isLoading) return;
    
    if (!notification.sender?.id) {
      toast.error("Cannot follow user: Invalid user ID");
      return;
    }
    
    try {
      setIsLoading(true);
      const response = await fetch("/api/users/follow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          followerId: notification.sender.id,
          action: followState.isFollowing ? "unfollow" : "follow"
        }),
      });

      const data = await response.json();
      
      // Update local state based on response
      setFollowState(prev => ({
        isFollowing: data.status === "ACCEPTED",
        hasPendingRequest: data.status === "PENDING",
        isFollowedByUser: prev.isFollowedByUser
      }));

      if (!response.ok) {
        if (data.status === "PENDING") {
          toast.success("Follow request pending");
          return;
        }
        throw new Error(data.error || "Failed to follow user");
      }

      toast.success(
        data.status === "PENDING"
          ? "Follow request sent" 
          : data.status === "ACCEPTED"
            ? "Successfully followed user"
            : "Successfully unfollowed user"
      );
      
      router.refresh();
    } catch (error) {
      console.error("Error following user:", error);
      toast.error(error instanceof Error ? error.message : "Failed to follow user");
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, notification.sender?.id, router, followState.isFollowing]);

  const getFollowButtonText = useCallback(() => {
    if (followState.hasPendingRequest) {
      return "Requested";
    }
    if (followState.isFollowing) {
      return isHovered ? "Unfollow" : "Following";
    }
    return followState.isFollowedByUser ? "Follow Back" : "Follow";
  }, [followState, isHovered]);

  const getNotificationText = useCallback(() => {
    switch (notification.type) {
      case "LIKE": {
        if (notification.metadata?.othersCount) {
          const othersCount = notification.metadata.othersCount as number;
          return othersCount === 1 
            ? "and 1 other liked your post"
            : `and ${othersCount} others liked your post`;
        }
        return "liked your post";
      }
      case "COMMENT": {
        if (notification.metadata?.othersCount) {
          const othersCount = notification.metadata.othersCount as number;
          return othersCount === 1 
            ? "and 1 other commented on your post"
            : `and ${othersCount} others commented on your post`;
        }
        return "commented on your post";
      }
      case "FOLLOW":
        return "started following you";
      case "FOLLOW_REQUEST":
        return "requested to follow you";
      case "REPLY":
        return "replied to your comment";
      case "MENTION":
        return "mentioned you in a comment";
      case "TAG":
        return "tagged you in a post";
      default:
        return null;
    }
  }, [notification.type, notification.metadata?.othersCount]);

  // Don't render notification if we don't have text for it
  if (!getNotificationText()) return null;

  const getNotificationLink = useCallback(() => {
    switch (notification.type) {
      case "FOLLOW":
      case "FOLLOW_REQUEST":
        return `/dashboard/${notification.sender?.username}`;
      case "LIKE":
      case "COMMENT":
      case "MENTION":
      case "TAG":
        return notification.postId ? `/dashboard/p/${notification.postId}` : "#";
      case "REPLY":
        return notification.postId ? `/dashboard/p/${notification.postId}#${notification.metadata?.commentId}` : "#";
      case "STORY_LIKE":
        // Check if the story is expired (24 hours old)
        const storyCreatedAt = notification.story?.createdAt;
        const isExpired = storyCreatedAt && 
          new Date().getTime() - new Date(storyCreatedAt).getTime() > 24 * 60 * 60 * 1000;
        
        // Return "#" if the story is expired, otherwise return the story link
        return !isExpired && notification.storyId ? `/dashboard/s/${notification.storyId}` : "#";
      default:
        return "#";
    }
  }, [notification.type, notification.sender?.username, notification.postId, notification.metadata?.commentId, notification.storyId, notification.story?.createdAt]);

  const handleNavigate = useCallback((e: React.MouseEvent, path: string) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(path);
  }, [router]);

  const handleMainClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    router.push(getNotificationLink());
  }, [router, getNotificationLink]);

  // Only show follow button if:
  // 1. Not following them already
  // 2. They are following us (Follow Back)
  const shouldShowFollowButton = useCallback(() => {
    if (!notification.sender) return false;
    
    const isFollowing = notification.sender.isFollowing || false;
    const isFollowedByUser = notification.sender.isFollowedByUser || false;
    
    // Show Follow Back button if they follow us and we don't follow them
    return isFollowedByUser && !isFollowing;
  }, [notification.sender]);

  return (
    <button
      onClick={handleMainClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "w-full flex items-center gap-3 py-3 px-4 transition-colors",
        "hover:bg-neutral-900/5 dark:hover:bg-neutral-800/50",
        "text-left border-b border-neutral-200 dark:border-neutral-800",
        "focus:outline-none focus:bg-neutral-100 dark:focus:bg-neutral-800/50"
      )}
    >
      <UserAvatar 
        user={notification.sender} 
        className="h-8 w-8 flex-none"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="font-medium text-sm">
            {notification.sender?.username}
          </span>
          <span className="text-sm text-neutral-500">
            {getNotificationText()}
          </span>
        </div>
        <span className="text-xs text-neutral-400">
          {formatTimeAgo(notification.createdAt)}
        </span>
      </div>
      {shouldShowFollowButton() && (
        <Button
          size="sm"
          variant="outline"
          className="ml-2"
          onClick={handleFollowBack}
          disabled={isLoading}
        >
          {getFollowButtonText()}
        </Button>
      )}
    </button>
  );
}

export default memo(NotificationItem); 