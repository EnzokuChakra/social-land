"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Flag, Ban, UserCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

interface ProfileMenuProps {
  userId: string;
  username: string;
  userStatus: "NORMAL" | "BANNED";
}

export default function ProfileMenu({ userId, username, userStatus }: ProfileMenuProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const isMasterAdmin = session?.user?.role === "MASTER_ADMIN";
  const isBanned = userStatus === "BANNED";

  const handleReport = async () => {
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userId,
          reason: "Inappropriate behavior",
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        toast.error(error);
        return;
      }

      toast.success("User reported successfully");
    } catch (error) {
      console.error("Error reporting user:", error);
      toast.error("Failed to report user");
    }
  };

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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {isMasterAdmin ? (
          <DropdownMenuItem onClick={handleBanAction} className={isBanned ? "text-green-600" : "text-red-600"}>
            {isBanned ? (
              <>
                <UserCheck className="mr-2 h-4 w-4" />
                Unban User
              </>
            ) : (
              <>
                <Ban className="mr-2 h-4 w-4" />
                Ban User
              </>
            )}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={handleReport}>
            <Flag className="mr-2 h-4 w-4" />
            Report
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 