"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { NotificationWithExtras } from "@/lib/definitions";
import NotificationItem from "./NotificationItem";
import FollowRequests from "./FollowRequests";
import { ChevronLeftIcon } from "lucide-react";
import { Button } from "./ui/button";
import { useMediaQuery } from "@/lib/hooks/use-media-query";

interface NotificationSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationWithExtras[];
}

export default function NotificationSidebar({
  isOpen,
  onClose,
  notifications: initialNotifications,
}: NotificationSidebarProps) {
  const [showFollowRequests, setShowFollowRequests] = useState(false);
  const [notifications, setNotifications] = useState<NotificationWithExtras[]>(initialNotifications);
  const isMobile = useMediaQuery("(max-width: 768px)");

  useEffect(() => {
    setNotifications(initialNotifications);
  }, [initialNotifications]);

  const followRequests = notifications.filter(n => n.type === "FOLLOW" && !n.isRead);
  const otherNotifications = notifications.filter(n => n.type !== "FOLLOW" || n.isRead);

  const handleFollowRequestAction = (notificationId: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === notificationId ? { ...n, isRead: true } : n
    ));
  };

  return (
    <>
      <motion.div
        initial={false}
        animate={{ 
          width: isOpen ? (isMobile ? "100%" : "397px") : "0px",
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
            duration: 0.2
          },
          x: {
            type: "spring",
            stiffness: 400,
            damping: 30
          }
        }}
        className={cn(
          "fixed z-50",
          isMobile ? "inset-0" : "inset-y-0 left-[240px]",
          "border-r border-neutral-200 dark:border-neutral-800",
          "bg-white dark:bg-black",
          "shadow-sm dark:shadow-neutral-800/10",
          "overflow-hidden",
          "will-change-[width,opacity,transform]"
        )}
        data-notification-sidebar
      >
        <div className="sticky top-0 z-10 bg-white dark:bg-black border-b border-neutral-200 dark:border-neutral-800 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Notifications</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="hover:bg-neutral-100 dark:hover:bg-neutral-800/50 rounded-full"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </Button>
          </div>
          {followRequests.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setShowFollowRequests(true)}
              className="w-full justify-between"
            >
              Follow Requests
              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                {followRequests.length}
              </span>
            </Button>
          )}
        </div>

        <div className="p-4">
          {showFollowRequests ? (
            <FollowRequests
              requests={followRequests.map(n => ({
                id: n.id,
                sender: {
                  id: n.sender!.id,
                  username: n.sender!.username,
                  name: n.sender!.username,
                  image: n.sender!.image
                },
                createdAt: n.createdAt
              }))}
              onBack={() => setShowFollowRequests(false)}
              onAction={handleFollowRequestAction}
            />
          ) : (
            <div className="space-y-4">
              {otherNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                />
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {isOpen && (
        <div
          className={cn(
            "fixed z-40 bg-black/20",
            isMobile ? "inset-0" : "inset-y-0 left-[240px] right-0"
          )}
          onClick={onClose}
        />
      )}
    </>
  );
} 