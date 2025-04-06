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
  const [isProcessing, setIsProcessing] = useState(false);
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
    if (!session.data?.user) {
      toast.error("You must be logged in to like a post");
      return;
    }

    // Prevent rapid clicking
    const now = Date.now();
    if (now - lastClickTime < 500 || isProcessing) {
      return;
    }
    setLastClickTime(now);
    setIsProcessing(true);

    try {
      startTransition(async () => {
        addOptimisticLike(optimisticLike);
        const res = await likePost({
          postId: post.id,
        });

        if (res?.message?.includes("Database Error")) {
          toast.error("Something went wrong");
          // Revert optimistic update if there was an error
          addOptimisticLike(optimisticLike);
        }
      });
    } catch (error) {
      console.error("Error liking post:", error);
      toast.error("Something went wrong");
      // Revert optimistic update if there was an error
      addOptimisticLike(optimisticLike);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ActionIcon
      onClick={handleLikeClick}
      disabled={isProcessing}
      data-post-id={post.id}
    >
      <Heart
        className={cn("h-6 w-6", {
          "text-red-500 fill-red-500": isLiked,
        })}
      />
    </ActionIcon>
  );
}

export default LikeButton;