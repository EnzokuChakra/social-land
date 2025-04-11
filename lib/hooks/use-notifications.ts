"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { NotificationWithExtras, NotificationType } from "@/lib/definitions";
import { getNotificationsClient } from '@/lib/client-actions';
import { JsonValue } from '@prisma/client/runtime/library';
import { useSessionAuth } from './use-session-auth';

interface NotificationWithUser {
  id: string;
  type: NotificationType;
  createdAt: Date;
  userId: string;
  sender_id: string;
  postId: string | null;
  isRead: boolean;
  reelId: string | null;
  storyId: string | null;
  metadata: JsonValue | null;
  sender: {
    id: string;
    username: string | null;
    image: string | null;
    verified?: boolean;
    isFollowing?: boolean;
    hasPendingRequest?: boolean;
    isFollowedByUser?: boolean;
    isPrivate?: boolean;
  };
  post?: {
    id: string;
    fileUrl: string;
  };
  comment?: {
    id: string;
    text: string;
  };
}

interface NotificationComment {
  id: string;
  body: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationWithUser[]>([]);
  const [followRequests, setFollowRequests] = useState<NotificationWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const { isAuthenticated, isLoading: isSessionLoading } = useSessionAuth();
  const lastFetchTime = useRef<number>(0);
  const notificationsRef = useRef<NotificationWithUser[]>([]);
  const followRequestsRef = useRef<NotificationWithUser[]>([]);
  const lastSeenNotificationsRef = useRef<Set<string>>(new Set());
  const CACHE_DURATION = 5000; // 5 seconds cache
  const POLLING_INTERVAL = 30000; // 30 seconds polling
  const isMounted = useRef(false);

  const transformNotification = (notification: NotificationWithUser): NotificationWithExtras => ({
    ...notification,
    comment: notification.comment ? {
      id: notification.comment.id,
      text: notification.comment.text || ""
    } : null,
    sender: notification.sender ? {
      id: notification.sender.id,
      username: notification.sender.username,
      image: notification.sender.image,
      isFollowing: notification.sender.isFollowing,
      hasPendingRequest: notification.sender.hasPendingRequest,
      isFollowedByUser: notification.sender.isFollowedByUser,
      isPrivate: notification.sender.isPrivate
    } : undefined,
    metadata: notification.metadata as Record<string, any> | null
  });

  // Check for new notifications
  const checkForNewNotifications = useCallback((newNotifications: NotificationWithUser[], newFollowRequests: NotificationWithUser[]) => {
    const hasNewNotifications = newNotifications.some(notification => {
      // Only check non-follow-request notifications
      return notification.type !== "FOLLOW_REQUEST" && 
             !lastSeenNotificationsRef.current.has(notification.id) && 
             !notification.isRead;
    });

    const hasNewFollowRequests = newFollowRequests.some(request => {
      // If we haven't seen this follow request before
      return !lastSeenNotificationsRef.current.has(request.id);
    });

    // Set unread state based on either regular notifications or follow requests
    setHasUnreadNotifications(hasNewNotifications || hasNewFollowRequests);
  }, []);

  const markNotificationsAsSeen = useCallback(() => {
    // Add all current notification IDs to the seen set
    notifications.forEach(notification => {
      lastSeenNotificationsRef.current.add(notification.id);
    });
    // Also mark follow requests as seen
    followRequests.forEach(request => {
      lastSeenNotificationsRef.current.add(request.id);
    });
    setHasUnreadNotifications(false);
  }, [notifications, followRequests]);

  const fetchNotifications = useCallback(async (force = false) => {
    if (!isAuthenticated || !isMounted.current) return;

    const now = Date.now();
    // Only fetch if cache is expired or force refresh
    if (!force && now - lastFetchTime.current < CACHE_DURATION) {
      return;
    }

    try {
      const data = await getNotificationsClient();
      
      // Only update if there are actual changes
      const hasNewNotifications = JSON.stringify(data.notifications) !== JSON.stringify(notificationsRef.current);
      const hasNewFollowRequests = JSON.stringify(data.followRequests) !== JSON.stringify(followRequestsRef.current);
      
      if (hasNewNotifications || hasNewFollowRequests) {
        notificationsRef.current = data.notifications;
        followRequestsRef.current = data.followRequests;
        setNotifications(data.notifications);
        setFollowRequests(data.followRequests);
        
        // Check for new notifications
        checkForNewNotifications(data.notifications, data.followRequests);
      }
      
      lastFetchTime.current = now;
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch notifications'));
      setIsLoading(false);
    }
  }, [isAuthenticated, checkForNewNotifications]);

  // Initial fetch
  useEffect(() => {
    if (isAuthenticated && !isSessionLoading) {
      isMounted.current = true;
      fetchNotifications(true);
    }
    return () => {
      isMounted.current = false;
    };
  }, [isAuthenticated, isSessionLoading, fetchNotifications]);

  // Set up polling for real-time updates with debounce
  useEffect(() => {
    if (!isAuthenticated) return;

    let timeoutId: NodeJS.Timeout;
    const poll = () => {
      timeoutId = setTimeout(() => {
        fetchNotifications();
        poll();
      }, POLLING_INTERVAL);
    };
    poll();

    return () => {
      clearTimeout(timeoutId);
    };
  }, [isAuthenticated, fetchNotifications]);

  // Force refresh function
  const refreshNotifications = useCallback(() => {
    lastFetchTime.current = 0;
    fetchNotifications(true);
  }, [fetchNotifications]);

  return {
    notifications,
    followRequests,
    isLoading: isSessionLoading || isLoading,
    error,
    hasUnreadNotifications,
    markNotificationsAsSeen,
    refreshNotifications
  };
} 