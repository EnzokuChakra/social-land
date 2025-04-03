"use client";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { NotificationWithExtras } from "@/lib/definitions";
import Link from "next/link";
import { formatTimeToNow } from "@/lib/utils";
import { followUser } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, memo } from "react";
import FollowButton from "@/components/FollowButton";
import { cn } from "@/lib/utils";
import { toast } from "react-hot-toast";
import Image from "next/image";

function NotificationsList({ notifications: initialNotifications }: { notifications: NotificationWithExtras[] }) {
  const [notifications, setNotifications] = useState(() => initialNotifications);
  const [followingStates, setFollowingStates] = useState<{ [key: string]: boolean }>(() => {
    // Initialize following states from notifications
    const states: { [key: string]: boolean } = {};
    initialNotifications.forEach(notification => {
      if (notification.sender) {
        states[notification.sender.id] = notification.sender.isFollowing ?? false;
      }
    });
    return states;
  });
  const [requestStates, setRequestStates] = useState<{ [key: string]: string }>({});
  const router = useRouter();

  // Update notifications and following states when initialNotifications changes
  useEffect(() => {
    setNotifications(initialNotifications);
    // Update following states when notifications change
    const newStates: { [key: string]: boolean } = {};
    initialNotifications.forEach(notification => {
      if (notification.sender) {
        newStates[notification.sender.id] = notification.sender.isFollowing ?? false;
      }
    });
    setFollowingStates(newStates);
  }, [initialNotifications]);

  const handleFollow = useCallback(async (followingId: string, isFollowing: boolean) => {
    try {
      setFollowingStates(prev => ({ ...prev, [followingId]: !isFollowing }));
      const response = await followUser({ 
        followingId, 
        action: isFollowing ? "unfollow" : "follow" 
      });

      if (response.error) {
        setFollowingStates(prev => ({ ...prev, [followingId]: isFollowing }));
        return;
      }

      // Update notifications to reflect new follow state
      setNotifications(prev => prev.map(notification => {
        if (notification.sender?.id === followingId) {
          return {
            ...notification,
            sender: {
              ...notification.sender,
              isFollowing: !isFollowing,
              hasPendingRequest: response.status === "PENDING"
            }
          };
        }
        return notification;
      }));

      router.refresh();
    } catch (error) {
      setFollowingStates(prev => ({ ...prev, [followingId]: isFollowing }));
      console.error("Error following user:", error);
    }
  }, [router]);

  const handleFollowRequest = useCallback(async (senderId: string, action: "accept" | "delete") => {
    try {
      setRequestStates(prev => ({ ...prev, [senderId]: action }));
      
      const response = await fetch("/api/users/follow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          followerId: senderId,
          action
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setRequestStates(prev => ({ ...prev, [senderId]: "pending" }));
        toast.error(data.error || `Failed to ${action} follow request`);
        return;
      }

      if (action === "delete") {
        setNotifications(prev => prev.filter(n => 
          !(n.type === "FOLLOW_REQUEST" && n.sender?.id === senderId)
        ));
      } else if (action === "accept") {
        setNotifications(prev => prev.map(n => {
          if (n.sender && n.type === "FOLLOW_REQUEST" && n.sender.id === senderId) {
            return {
              ...n,
              type: "FOLLOW" as const,
              sender: {
                ...n.sender,
                isFollowing: true,
                hasPendingRequest: false
              }
            };
          }
          return n;
        }));

        setFollowingStates(prev => ({ ...prev, [senderId]: true }));
      }

      toast.success(
        action === "accept" 
          ? "Follow request accepted" 
          : "Follow request removed"
      );

      router.refresh();
    } catch (error) {
      console.error("Error handling follow request:", error);
      setRequestStates(prev => ({ ...prev, [senderId]: "pending" }));
      toast.error(`Failed to ${action} follow request`);
    }
  }, [router]);

  return (
    <div className="flex flex-col">
      {notifications.map((notification) => {
        if (!notification.sender) return null;
        
        return (
          <div 
            key={notification.id} 
            className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3 flex-1">
              <Link href={`/dashboard/${notification.sender.username}`}>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={notification.sender.image || "/images/profile_placeholder.webp"} alt={notification.sender.username || ""} />
                  <AvatarFallback>
                    <Image
                      src="/images/profile_placeholder.webp"
                      alt={notification.sender.username || ""}
                      width={32}
                      height={32}
                      className="object-cover"
                    />
                  </AvatarFallback>
                </Avatar>
              </Link>
              
              <div className="flex flex-col flex-1">
                <div className="flex items-center gap-1 flex-wrap">
                  <Link 
                    href={`/dashboard/${notification.sender.username}`}
                    className="font-semibold text-neutral-900 dark:text-white hover:text-neutral-500 dark:hover:text-white/90"
                  >
                    {notification.sender.username}
                  </Link>
                  <span className="text-sm text-neutral-600 dark:text-neutral-300">
                    {getNotificationText(notification)}
                  </span>
                </div>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {formatTimeToNow(notification.createdAt)}
                </span>
              </div>
            </div>

            {getActionButton(notification, handleFollow, handleFollowRequest, followingStates, requestStates)}
          </div>
        );
      })}
    </div>
  );
}

