import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { followUser } from "@/lib/actions";
import UserAvatar from "./UserAvatar";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { useState } from "react";
import { getSocket } from "@/lib/socket";
import { useSession } from "next-auth/react";
import { useQueryClient } from '@tanstack/react-query';

type FollowRequestProps = {
  requests: {
    id: string;
    sender: {
      id: string;
      username: string | null;
      name: string | null;
      image: string | null;
      isPrivate: boolean;
    };
    createdAt: Date;
  }[];
  onBack: () => void;
  onAction: (notificationId: string) => void;
};

export default function FollowRequests({ requests: initialRequests, onBack, onAction }: FollowRequestProps) {
  const router = useRouter();
  const [requests, setRequests] = useState(initialRequests);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const handleAction = async (request: typeof requests[0], action: "accept" | "delete") => {
    try {
      // Add request ID to processing set
      setProcessingIds(prev => new Set(prev).add(request.id));

      // Call the API first before optimistically updating the UI
      const res = await followUser({
        followingId: request.sender.id,
        action: action,
        skipRevalidation: true
      });

      if (res.error) {
        toast.error(`Error: ${res.error}`);
        return;
      }

      // If successful, remove the request
      setRequests(prev => prev.filter(r => r.id !== request.id));
      onAction(request.id);
      
      // If accepting a follow request, dispatch a custom event for other components to listen for
      if (action === "accept") {
        const socket = getSocket();
        if (socket && session?.user?.id) {
          // Emit the event to the server
          socket.emit("followRequestAccepted", {
            followerId: request.sender.id,
            followingId: session.user.id
          });
        }
        
        // Also dispatch a browser event for components that might be listening
        const event = new CustomEvent('followRequestAccepted', { 
          detail: { 
            followerId: request.sender.id,
            followingId: session?.user?.id || "",
            isPrivate: request.sender.isPrivate
          }
        });
        window.dispatchEvent(event);
        
        // Force query invalidation
        queryClient.invalidateQueries({ queryKey: ['followStatus', request.sender.id] });
        queryClient.invalidateQueries({ queryKey: ['profileStats', request.sender.username] });
        queryClient.invalidateQueries({ queryKey: ['followers'] });
        queryClient.invalidateQueries({ queryKey: ['posts', request.sender.id] });
      }
      
      toast.success(res.message);
    } catch (error) {
      toast.error(`Something went wrong: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // Remove request ID from processing set
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(request.id);
        return next;
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="hover:bg-neutral-100 dark:hover:bg-neutral-800/50 rounded-full h-8 w-8"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-lg font-bold">Follow Requests</h1>
        </div>
      </div>

      {/* Requests List */}
      <div className="flex-1 overflow-y-auto">
        {requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 p-6 text-neutral-500">
            <p className="text-sm">No follow requests</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {requests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-3"
              >
                <div className="flex items-center gap-3">
                  <UserAvatar user={request.sender} />
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm">{request.sender.username}</span>
                    <span className="text-neutral-600 dark:text-neutral-400 text-xs">{request.sender.name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => handleAction(request, "accept")}
                    size="sm"
                    className="h-8 px-3 text-sm"
                    disabled={processingIds.has(request.id)}
                  >
                    Confirm
                  </Button>
                  <Button
                    onClick={() => handleAction(request, "delete")}
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-sm"
                    disabled={processingIds.has(request.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 