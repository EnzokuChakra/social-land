"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { getSocket, authenticateSocket } from "@/lib/socket";
import { NotificationWithExtras } from "@/lib/definitions";
import { Socket } from "socket.io-client";

export function useNotifications() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<NotificationWithExtras[]>([]);
  const [followRequests, setFollowRequests] = useState<NotificationWithExtras[]>([]);
  const [hasUnread, setHasUnread] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const isSetupRef = useRef(false);
  const userIdRef = useRef<string | null>(null);
  const unreadCountRef = useRef(0);

  // Update hasUnread based on unread notifications
  useEffect(() => {
    const unreadCount = notifications.filter(n => !n.isRead).length;
    unreadCountRef.current = unreadCount;
    setHasUnread(unreadCount > 0);
  }, [notifications]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !session?.user?.id) return;

    const handleInitialNotifications = (data: {
      notifications: NotificationWithExtras[];
      followRequests: NotificationWithExtras[];
    }) => {
      setNotifications(data.notifications);
      setFollowRequests(data.followRequests);
      setHasUnread(data.notifications.some((n) => !n.isRead));
    };

    socketRef.current = socket;
    isSetupRef.current = true;
    userIdRef.current = session.user.id;

    // Authenticate socket
    authenticateSocket(session.user.id);

    // Request initial notifications
    socket.emit("getInitialNotifications", session.user.id);

    // Handle initial notifications
    socket.on("initialNotifications", handleInitialNotifications);

    // Handle new notification
    const handleNewNotification = (notification: NotificationWithExtras) => {
      setNotifications((prev) => [notification, ...prev]);
      setHasUnread(true);
    };

    // Handle notification read
    const handleNotificationRead = (notificationId: string) => {
      setNotifications((prev) => {
        const updatedNotifications = prev.map((n) =>
          n.id === notificationId ? { ...n, isRead: true } : n
        );
        
        // Check if there are any unread notifications left
        const hasAnyUnread = updatedNotifications.some(n => !n.isRead);
        if (!hasAnyUnread) {
          setHasUnread(false);
        }
        
        return updatedNotifications;
      });
    };

    // Handle follow requests cleared
    const handleFollowRequestsCleared = (data: { userId: string, action?: string }) => {
      // Clear all follow requests
      if (data.action === "clear") {
        setFollowRequests([]);
        // Also remove follow request notifications
        setNotifications(prev => 
          prev.filter(notification => notification.type !== "FOLLOW_REQUEST")
        );
      }
    };
    
    // Handle follow request accepted
    const handleFollowRequestAccepted = (data: { followingId: string, followerId: string }) => {
      console.log("Follow request accepted:", data);
      
      // Remove the specific follow request
      setFollowRequests(prev => 
        prev.filter(request => {
          if (!request.sender) return true;
          return request.sender.id !== data.followerId;
        })
      );
      
      // Also remove the corresponding notification
      setNotifications(prev => 
        prev.filter(notification => {
          if (notification.type !== "FOLLOW_REQUEST") return true;
          if (!notification.sender) return true;
          return notification.sender.id !== data.followerId;
        })
      );
      
      // Request a fresh list of notifications to ensure we're in sync
      socket.emit("getInitialNotifications", userIdRef.current);
    };

    // Set up event listeners
    socket.on("newNotification", handleNewNotification);
    socket.on("notificationRead", handleNotificationRead);
    socket.on("followRequestsCleared", handleFollowRequestsCleared);
    socket.on("followRequestAccepted", handleFollowRequestAccepted);

    // Cleanup function
    return () => {
      socket.off("initialNotifications", handleInitialNotifications);
      socket.off("newNotification", handleNewNotification);
      socket.off("notificationRead", handleNotificationRead);
      socket.off("followRequestsCleared", handleFollowRequestsCleared);
      socket.off("followRequestAccepted", handleFollowRequestAccepted);
      isSetupRef.current = false;
    };
  }, [session]);

  // Listen for custom hideFollowRequests event
  useEffect(() => {
    const handleHideFollowRequests = () => {
      setFollowRequests([]);
      // Also remove follow request notifications
      setNotifications(prev => 
        prev.filter(notification => notification.type !== "FOLLOW_REQUEST")
      );
    };
    
    // Listen for follow request accepted event (from other components)
    const handleFollowRequestAccepted = (event: CustomEvent) => {
      if (event.detail && event.detail.followerId) {
        console.log("Custom follow request accepted event:", event.detail);
        
        // Remove the specific follow request
        setFollowRequests(prev => 
          prev.filter(request => {
            if (!request.sender) return true;
            return request.sender.id !== event.detail.followerId;
          })
        );
        
        // Also remove the corresponding notification
        setNotifications(prev => 
          prev.filter(notification => {
            if (notification.type !== "FOLLOW_REQUEST") return true;
            if (!notification.sender) return true;
            return notification.sender.id !== event.detail.followerId;
          })
        );
      }
    };

    window.addEventListener('hideFollowRequests', handleHideFollowRequests);
    window.addEventListener('followRequestAccepted', handleFollowRequestAccepted as EventListener);

    return () => {
      window.removeEventListener('hideFollowRequests', handleHideFollowRequests);
      window.removeEventListener('followRequestAccepted', handleFollowRequestAccepted as EventListener);
    };
  }, []);

  const markAsRead = async (notificationId: string) => {
    const socket = getSocket();
    if (socket) {
      socket.emit("markNotificationRead", notificationId);
    }
  };

  const markAllAsRead = async () => {
    try {
      // Only proceed if there are unread notifications
      const hasUnreadNotifications = notifications.some(n => !n.isRead);
      if (!hasUnreadNotifications) {
        return;
      }

      const response = await fetch('/api/notifications/read-all', {
        method: 'POST',
      });
      
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setHasUnread(false);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Add a ref to track the last time we marked notifications as read
  const lastMarkAllAsReadRef = useRef<number>(0);
  const MARK_ALL_AS_READ_DEBOUNCE = 1000; // 1 second debounce

  const handleSidebarOpen = async () => {
    const now = Date.now();
    if (now - lastMarkAllAsReadRef.current < MARK_ALL_AS_READ_DEBOUNCE) {
      return;
    }
    
    lastMarkAllAsReadRef.current = now;
    await markAllAsRead();
  };
  
  // Function to refresh notifications
  const refreshNotifications = async () => {
    const socket = getSocket();
    if (socket && userIdRef.current) {
      socket.emit("getInitialNotifications", userIdRef.current);
    }
  };

  return {
    notifications,
    followRequests,
    hasUnread,
    setHasUnread,
    markAsRead,
    markAllAsRead,
    handleSidebarOpen,
    refreshNotifications,
  };
} 