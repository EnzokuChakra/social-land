"use client";

import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import ReportUserModal from "./modals/ReportUserModal";

interface ProfileMenuProps {
  userId: string;
  username: string;
  userStatus: string;
}

export default function ProfileMenu({ userId, username, userStatus }: ProfileMenuProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const isMasterAdmin = session?.user?.role === "MASTER_ADMIN";
  const isBanned = userStatus === "BANNED";

  useEffect(() => {
    const checkBlockStatus = async () => {
      try {
        const response = await fetch(`/api/users/block?userId=${userId}`);
        if (!response.ok) {
          throw new Error("Failed to check block status");
        }
        const data = await response.json();
        setIsBlocked(data.isBlocked);
      } catch (error) {
        console.error("Error checking block status:", error);
      }
    };

    if (session?.user?.id !== userId) {
      checkBlockStatus();
    }
  }, [userId, session?.user?.id, refreshCounter]);

  const handleBanAction = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const response = await fetch(`/api/admin/users/${userId}/${isBanned ? "unban" : "ban"}`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to perform ban action");
      }

      toast.success(isBanned ? "User unbanned successfully" : "User banned successfully");
      router.refresh();
      setRefreshCounter(prev => prev + 1);
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBlockUser = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const response = await fetch("/api/users/block", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error("Failed to perform block action");
      }

      const responseText = await response.text();
      const newBlockStatus = !responseText.includes("unblocked");
      setIsBlocked(newBlockStatus);
      toast.success(newBlockStatus ? "User blocked successfully" : "User unblocked successfully");
      
      // Dispatch events to notify components about the status changes
      // First, dispatch blockStatusChanged event
      const blockEvent = new CustomEvent('blockStatusChanged', { 
        detail: { userId, isBlocked: newBlockStatus } 
      });
      window.dispatchEvent(blockEvent);
      
      // Then dispatch follow status change event if blocking
      if (newBlockStatus) {
        const followStatusEvent = new CustomEvent('followStatusChanged', { 
          detail: { userId, isFollowing: false, hasPendingRequest: false } 
        });
        window.dispatchEvent(followStatusEvent);
      }
      
      router.refresh();
      setRefreshCounter(prev => prev + 1);
    } catch (error) {
      console.error("Error in block action:", error);
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleRouterChange = () => {
      setRefreshCounter(prev => prev + 1);
    };

    // Listen for block status changes from other components
    const handleBlockStatusChange = (event: CustomEvent) => {
      if (event.detail.userId === userId) {
        setIsBlocked(event.detail.isBlocked);
      }
    };

    window.addEventListener('focus', handleRouterChange);
    window.addEventListener('blockStatusChanged', handleBlockStatusChange as EventListener);
    
    return () => {
      window.removeEventListener('focus', handleRouterChange);
      window.removeEventListener('blockStatusChanged', handleBlockStatusChange as EventListener);
    };
  }, [userId]);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {session?.user?.id !== userId && (
            <>
              <DropdownMenuItem
                className="text-red-500 cursor-pointer"
                onClick={() => setIsReportModalOpen(true)}
              >
                Report User
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-500 cursor-pointer"
                onClick={handleBlockUser}
              >
                {isBlocked ? "Unblock User" : "Block User"}
              </DropdownMenuItem>
            </>
          )}
          {isMasterAdmin && session?.user?.id !== userId && (
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={handleBanAction}
            >
              {isBanned ? "Unban User" : "Ban User"}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ReportUserModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        userId={userId}
        username={username}
      />
    </>
  );
} 