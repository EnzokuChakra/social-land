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
import { useState } from "react";
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
  const isMasterAdmin = session?.user?.role === "MASTER_ADMIN";
  const isBanned = userStatus === "BANNED";

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
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBlockUser = async () => {
    console.log("[Block User] Starting block process for user:", userId);
    if (isLoading) {
      console.log("[Block User] Operation already in progress, returning");
      return;
    }
    setIsLoading(true);
    console.log("[Block User] Loading state set to true");

    try {
      console.log("[Block User] Sending block request to API");
      const response = await fetch("/api/users/block", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      console.log("[Block User] API Response status:", response.status);
      console.log("[Block User] API Response headers:", Object.fromEntries(response.headers.entries()));
      
      // Get the raw response text first
      const responseText = await response.text();
      console.log("[Block User] Raw API Response:", responseText);
      
      if (!response.ok) {
        console.error("[Block User] API Error:", {
          status: response.status,
          statusText: response.statusText,
          responseText
        });
        throw new Error(`Failed to block user: ${response.status} ${response.statusText}`);
      }

      // Try to parse as JSON only if the response is not empty
      let data;
      if (responseText) {
        try {
          data = JSON.parse(responseText);
          console.log("[Block User] Parsed response data:", data);
        } catch (parseError) {
          console.warn("[Block User] Response is not valid JSON, using raw text");
          data = responseText;
        }
      }
      
      // Check if the response indicates unblocking
      if (responseText.includes("unblocked")) {
        toast.success("User unblocked successfully");
      } else {
        toast.success("User blocked successfully");
      }
      
      console.log("[Block User] Refreshing page");
      router.refresh();
    } catch (error) {
      console.error("[Block User] Error caught:", error);
      toast.error("Something went wrong");
    } finally {
      console.log("[Block User] Resetting loading state");
      setIsLoading(false);
    }
  };

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
                Block User
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