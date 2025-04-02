"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
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
  const isMasterAdmin = session?.user?.role === "MASTER_ADMIN";
  const isBanned = userStatus === "BANNED";
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const handleBanAction = async () => {
    try {
      const endpoint = isBanned ? `/api/admin/users/${userId}/unban` : `/api/admin/users/${userId}/ban`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.text();
        toast.error(error);
        return;
      }

      toast.success(isBanned ? "User unbanned successfully" : "User banned successfully");
      router.refresh();
    } catch (error) {
      console.error("Error managing user ban status:", error);
      toast.error(isBanned ? "Failed to unban user" : "Failed to ban user");
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
            <DropdownMenuItem
              className="text-red-500 cursor-pointer"
              onClick={() => setIsReportModalOpen(true)}
            >
              Report User
            </DropdownMenuItem>
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