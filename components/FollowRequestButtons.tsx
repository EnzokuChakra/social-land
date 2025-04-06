import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

interface FollowRequestButtonsProps {
  followerId: string;
}

export default function FollowRequestButtons({
  followerId,
}: FollowRequestButtonsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const { data: session } = useSession();

  const handleAction = async (action: "accept" | "delete") => {
    if (isLoading) return;

    try {
      setIsLoading(true);
      
      const response = await fetch("/api/users/follow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          followerId,
          action
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action} follow request`);
      }

      toast.success(
        action === "accept" 
          ? "Follow request accepted" 
          : "Follow request removed"
      );
      
      window.location.reload();
    } catch (error) {
      console.error("[FOLLOW_REQUEST_BUTTONS] Error:", {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
      toast.error(error instanceof Error ? error.message : `Failed to ${action} follow request`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={() => handleAction("accept")}
        disabled={isLoading}
        className="bg-blue-500 hover:bg-blue-600 text-white font-semibold min-w-[104px]"
      >
        Confirm
      </Button>
      <Button
        onClick={() => handleAction("delete")}
        disabled={isLoading}
        variant="ghost"
        className="hover:bg-red-500/10 hover:text-red-500 min-w-[104px]"
      >
        Delete
      </Button>
    </div>
  );
} 