"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface UnblockButtonProps {
  userId: string;
}

export default function UnblockButton({ userId }: UnblockButtonProps) {
  const router = useRouter();

  const handleUnblock = async () => {
    try {
      const response = await fetch("/api/users/block", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error("Failed to unblock user");
      }

      const data = await response.text();
      if (data.includes("unblocked")) {
        toast.success("User unblocked successfully");
        
        // Dispatch custom event to notify other components of the block status change
        const blockEvent = new CustomEvent('blockStatusChanged', { 
          detail: { userId, isBlocked: false } 
        });
        window.dispatchEvent(blockEvent);
        
        // Also dispatch event to update follow button if it exists
        const followEvent = new CustomEvent('followStatusRefresh', { 
          detail: { userId } 
        });
        window.dispatchEvent(followEvent);
        
        router.refresh();
      }
    } catch (error) {
      toast.error("Failed to unblock user");
    }
  };

  return (
    <Button
      variant="secondary"
      className="mt-4"
      onClick={handleUnblock}
    >
      Unblock User
    </Button>
  );
} 