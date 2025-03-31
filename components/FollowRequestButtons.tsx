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
    // Simple console log to verify function is called
    console.log("handleAction called with:", { action, followerId });
    
    if (isLoading) return;

    try {
      setIsLoading(true);
      
      // Log detailed information about the request
      console.log('FollowRequestButtons - Starting action:', {
        action,
        followerId,
        sessionUser: session?.user,
        timestamp: new Date().toISOString()
      });

      // Log the request payload
      const requestPayload = {
        followerId,
        action
      };
      console.log('FollowRequestButtons - Request payload:', requestPayload);

      alert('About to make API request'); // Add an alert to verify code execution

      const response = await fetch("/api/users/follow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload),
      });

      const data = await response.json();
      
      // Log detailed response information
      console.log('FollowRequestButtons - Response details:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data,
        timestamp: new Date().toISOString()
      });

      if (!response.ok) {
        console.log('FollowRequestButtons - Error response:', {
          error: data.error,
          status: response.status,
          timestamp: new Date().toISOString()
        });
        throw new Error(data.error || `Failed to ${action} follow request`);
      }

      console.log('FollowRequestButtons - Success:', {
        action,
        result: data,
        timestamp: new Date().toISOString()
      });

      toast.success(
        action === "accept" 
          ? "Follow request accepted" 
          : "Follow request removed"
      );
      
      // Log before reload
      console.log('FollowRequestButtons - Triggering page reload');
      window.location.reload();
    } catch (error) {
      console.error('FollowRequestButtons - Error details:', {
        action,
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
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
        onClick={() => {
          console.log('Button clicked!'); // Simple console.log
          alert('Button clicked!'); // Alert to verify click
          handleAction("accept");
        }}
        disabled={isLoading}
        className="bg-blue-500 hover:bg-blue-600 text-white font-semibold"
      >
        Confirm
      </Button>
      <Button
        onClick={() => handleAction("delete")}
        disabled={isLoading}
        variant="ghost"
        className="hover:bg-red-500/10 hover:text-red-500"
      >
        Delete
      </Button>
    </div>
  );
} 