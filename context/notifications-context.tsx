"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import io from 'socket.io-client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useDebounce } from '@/hooks/useDebounce';

interface Notification {
  id: string;
  type: string;
  message: string;
  createdAt: Date;
  read: boolean;
  userId?: string;
  followerId?: string;
}

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  refreshNotifications: () => Promise<void>;
  handleSidebarOpen: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

// Delay for debouncing notification events
const NOTIFICATION_DEBOUNCE_TIME = 300; 

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [socket, setSocket] = useState<any>(null);
  const router = useRouter();
  const eventTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});
  
  // Track last event time to prevent rapid firing of the same event
  const lastEventTimesRef = useRef<Record<string, number>>({});

  // Function to fetch notifications from the API
  const fetchNotifications = async () => {
    if (!session?.user?.id) return;
    
    try {
      const response = await fetch('/api/notifications');
      if (response.ok) {
        const data = await response.json();
        const mappedNotifications = (data.notifications || []).map((n: any) => ({
          ...n,
          read: n.isRead
        }));
        setNotifications(mappedNotifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Debounced function to handle notification updates
  const handleNotificationEvent = useCallback((eventName: string, handler: () => void) => {
    const now = Date.now();
    const lastEventTime = lastEventTimesRef.current[eventName] || 0;
    
    // If the same event fired too recently, skip it
    if (now - lastEventTime < NOTIFICATION_DEBOUNCE_TIME) {
      return;
    }
    
    // Update last event time
    lastEventTimesRef.current[eventName] = now;
    
    // Clear any existing timeout for this event
    if (eventTimeoutsRef.current[eventName]) {
      clearTimeout(eventTimeoutsRef.current[eventName]);
    }
    
    // Set a new timeout
    eventTimeoutsRef.current[eventName] = setTimeout(() => {
      handler();
      delete eventTimeoutsRef.current[eventName];
    }, NOTIFICATION_DEBOUNCE_TIME);
  }, []);

  // Initial fetch of notifications
  useEffect(() => {
    if (session?.user?.id) {
      fetchNotifications();
    }
  }, [session]);

  useEffect(() => {
    if (session?.user?.id) {
      // Initialize socket connection
      const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5002", {
        auth: {
          token: session.user.id
        },
        transports: ['websocket']
      });

      // Handle socket events
      newSocket.on('connect', () => {
        // Socket connected, no need to log
      });

      newSocket.on('notification', (notification: Notification) => {
        handleNotificationEvent('notification', () => {
          setNotifications(prev => {
            const updated = [notification, ...prev];
            return updated;
          });
          toast(notification.message);
        });
      });

      newSocket.on('notifications', (notificationsList: Notification[]) => {
        handleNotificationEvent('notifications', () => {
          setNotifications(notificationsList);
        });
      });

      // Handle follow request accepted event
      newSocket.on('followRequestAccepted', (data: { followingId: string, followerId: string }) => {
        handleNotificationEvent('followRequestAccepted', () => {
          // Remove the follow request notification from the list
          setNotifications(prev => 
            prev.filter(notification => 
              !(notification.type === 'FOLLOW_REQUEST' && 
                notification.followerId === data.followerId)
            )
          );
          
          // Also trigger a custom event for other components
          const event = new CustomEvent('followRequestAccepted', { detail: data });
          window.dispatchEvent(event);
          
          // Refresh notifications to ensure we have the latest state
          fetchNotifications();
        });
      });

      // Handle follow status changed events with debouncing
      newSocket.on('followStatusChanged', (data: any) => {
        handleNotificationEvent('followStatusChanged', () => {
          // Dispatch a custom event that other components can listen for
          const event = new CustomEvent('followStatusChanged', { detail: data });
          window.dispatchEvent(event);
          
          // Refresh notifications
          fetchNotifications();
        });
      });

      // Handle ban event
      newSocket.on('userBanned', (data: { userId: string }) => {
        if (data.userId === session.user.id) {
          // Redirect to banned page - no need to debounce this critical event
          router.push('/banned');
        }
      });

      setSocket(newSocket);

      return () => {
        // Clear all pending timeouts
        Object.values(eventTimeoutsRef.current).forEach(timeout => {
          clearTimeout(timeout);
        });
        
        newSocket.disconnect();
      };
    }
  }, [session, router, handleNotificationEvent]);

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        setNotifications(prev => {
          const updated = prev.map(notification =>
            notification.id === id ? { ...notification, read: true } : notification
          );
          return updated;
        });
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'POST',
      });

      if (response.ok) {
        setNotifications(prev => {
          const updated = prev.map(notification => ({ ...notification, read: true }));
          return updated;
        });
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };
  
  // Function to refresh notifications
  const refreshNotifications = async () => {
    await fetchNotifications();
  };

  // Add a function to handle sidebar open
  const handleSidebarOpen = () => {
    markAllAsRead();
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        refreshNotifications,
        handleSidebarOpen
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
} 