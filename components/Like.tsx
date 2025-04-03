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
  const session = useSession();
    const socket = useSocket();

  const predicate = (like: Like) =>
      like.user_id === userId && like.postId === post.id;

  const [optimisticLikes, addOptimisticLike] = useOptimistic<Like[]>(
      post.likes,
      (state: Like[], newLike: Like) =>
          state.some(predicate)
              ? state.filter((like) => like.user_id !== userId)
              : [...state, newLike]
  );

  const isLiked = useMemo(
      () => post.likes?.some((like) => like.user_id === session.data?.user?.id),
      [post.likes, session.data?.user?.id]
  );

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

    const handleLikeClick = async () => {
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
                        socket.emit("likeUpdate", eventData);
                        console.log("[LikeButton] Emitted likeUpdate event:", eventData);
                    } catch (error) {
                        console.error("[LikeButton] Socket emit error:", error);
                        toast.error("Failed to send like update. Please try again.");
                    }
                } else {
                    console.error("[LikeButton] Socket is undefined.");
                    toast.error("Real-time updates are unavailable.");
                }

                // // Also update the local state
                // onLikeUpdate(eventData);
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