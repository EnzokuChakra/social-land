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
  const [displayedNotifications, setDisplayedNotifications] = useState<NotificationWithExtras[]>([]);
  const [page, setPage] = useState(1);
  const isMobile = useMediaQuery("(max-width: 768px)");
  const ITEMS_PER_PAGE = 10;

  // Handle closing the sidebar
  const handleClose = () => {
    setShowFollowRequests(false);
    onClose();
  };

  useEffect(() => {
    setNotifications(initialNotifications);
    setPage(1); // Reset page when notifications change
  }, [initialNotifications]);

  useEffect(() => {
    // Update displayed notifications when page or notifications change
    const startIndex = 0;
    const endIndex = page * ITEMS_PER_PAGE;
    // Filter out FOLLOW_REQUEST notifications from the main list
    const filteredNotifications = notifications.filter(n => n.type !== "FOLLOW_REQUEST");
    setDisplayedNotifications(filteredNotifications.slice(startIndex, endIndex));
  }, [notifications, page]);

  useEffect(() => {
    if (!isOpen) {
      setShowFollowRequests(false);
    }
  }, [isOpen]);

  const followRequests = notifications.filter(n => n.type === "FOLLOW_REQUEST");
  
  // Group follow requests by sender to eliminate duplicates
  const uniqueFollowRequests = followRequests.reduce((acc, request) => {
    if (!request.sender) return acc;
    
    // Check if we already have a request from this sender
    const existingIndex = acc.findIndex(req => req.sender?.id === request.sender?.id);
    
    // If not found, add it to the accumulator
    if (existingIndex === -1) {
      acc.push(request);
    } 
    
    return acc;
  }, [] as typeof followRequests);
  
  const otherNotifications = notifications.filter(n => n.type !== "FOLLOW_REQUEST");

  const handleFollowRequestAction = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const handleLoadMore = () => {
    setPage(prev => prev + 1);
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
          type: "tween",
          duration: 0.2,
          ease: "easeInOut"
        }}
        className={cn(
          "fixed z-50",
          isMobile ? "inset-0" : "inset-y-0 left-[72px]",
          "border-r border-neutral-200 dark:border-neutral-800",
          "bg-white dark:bg-black",
          "shadow-sm dark:shadow-neutral-800/10",
          "overflow-hidden",
          "transform-gpu",
          "backface-visibility-hidden",
          "will-change-transform"
        )}
        data-notification-sidebar
      >
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Notifications</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="hover:bg-neutral-100 dark:hover:bg-neutral-800/50 rounded-full"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </Button>
            </div>
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
          </div>

          <div className="flex-1 overflow-y-auto">
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
              <div className="space-y-4 p-4">
                {displayedNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[200px]">
                    <p className="text-sm text-neutral-500">No notifications yet</p>
                  </div>
                ) : (
                  <>
                    {displayedNotifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                      />
                    ))}
                    {notifications.length > displayedNotifications.length && (
                      <div className="flex justify-center pt-4">
                        <Button
                          variant="outline"
                          onClick={handleLoadMore}
                          className="w-full"
                        >
                          Load More Notifications
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {isOpen && (
        <div
          className={cn(
            "fixed z-40 bg-black/20",
            isMobile ? "inset-0" : "inset-y-0 left-[72px] right-0"
          )}
          onClick={onClose}
        />
      )}
    </>
  );
} 