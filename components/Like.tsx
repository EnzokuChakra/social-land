"use client";

import { PostWithExtras } from "@/lib/definitions";
import { cn } from "@/lib/utils";
import type { Like } from "@/lib/definitions";
import { Heart } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import ActionIcon from "./ActionIcon";
import { likePost } from "@/lib/actions";
import { toast } from "sonner";
import { getSocket } from "@/lib/socket";

function LikeButton({
                      post,
                      userId,
                      onLikeUpdate,
                    }: {
  post: PostWithExtras;
  userId?: string;
  onLikeUpdate: (data: any) => void;
}) {
  const [lastClickTime, setLastClickTime] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);
  const session = useSession();
  const socket = getSocket();

  // Track if this post is liked by the current user (just a local state, no optimistic updates)
  const [isLikedByUser, setIsLikedByUser] = useState(() => 
    post.likes?.some((like) => like.user_id === session.data?.user?.id) || false
  );

  // Keep the like state in sync with the actual post data
  useEffect(() => {
    setIsLikedByUser(post.likes?.some((like) => like.user_id === session.data?.user?.id) || false);
  }, [post.likes, session.data?.user?.id]);

  // Filter socket events to only handle events from other users
  useEffect(() => {
    if (!socket || !session.data?.user?.id) return;
    
    const handleSocketLikeUpdate = (data: any) => {
      // Only process events from other users
      if (data.user_id !== session.data.user?.id) {
        onLikeUpdate(data);
      }
    };

    socket.on("likeUpdate", handleSocketLikeUpdate);
    
    return () => {
      socket.off("likeUpdate", handleSocketLikeUpdate);
    };
  }, [socket, onLikeUpdate, session.data?.user?.id]);

  const handleLikeClick = async () => {
    if (!session.data?.user) {
      toast.error("You must be logged in to like a post");
      return;
    }

    // Prevent double clicks
    if (isProcessing || processingRef.current) {
      return;
    }

    // Strict debounce for same-state clicks
    const now = Date.now();
    if (now - lastClickTime < 2500) {
      return;
    }
    
    // Set flags to prevent multiple clicks
    setIsProcessing(true);
    processingRef.current = true;
    setLastClickTime(now);

    try {
      // Immediately update UI state to provide feedback
      setIsLikedByUser(!isLikedByUser);
      
      // Make the API call
      const result =  await likePost({ postId: post.id });

      if (result) {
        const eventData = {
          post: result.post,
          likedBy: result.likedBy,
          unlike: result.unlike,
          action: result.unlike ? "unlike" : "like",
          user_id: session.data?.user?.id as string,
        };
        // Emit the event to notify other clients
        if (socket) {
          try {
            socket.emit("like", eventData);
          } catch (error) {
            toast.error("Failed to send like update. Please try again.");
          }
        } else {
          toast.error("Real-time updates are unavailable.");
        }

        // // Also update the local state
        // onLikeUpdate(eventData);
      }
      // Don't need to update anything here - the socket event or re-fetch will handle it
    } catch (error) {
      // Revert UI state on error
      setIsLikedByUser(isLikedByUser);
      console.error("Error liking post:", error);
      toast.error("Something went wrong");
    } finally {
      // Use a very long timeout to absolutely prevent duplicate clicks
      setTimeout(() => {
        setIsProcessing(false);
        processingRef.current = false;
      }, 3000);
    }
  };

  return (
    <ActionIcon
      onClick={handleLikeClick}
      disabled={isProcessing}
      data-post-id={post.id}
    >
      <Heart
        className={cn("h-6 w-6 transition-colors duration-200", {
          "text-red-500 fill-red-500": isLikedByUser,
        })}
      />
    </ActionIcon>
  );
}

export default LikeButton;