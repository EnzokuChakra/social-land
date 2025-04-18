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
import { useStoryModal } from "@/hooks/use-story-modal";

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
  const storyModal = useStoryModal();

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
      case "FOLLOW":
        return "started following you";
      case "LIKE": {
        let metadata = notification.metadata;
        if (typeof metadata === 'string') {
          try {
            metadata = JSON.parse(metadata);
          } catch (e) {
            console.error('Error parsing notification metadata:', e);
            metadata = null;
          }
        }
        const othersCount = metadata?.othersCount as number | undefined;
        if (othersCount && othersCount > 0) {
          return `and ${othersCount} others liked your post`;
        }
        return "liked your post";
      }
      case "STORY_LIKE": {
        let metadata = notification.metadata;
        if (typeof metadata === 'string') {
          try {
            metadata = JSON.parse(metadata);
          } catch (e) {
            console.error('Error parsing notification metadata:', e);
            metadata = null;
          }
        }
        const storyOthersCount = metadata?.othersCount as number | undefined;
        if (storyOthersCount && storyOthersCount > 0) {
          return `and ${storyOthersCount} others liked your story`;
        }
        return "liked your story";
      }
      case "COMMENT": {
        let metadata = notification.metadata;
        if (typeof metadata === 'string') {
          try {
            metadata = JSON.parse(metadata);
          } catch (e) {
            console.error('Error parsing notification metadata:', e);
            metadata = null;
          }
        }
        const othersCount = metadata?.othersCount as number | undefined;
        if (othersCount && othersCount > 0) {
          return `and ${othersCount} others commented on your post`;
        }
        return "commented on your post";
      }
      case "FOLLOW_REQUEST":
        return "requested to follow you";
      case "REPLY":
        return "replied to your comment";
      case "MENTION":
        return "mentioned you in a comment";
      case "EVENT_CREATED": {
        let metadata = notification.metadata;
        if (typeof metadata === 'string') {
          try {
            metadata = JSON.parse(metadata);
          } catch (e) {
            console.error('Error parsing notification metadata:', e);
            metadata = null;
          }
        }
        const eventName = metadata?.eventName as string | undefined;
        return `A new event "${eventName || ''}" has been posted! Check it out!`;
      }
      case "COMMENT_LIKE": {
        let metadata = notification.metadata;
        if (typeof metadata === 'string') {
          try {
            metadata = JSON.parse(metadata);
          } catch (e) {
            console.error('Error parsing notification metadata:', e);
            metadata = null;
          }
        }
        const othersCount = metadata?.othersCount as number | undefined;
        if (othersCount && othersCount > 0) {
          return `and ${othersCount} others liked your comment`;
        }
        return "liked your comment";
      }
      case "TAG":
        return "tagged you in a post";
      default:
        return null;
    }
  }, [notification.type, notification.metadata]);

  // Don't render notification if we don't have text for it
  if (!getNotificationText()) return null;

  const getNotificationLink = useCallback(() => {
    switch (notification.type) {
      case "FOLLOW":
        return `/dashboard/${notification.sender?.username}`;
      case "LIKE":
      case "COMMENT":
      case "REPLY":
      case "MENTION":
      case "TAG":
        return `/dashboard/p/${notification.postId}`;
      case "STORY_LIKE":
        return `/dashboard/stories/${notification.storyId}`;
      case "COMMENT_LIKE":
        return `/dashboard/p/${notification.postId}#comment-${notification.comment?.id}`;
      case "EVENT_CREATED":
        return "/dashboard/events";
      default:
        return "#";
    }
  }, [notification]);

  const handleNavigate = useCallback((e: React.MouseEvent, path: string) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(path);
  }, [router]);

  const handleMainClick = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();

    if (notification.type === "STORY_LIKE") {
      try {
        // We need to fetch stories of the story owner, not the sender
        const storyOwnerId = notification.userId; // This is your ID since it's your story
        const response = await fetch(`/api/user-stories/${storyOwnerId}`);
        const { success, data: stories } = await response.json();
        
        if (success && stories && stories.length > 0) {
          // Find the story that was liked
          const storyIndex = stories.findIndex((story: { id: string }) => story.id === notification.storyId);
          if (storyIndex !== -1) {
            // Check if the story is expired using the actual story data
            const story = stories[storyIndex];
            const isExpired = new Date().getTime() - new Date(story.createdAt).getTime() > 24 * 60 * 60 * 1000;

            if (isExpired) {
              toast.error("Story has expired");
              return;
            }

            storyModal.setUserStories([{ userId: storyOwnerId, stories }]);
            storyModal.setUserId(storyOwnerId);
            storyModal.setCurrentUserIndex(0);
            storyModal.onOpen();
          } else {
            toast.error("Story not found");
          }
        } else {
          toast.error("Story has expired");
        }
      } catch (error) {
        console.error("Error fetching stories:", error);
        toast.error("Failed to load story");
      }
    } else {
      router.push(getNotificationLink());
    }
  }, [router, getNotificationLink, notification, storyModal]);

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
        "w-full flex items-start gap-3 py-3 px-4 transition-colors",
        "hover:bg-neutral-900/5 dark:hover:bg-neutral-800/50",
        "text-left border-b border-neutral-200 dark:border-neutral-800",
        "focus:outline-none focus:bg-neutral-100 dark:focus:bg-neutral-800/50"
      )}
    >
      <UserAvatar
        user={notification.sender ? {
          id: notification.sender.id,
          username: notification.sender.username,
          name: notification.sender.username,
          image: notification.sender.image
        } : null}
        className="h-8 w-8 flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap gap-1 items-baseline">
          <p className="text-sm line-clamp-2">
            <span className="font-medium">
              {notification.sender?.username}
            </span>
            {" "}
            <span className="text-neutral-500">
              {getNotificationText()}
            </span>
          </p>
        </div>
        <span className="text-xs text-neutral-400 block mt-0.5">
          {formatTimeAgo(notification.createdAt)}
        </span>
      </div>
      {shouldShowFollowButton() && (
        <Button
          size="sm"
          variant="outline"
          className="ml-2 flex-shrink-0"
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