"use client";

import { PostWithExtras } from "@/lib/definitions";
import { cn } from "@/lib/utils";
import type { Like } from "@/lib/definitions";
import { Heart } from "lucide-react";
import {useMemo, useEffect, useState, useTransition, useOptimistic} from "react";
import { useSession } from "next-auth/react";
import io from "socket.io-client";
import ActionIcon from "./ActionIcon";
import { likePost } from "@/lib/actions";
import { toast } from "sonner";
import {useSocket} from "@/hooks/use-socket";
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
  const [isPending, startTransition] = useTransition();
  const [lastClickTime, setLastClickTime] = useState<number>(0);
  const session = useSession();
  const socket = getSocket();

  const predicate = (like: Like) =>
      like.user_id === userId && like.postId === post.id;

  const optimisticLike = useMemo(
      () => ({
        id: crypto.randomUUID(),
        user_id: session.data?.user?.id as string,
        postId: post.id || null,
        reelId: null,
        storyId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      [session.data?.user?.id, post.id]
  );

  const [optimisticLikes, addOptimisticLike] = useOptimistic(post.likes, (state: Like[]) =>
    state.some(predicate)
      ? state.filter((like) => like.user_id !== userId)
      : [...state, optimisticLike]
  );

  const isLiked = useMemo(
      () => post.likes?.some((like) => like.user_id === session.data?.user?.id),
      [post.likes, session.data?.user?.id]
  );

  const handleLikeClick = async () => {
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTime;
    const COOLDOWN_PERIOD = 5000; // 5 seconds in milliseconds

    if (timeSinceLastClick < COOLDOWN_PERIOD) {
      const remainingTime = Math.ceil((COOLDOWN_PERIOD - timeSinceLastClick) / 1000);
      toast.error(`Please wait ${remainingTime} seconds before liking/unliking again`);
      return;
    }

    setLastClickTime(now);
    startTransition(async () => {
      addOptimisticLike(optimisticLike);
      const result = await likePost({ postId: post.id });

      console.log("result", result);

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
            console.log("[LikeButton] Emitted likeUpdate event:", eventData);
          } catch (error) {
            console.error("[LikeButton] Socket emit error:", error);
            toast.error("Failed to send like update. Please try again.");
          }
        } else {
          console.error("[LikeButton] Socket is undefined.");
          toast.error("Real-time updates are unavailable.");
        }
      }
    });
  };

  return (
    <ActionIcon disabled={isPending} onClick={handleLikeClick}>
      <Heart
        className={cn("h-6 w-6 transition-colors", {
          "text-red-500 fill-red-500": optimisticLikes.some(predicate),
        })}
      />
    </ActionIcon>
  );
}

export default LikeButton;