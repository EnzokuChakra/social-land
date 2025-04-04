"use client";

import { useState, useEffect } from 'react';
import { NotificationWithExtras, NotificationType } from "@/lib/definitions";
import { getNotifications } from '@/lib/actions';
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
  const { isAuthenticated, isLoading: isSessionLoading } = useSessionAuth();

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

  useEffect(() => {
    let mounted = true;
    let pollInterval: NodeJS.Timeout;

    async function fetchNotifications() {
      if (!isAuthenticated) {
        return;
      }

      try {
        const { notifications: newNotifications, followRequests: newFollowRequests } = await getNotifications();
        
        if (mounted) {
          setFollowRequests(newFollowRequests);
          setNotifications(newNotifications);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          console.error('[useNotifications] Error fetching:', err);
          setError(err as Error);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    // Only start fetching if authenticated and session loading is complete
    if (isAuthenticated && !isSessionLoading) {
      fetchNotifications();
      // Poll for new notifications every 30 seconds
      pollInterval = setInterval(fetchNotifications, 30000);
    }

    return () => {
      mounted = false;
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [isAuthenticated, isSessionLoading]);

  const refetch = async () => {
    if (!isAuthenticated) {
      return;
    }

    setIsLoading(true);
    try {
      const { notifications: newNotifications, followRequests: newFollowRequests } = await getNotifications();

      setFollowRequests(newFollowRequests);
      setNotifications(newNotifications);
      setError(null);
    } catch (err) {
      console.error('[useNotifications] Error refetching:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    notifications,
    followRequests,
    setNotifications,
    setFollowRequests,
    isLoading: isSessionLoading || isLoading,
    error,
    refetch
  };
} 