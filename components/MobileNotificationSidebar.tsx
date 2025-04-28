"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { NotificationWithExtras } from "@/lib/definitions";
import NotificationItem from "./NotificationItem";
import FollowRequests from "./FollowRequests";
import { ChevronLeftIcon } from "lucide-react";
import { Button } from "./ui/button";
import { useNotifications } from "@/lib/hooks/use-notifications";

interface MobileNotificationSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationWithExtras[];
}

export default function MobileNotificationSidebar({
  isOpen,
  onClose,
  notifications: initialNotifications,
}: MobileNotificationSidebarProps) {
  const [showFollowRequests, setShowFollowRequests] = useState(false);
  const [notifications, setNotifications] = useState<NotificationWithExtras[]>(initialNotifications);
  const { handleSidebarOpen } = useNotifications();

  useEffect(() => {
    setNotifications(initialNotifications);
  }, [initialNotifications]);

  useEffect(() => {
    if (isOpen) {
      console.log('[MOBILE_NOTIFICATION_SIDEBAR] Sidebar opened, marking all notifications as read');
      handleSidebarOpen();
    }
  }, [isOpen, handleSidebarOpen]);

  useEffect(() => {
    if (!isOpen) {
      setShowFollowRequests(false);
    }
  }, [isOpen]);

  const followRequests = notifications.filter(
    (n) => n.type === "FOLLOW_REQUEST" && n.sender
  );
  
  const regularNotifications = notifications.filter(
    (n) => n.type !== "FOLLOW_REQUEST"
  );

  const handleFollowRequestAction = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  return (
    <>
      <motion.div
        initial={false}
        animate={{ 
          width: isOpen ? "100%" : "0px",
          opacity: isOpen ? 1 : 0,
          x: isOpen ? 0 : -100
        }}
        transition={{ 
          type: "spring",
          width: {
            type: "spring",
            stiffness: 400,
            damping: 30
          },
          opacity: {
            duration: 0.15
          },
          x: {
            type: "spring",
            stiffness: 400,
            damping: 30
          }
        }}
        className={cn(
          "fixed inset-0 z-[200]",
          "bg-white dark:bg-black",
          "overflow-hidden",
          "will-change-[width,opacity,transform]"
        )}
        data-notification-sidebar
      >
        <motion.div 
          className="flex flex-col h-full"
          initial={false}
          animate={{
            x: showFollowRequests ? -397 : 0,
            opacity: isOpen ? 1 : 0
          }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 30,
            opacity: { duration: 0.2 }
          }}
        >
          {showFollowRequests ? (
            <FollowRequests
              requests={followRequests.map(n => ({
                id: n.id,
                sender: {
                  id: n.sender!.id,
                  username: n.sender!.username || '',
                  name: n.sender!.username || '',
                  image: n.sender!.image || null
                },
                createdAt: n.createdAt
              }))}
              onBack={() => setShowFollowRequests(false)}
              onAction={handleFollowRequestAction}
            />
          ) : (
            <>
              <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-800">
                <h1 className="text-xl font-bold">Notifications</h1>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="hover:bg-neutral-100 dark:hover:bg-neutral-800/50 rounded-full"
                >
                  <ChevronLeftIcon className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {followRequests.length > 0 && (
                  <button
                    onClick={() => setShowFollowRequests(true)}
                    className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Follow Requests</span>
                      <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                        {followRequests.length}
                      </span>
                    </div>
                    <ChevronLeftIcon className="w-5 h-5 rotate-180" />
                  </button>
                )}

                {regularNotifications.length === 0 && followRequests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] gap-2 p-6 text-neutral-500">
                    <p className="text-sm">No notifications yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {regularNotifications.map((notification) => (
                      <NotificationItem key={notification.id} notification={notification} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </motion.div>
      </motion.div>

      {isOpen && (
        <div
          className="fixed inset-0 z-[190] bg-black/20"
          onClick={onClose}
        />
      )}
    </>
  );
} 