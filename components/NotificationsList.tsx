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
import { getSocket } from "@/lib/socket";

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
  const socket = getSocket();

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

  // Handle socket events for follow requests
  useEffect(() => {
    if (!socket) return;

    const handleFollowRequestsCleared = (data: { userId: string }) => {
      // Clear follow requests for the specified user
      setFollowRequests(prev => prev.filter(request => request.sender?.id !== data.userId));
      
      // If this was the last follow request, close the follow requests view
      if (followRequests.length === 1) {
        setShowFollowRequests(false);
      }
    };

    socket.on("followRequestsCleared", handleFollowRequestsCleared);

    return () => {
      socket.off("followRequestsCleared", handleFollowRequestsCleared);
    };
  }, [socket, followRequests.length]);

  useEffect(() => {
    // Listen for hideFollowRequests event
    const handleHideFollowRequests = () => {
      setFollowRequests([]);
    };

    window.addEventListener('hideFollowRequests', handleHideFollowRequests);

    return () => {
      window.removeEventListener('hideFollowRequests', handleHideFollowRequests);
    };
  }, []);

  useEffect(() => {
    if (!socket?.connected) return;

    socket.on("followRequestsCleared", (data) => {
      if (data.action === "clear") {
        setFollowRequests([]);
      }
    });

    return () => {
      socket.off("followRequestsCleared");
    };
  }, [socket?.connected]);

  useEffect(() => {
    if (socket) {
      socket.on("followRequestDeleted", (data) => {
        console.log("[NotificationsList] Received followRequestDeleted event:", data);
        setNotifications(prev => prev.filter(notification => 
          !(notification.type === "FOLLOW_REQUEST" && 
            notification.sender_id === data.followerId && 
            notification.userId === data.followingId)
        ));
      });

      return () => {
        socket.off("followRequestDeleted");
      };
    }
  }, [socket]);

  const handleFollow = useCallback(async (followingId: string, isFollowing: boolean) => {
    try {
      setFollowingStates(prev => ({ ...prev, [followingId]: !isFollowing }));
      const response = await followUser({ 
        followingId, 
        action: isFollowing ? "unfollow" : "follow",
        skipRevalidation: true
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

      // Router refresh removed to prevent page refresh
    } catch (error) {
      setFollowingStates(prev => ({ ...prev, [followingId]: isFollowing }));
      console.error("Error following user:", error);
    }
  }, []);

  const handleFollowRequest = useCallback(async (senderId: string, action: "accept" | "delete") => {
    try {
      setRequestStates(prev => ({ ...prev, [senderId]: action }));
      
      const response = await followUser({
        followingId: senderId,
        action,
        skipRevalidation: true
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
              read: false,
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

      // Router refresh removed to prevent page refresh
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
              <Link href={`/dashboard/${notification.sender.username}`