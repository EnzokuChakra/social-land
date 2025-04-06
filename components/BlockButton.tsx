"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface BlockButtonProps {
  userId: string;
  isBlocked: boolean;
  className?: string;
}

const BlockButton = ({
  userId,
  isBlocked,
  className
}: BlockButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleBlock = async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);

      const response = await fetch("/api/users/block", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          blockedId: userId,
          action: isBlocked ? "unblock" : "block"
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process block request");
      }

      toast.success(
        isBlocked 
          ? "User unblocked successfully" 
          : "User blocked successfully"
      );

      router.refresh();
    } catch (error) {
      toast.error(
        isBlocked
          ? "Failed to unblock user"
          : "Failed to block user"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleBlock}
      disabled={isLoading}
      className={cn(
        "w-full justify-start",
        isBlocked 
          ? "text-red-500 hover:text-red-600 hover:bg-red-500/10"
          : "text-red-500 hover:text-red-600 hover:bg-red-500/10",
        className
      )}
    >
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : isBlocked ? (
        "Unblock user"
      ) : (
        "Block user"
      )}
    </Button>
  );
};

export default BlockButton; 