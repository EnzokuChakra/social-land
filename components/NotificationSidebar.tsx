"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { NotificationWithExtras, NotificationType, FollowRequest } from "@/lib/definitions";
import NotificationItem from "./NotificationItem";
import FollowRequests from "./FollowRequests";
import { ChevronLeftIcon } from "lucide-react";
import { Button } from "./ui/button";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { HydrationSafeDiv } from "./HydrationSafeDiv";
import { useSocket } from "@/hooks/use-socket";
import { useSession } from "next-auth/react";
import { useNotifications } from "@/lib/hooks/use-notifications";
import { Notification } from "@/types";
import { useRouter } from "next/navigation";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface NotificationSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  notifications?: NotificationWithExtras[];
}

export default function NotificationSidebar({
  isOpen,
  onClose,
  notifications: initialNotifications = [],
}: NotificationSidebarProps) {
  const [showFollowRequests, setShowFollowRequests] = useState(false);
  const [notifications, setNotifications] = useState<NotificationWithExtras[]>(initialNotifications);
  const [displayedNotifications, setDisplayedNotifications] = useState<NotificationWithExtras[]>([]);
  const [page, setPage] = useState(1);
  const isMobile = useMediaQuery("(max-width: 768px)");
  const ITEMS_PER_PAGE = 10;
  const [animationCount, setAnimationCount] = useState(0);
  const isAnimatingRef = useRef(false);
  const lastIsOpenRef = useRef(isOpen);
  const socket = useSocket();
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const hasJoinedRoom = useRef(false);
  const userIdRef = useRef<string | null>(null);
  const isMounted = useRef(true);
  const router = useRouter();
  
  // Use the notifications hook
  const { 
    notifications: realtimeNotifications, 
    followRequests: realtimeFollowRequests,
    hasUnread,
    markAsRead
  } = useNotifications();

  // Sync notifications with realtime updates
  useEffect(() => {
    if (realtimeNotifications.length > 0) {
      setNotifications(realtimeNotifications.map(n => ({
        ...n,
        type: n.type as NotificationType,
        isRead: n.isRead,
        sender: n.sender ? {
          ...n.sender,
          id: n.sender.id,
          username: n.sender.username || null,
          image: n.sender.image,
          isFollowing: n.sender.isFollowing,
          hasPendingRequest: n.sender.hasPendingRequest,
          isFollowedByUser: n.sender.isFollowedByUser,
          isPrivate: n.sender.isPrivate
        } : undefined,
        metadata: n.metadata || null
      })));
    }
  }, [realtimeNotifications]);

  // Update displayed notifications when notifications change
  useEffect(() => {
    if (notifications.length > 0) {
      const start = 0;
      const end = page * ITEMS_PER_PAGE;
      setDisplayedNotifications(notifications.slice(start, end));
    }
  }, [notifications, page]);

  // Handle socket connection
  useEffect(() => {
    if (socket && session?.user?.id && !hasJoinedRoom.current) {
      // Store the user ID in a ref to avoid stale closures
      userIdRef.current = session.user.id;
      
      // Join user's notification room
      socket.emit("joinUserRoom", session.user.id);
      hasJoinedRoom.current = true;

      // Request initial notifications
      socket.emit("getInitialNotifications", session.user.id);

      return () => {
        // Leave user's notification room
        if (userIdRef.current) {
          socket.emit("leaveUserRoom", userIdRef.current);
          hasJoinedRoom.current = false;
        }
      };
    }
  }, [socket, session?.user?.id]);

  // Handle pagination
  const loadMore = useCallback(() => {
    setPage(prev => prev + 1);
  }, []);

  // Handle component lifecycle
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Handle isOpen changes
  useEffect(() => {
    if (isOpen !== lastIsOpenRef.current && !isAnimatingRef.current) {
      isAnimatingRef.current = true;
      lastIsOpenRef.current = isOpen;
    }
  }, [isOpen, animationCount]);

  // Handle closing the sidebar
  const handleClose = useCallback(() => {
    if (isMounted.current) {
      setShowFollowRequests(false);
      onClose();
    }
  }, [onClose]);

  // Update notifications when sidebar is opened
  useEffect(() => {
    if (isOpen && isMounted.current) {
      setNotifications(initialNotifications);
      setPage(1);
    }
  }, [isOpen, initialNotifications]);

  // Memoize filtered notifications
  const filteredNotifications = useMemo(() => 
    notifications.filter(n => n.type !== "FOLLOW_REQUEST"),
    [notifications]
  );

  // Memoize follow requests
  const uniqueFollowRequests = useMemo(() => 
    (realtimeFollowRequests || []).reduce((acc: typeof realtimeFollowRequests, request) => {
      if (!request?.sender) return acc;
      const existingIndex = acc.findIndex(req => req.sender?.id === request.sender?.id);
      if (existingIndex === -1) {
        acc.push(request);
      }
      return acc;
    }, [] as typeof realtimeFollowRequests),
    [realtimeFollowRequests]
  );

  const handleFollowRequestAction = useCallback((notificationId: string) => {
    if (isMounted.current) {
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    }
  }, []);

  // Mark notifications as read when sidebar is opened
  useEffect(() => {
    if (isOpen && isMounted.current) {
      // Mark all notifications as read regardless of hasUnread state
      notifications.forEach((notification) => {
        if (!notification.isRead) {
          markAsRead(notification.id);
        }
      });
    }
  }, [isOpen, notifications, markAsRead]);

  const handleNotificationClick = (notification: NotificationWithExtras) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    setIsOpen(false);
    
    // Navigate based on notification type
    if (notification.post) {
      router.push(`/posts/${notification.post.id}`);
    } else if (notification.story) {
      router.push(`/stories/${notification.story.id}`);
    }
  };

  const getNotificationMessage = (notification: NotificationWithExtras): string => {
    switch (notification.type as NotificationType) {
      case "FOLLOW":
        return "started following you";
      case "LIKE":
        const othersCount = notification.metadata?.othersCount as number;
        if (othersCount && othersCount > 0) {
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
      case "STORY_LIKE":
        const storyOthersCount = notification.metadata?.othersCount as number;
        if (storyOthersCount && storyOthersCount > 0) {
          return `and ${storyOthersCount} others liked your story`;
        }
        return "liked your story";
      case "COMMENT_LIKE":
        return "liked your comment";
      case "EVENT_CREATED":
        const eventName = notification.metadata?.eventName as string;
        return `A new event "${eventName || ''}" has been posted!`;
      default:
        return "";
    }
  };

  const handleFollowRequest = async (requestId: string, accept: boolean) => {
    // TODO: Implement follow request handling
    console.log("Handle follow request", requestId, accept);
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className={cn(
          "fixed z-50",
          isMobile ? "inset-0" : "inset-y-0 left-[72px]",
          "border-r border-neutral-200 dark:border-neutral-800",
          "bg-white dark:bg-black",
          "shadow-sm dark:shadow-neutral-800/10",
          "overflow-hidden",
          "transform-gpu",
          "backface-visibility-hidden",
          "will-change-transform",
          "transition-all duration-200 ease-out",
          isOpen 
            ? "w-[397px] opacity-100 translate-x-0" 
            : "w-0 opacity-0 -translate-x-full pointer-events-none"
        )}
        data-notification-sidebar
      >
        <HydrationSafeDiv className="h-full flex flex-col">
          <HydrationSafeDiv className="p-4 border-b border-neutral-200 dark:border-neutral-800">
            <HydrationSafeDiv className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Notifications</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="hover:bg-neutral-100 dark:hover:bg-neutral-800/50 rounded-full"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </Button>
            </HydrationSafeDiv>
            {uniqueFollowRequests.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setShowFollowRequests(true)}
                className="w-full justify-between"
              >
                Follow Requests
                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                  {uniqueFollowRequests.length}
                </span>
              </Button>
            )}
          </HydrationSafeDiv>

          <HydrationSafeDiv className="flex-1 overflow-y-auto">
            {showFollowRequests ? (
              <FollowRequests
                requests={uniqueFollowRequests.map(n => ({
                  id: n.id,
                  sender: {
                    id: n.sender?.id || n.sender_id || "",
                    username: n.sender?.username || null,
                    name: n.sender?.username || null,
                    image: n.sender?.image || null
                  },
                  createdAt: n.createdAt
                }))}
                onBack={() => setShowFollowRequests(false)}
                onAction={handleFollowRequestAction}
              />
            ) : (
              <HydrationSafeDiv className="space-y-4 p-4">
                {displayedNotifications.length === 0 ? (
                  <HydrationSafeDiv className="flex flex-col items-center justify-center h-[200px]">
                    <p className="text-sm text-neutral-500">No notifications yet</p>
                  </HydrationSafeDiv>
                ) : (
                  <>
                    {displayedNotifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                      />
                    ))}
                    {notifications.length > displayedNotifications.length && (
                      <HydrationSafeDiv className="flex justify-center pt-4">
                        <Button
                          variant="outline"
                          onClick={loadMore}
                          className="w-full"
                        >
                          Load More Notifications
                        </Button>
                      </HydrationSafeDiv>
                    )}
                  </>
                )}
              </HydrationSafeDiv>
            )}
          </HydrationSafeDiv>
        </HydrationSafeDiv>
      </div>

      <div
        className={cn(
          "fixed z-40 bg-black/20",
          isMobile ? "inset-0" : "inset-y-0 left-[72px] right-0",
          "transition-opacity duration-200 ease-out",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />
    </>
  );
} 