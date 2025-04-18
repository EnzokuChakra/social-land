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

    // Set up event listeners
    socket.on("newNotification", handleNewNotification);
    socket.on("notificationRead", handleNotificationRead);
    socket.on("followRequestsCleared", handleFollowRequestsCleared);

    // Cleanup function
    return () => {
      socket.off("initialNotifications", handleInitialNotifications);
      socket.off("newNotification", handleNewNotification);
      socket.off("notificationRead", handleNotificationRead);
      socket.off("followRequestsCleared", handleFollowRequestsCleared);
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

    window.addEventListener('hideFollowRequests', handleHideFollowRequests);

    return () => {
      window.removeEventListener('hideFollowRequests', handleHideFollowRequests);
    };
  }, []);

  const markAsRead = async (notificationId: string) => {
    const socket = getSocket();
    if (socket) {
      socket.emit("markNotificationRead", notificationId);
    }
  };

  return {
    notifications,
    followRequests,
    hasUnread,
    setHasUnread,
    markAsRead,
  };
} 