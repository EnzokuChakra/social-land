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
import { useSessionAuth } from "@/lib/hooks/use-session-auth";
import FollowRequests from "./FollowRequests";

function NotificationsList({ 
  notifications: initialNotifications,
  followRequests: initialFollowRequests 
}: { 
  notifications: NotificationWithExtras[];
  followRequests: NotificationWithExtras[];
}) {
  const [notifications, setNotifications] = useState(() => {
    return initialNotifications;
  });
  const [followRequests, setFollowRequests] = useState(() => {
    return initialFollowRequests;
  });
  const [showFollowRequests, setShowFollowRequests] = useState(false);
  const [followingStates, setFollowingStates] = useState<{ [key: string]: boolean }>(() => {
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
  const { isAuthenticated, isLoading: isSessionLoading } = useSessionAuth();

  // Update notifications and following states when initialNotifications changes
  useEffect(() => {
    setNotifications(initialNotifications);
    setFollowRequests(initialFollowRequests);
    // Update following states when notifications change
    const newStates: { [key: string]: boolean } = {};
    initialNotifications.forEach(notification => {
      if (notification.sender) {
        newStates[notification.sender.id] = notification.sender.isFollowing ?? false;
      }
    });
    setFollowingStates(newStates);
  }, [initialNotifications, initialFollowRequests]);

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
      
      const response = await followUser({
        followingId: senderId,
        action
      });

      if (response.error) {
        setRequestStates(prev => ({ ...prev, [senderId]: "pending" }));
        toast.error(response.error);
        return;
      }

      // Update follow requests state
      setFollowRequests(prev => prev.filter(n => n.sender?.id !== senderId));
      
      // If this was the last follow request, close the follow requests view
      if (followRequests.length === 1) {
        setShowFollowRequests(false);
      }

      if (action === "delete") {
        // No need to add to notifications for delete action
      } else if (action === "accept") {
        const acceptedRequest = followRequests.find(r => r.sender?.id === senderId);
        if (acceptedRequest?.sender) {
          setNotifications(prev => [
            ...prev,
            {
              id: crypto.randomUUID(),
              type: "FOLLOW",
              sender: acceptedRequest.sender,
              createdAt: new Date(),
              userId: acceptedRequest.userId,
              sender_id: senderId,
              isRead: false,
              postId: null,
              reelId: null,
              storyId: null,
              metadata: null
            }
          ]);
        }
      }

      toast.success(
        action === "accept" 
          ? "Follow request accepted" 
          : "Follow request removed"
      );

      // Force a hard refresh to update all profile data
      window.location.reload();
    } catch (error) {
      console.error("Error handling follow request:", error);
      setRequestStates(prev => ({ ...prev, [senderId]: "pending" }));
      toast.error(`Failed to ${action} follow request`);
    }
  }, [followRequests]);

  const handleFollowRequestAction = useCallback((notificationId: string) => {
    setFollowRequests(prev => prev.filter(request => request.id !== notificationId));
  }, []);

  if (isSessionLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[200px] p-4">
        <div className="w-8 h-8 border-t-2 border-b-2 border-neutral-800 rounded-full animate-spin"></div>
        <p className="text-sm text-neutral-600 mt-4">Loading notifications...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-[200px] p-4">
        <p className="text-sm text-neutral-600">Please sign in to view notifications</p>
      </div>
    );
  }

  if (notifications.length === 0 && followRequests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[200px] p-4">
        <p className="text-sm text-neutral-600">No notifications yet</p>
      </div>
    );
  }

  if (showFollowRequests) {
    return (
      <FollowRequests
        requests={followRequests.map(request => ({
          id: request.id,
          sender: {
            id: request.sender?.id || '',
            username: request.sender?.username || null,
            name: null,
            image: request.sender?.image || null
          },
          createdAt: request.createdAt
        }))}
        onBack={() => setShowFollowRequests(false)}
        onAction={handleFollowRequestAction}
      />
    );
  }

  return (
    <div className="flex flex-col">
      {followRequests.length > 0 && (
        <button
          onClick={() => {
            setShowFollowRequests(true);
          }}
          className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors border-b border-neutral-200 dark:border-neutral-800"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-8 w-8">
                <AvatarImage src={followRequests[0].sender?.image || "/images/profile_placeholder.webp"} />
                <AvatarFallback>
                  <Image
                    src="/images/profile_placeholder.webp"
                    alt="Profile"
                    width={32}
                    height={32}
                    className="object-cover"
                  />
                </AvatarFallback>
              </Avatar>
              {followRequests.length > 1 && (
                <div className="absolute -right-2 -bottom-2 h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-xs text-white font-medium">+{followRequests.length - 1}</span>
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm">Follow Requests</span>
              <span className="text-xs text-neutral-500">
                Approve or ignore requests
              </span>
            </div>
          </div>
          <span className="text-sm font-medium">{followRequests.length}</span>
        </button>
      )}

      {notifications.filter(n => n.type !== "FOLLOW_REQUEST").map((notification) => {
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

            {getActionButton(
              notification,
              handleFollow,
              handleFollowRequest,
              followingStates,
              requestStates
            )}
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
    case "STORY_LIKE":
      const storyOthersCount = notification.metadata?.othersCount;
      if (storyOthersCount > 0) {
        return `and ${storyOthersCount} others liked your story`;
      }
      return "liked your story";
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
  
  const isFollowing = followingStates[notification.sender.id] || false;
  const hasPendingRequest = requestStates[notification.sender.id] === "PENDING";

  switch (notification.type) {
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
    case "STORY_LIKE":
      // Check if the story is expired (24 hours old)
      const storyCreatedAt = notification.story?.createdAt;
      const isExpired = storyCreatedAt && 
        new Date().getTime() - new Date(storyCreatedAt).getTime() > 24 * 60 * 60 * 1000;

      if (notification.story?.fileUrl && !isExpired) {
        return (
          <Link href={`/dashboard/s/${notification.story.id}`}>
            <div className="h-11 w-11 rounded border border-neutral-200 dark:border-neutral-700 overflow-hidden">
              <img 
                src={notification.story.fileUrl} 
                alt="Story" 
                className="h-full w-full object-cover"
              />
            </div>
          </Link>
        );
      }
      return null;
    case "FOLLOW_REQUEST":
      if (requestStates[notification.sender.id] === "accept") {
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
      if (requestStates[notification.sender.id] === "delete") return null;
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
    default:
      return null;
  }
}

export default memo(NotificationsList); 