"use client";

import { useState, useEffect } from 'react';
import { NotificationWithExtras, NotificationType } from "@/lib/definitions";
import { getNotifications } from '@/lib/actions';
import { JsonValue } from '@prisma/client/runtime/library';

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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

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

    async function fetchNotifications() {
      try {
        const { notifications: newNotifications } = await getNotifications();
        if (mounted) {
          const transformedNotifications = newNotifications.map((notification) => ({
            ...notification,
            comment: notification.comment ? {
              id: notification.comment.id,
              text: notification.comment.text
            } : undefined
          })) as NotificationWithUser[];
          setNotifications(transformedNotifications);
          setIsLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
          setIsLoading(false);
        }
      }
    }

    fetchNotifications();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return {
    notifications,
    setNotifications,
    isLoading,
    error,
    refetch: async () => {
      setIsLoading(true);
      try {
        const { notifications: newNotifications } = await getNotifications();
        const transformedNotifications = newNotifications.map((notification) => ({
          ...notification,
          comment: notification.comment ? {
            id: notification.comment.id,
            text: notification.comment.text
          } : undefined
        })) as NotificationWithUser[];
        setNotifications(transformedNotifications);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    }
  };
} 