function getNotificationText(notification: NotificationWithExtras): string | null {
  switch (notification.type) {
    case "FOLLOW":
      return "started following you";
    case "LIKE":
      const othersCount = notification.metadata?.othersCount;
      if (othersCount > 0) {
        return `and ${othersCount} others liked your post`;
      }
      return "liked your post";
    case "COMMENT":
      return `commented: ${notification.comment?.text ?? ''}`;
    case "FOLLOW_REQUEST":
      return "requested to follow you";
    case "REPLY":
      return `replied to your comment: ${notification.comment?.text ?? ''}`;
    case "MENTION":
      return "mentioned you in a comment";
    case "TAG":
      return "tagged you in a post";
    default:
      return null;
  }
}

function getActionButton(
  notification: NotificationWithExtras,
  handleFollow: (followingId: string, isFollowing: boolean) => Promise<void>,
  handleFollowRequest: (senderId: string, action: "accept" | "delete") => Promise<void>,
  followingStates: { [key: string]: boolean },
  requestStates: { [key: string]: string }
) {
  if (!notification.sender) return null;
  
  const isFollowing = followingStates[notification.sender.id] ?? notification.sender.isFollowing ?? false;
  const requestState = requestStates[notification.sender.id];
  const hasPendingRequest = notification.sender.hasPendingRequest ?? false;

  // Don't show follow button if already following
  if (isFollowing && notification.type !== "FOLLOW_REQUEST") {
    return null;
  }

  switch (notification.type) {
    case "FOLLOW_REQUEST":
      if (requestState === "accept") {
        return (
          <FollowButton
            followingId={notification.sender.id}
            isFollowing={true}
            hasPendingRequest={false}
            isPrivate={false}
            className="text-xs"
          />
        );
      }
      if (requestState === "delete") return null;
      return (
        <div className="flex gap-2">
          <Button 
            size="sm" 
            className="bg-blue-500 hover:bg-blue-400 text-white px-4 font-semibold text-sm"
            onClick={() => handleFollowRequest(notification.sender!.id, "accept")}
          >
            Confirm
          </Button>
          <Button 
            size="sm" 
            variant="secondary" 
            className="px-4 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 text-neutral-900 dark:text-white font-semibold text-sm"
            onClick={() => handleFollowRequest(notification.sender!.id, "delete")}
          >
            Delete
          </Button>
        </div>
      );
    case "FOLLOW":
      // Only show follow button if not following and they're following us (Follow Back)
      if (!isFollowing && notification.sender.isFollowedByUser) {
        return (
          <FollowButton
            followingId={notification.sender.id}
            isFollowing={isFollowing}
            hasPendingRequest={hasPendingRequest}
            isPrivate={false}
            className={cn(
              "text-xs",
              isFollowing 
                ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white hover:bg-red-500/10 hover:text-red-500"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            )}
            onSuccess={(success: boolean) => {
              if (success) {
                handleFollow(notification.sender!.id, isFollowing);
              }
            }}
          />
        );
      }
      return null;
    case "LIKE":
    case "COMMENT":
      if (notification.post?.fileUrl) {
        return (
          <Link href={`/dashboard/p/${notification.post.id}`}>
            <div className="h-11 w-11 rounded border border-neutral-200 dark:border-neutral-700 overflow-hidden">
              <img 
                src={notification.post.fileUrl} 
                alt="Post" 
                className="h-full w-full object-cover"
              />
            </div>
          </Link>
        );
      }
      return null;
    default:
      return null;
  }
}

export default memo(NotificationsList); 