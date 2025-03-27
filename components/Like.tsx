"use client";

import { PostWithExtras } from "@/lib/definitions";
import { cn } from "@/lib/utils";
import type { Like } from "@/lib/definitions";
import { Heart } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import ActionIcon from "./ActionIcon";
import { likePost } from "@/lib/actions";
import { useMemo } from "react";
import { useSession } from "next-auth/react";
import io from "socket.io-client";
import { useEffect, useState } from "react";
import { AiFillHeart, AiOutlineHeart } from "react-icons/ai";
import { toast } from "sonner";

const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5002", {
  withCredentials: true,
  transports: ['websocket', 'polling'],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  forceNew: true,
  secure: true,
  rejectUnauthorized: false,
  path: '/socket.io/'
});

socket.on('connect_error', (error) => {
  console.error('Socket connection error:', error);
  toast.error('Failed to connect to real-time updates');
});

socket.on('disconnect', (reason) => {
  console.log('Socket disconnected:', reason);
  if (reason === 'io server disconnect') {
    socket.connect();
  }
});

socket.on('connect', () => {
  console.log('Socket connected successfully');
});

function LikeButton({
  post,
  userId,
}: {
  post: PostWithExtras;
  userId?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const predicate = (like: Like) =>
    like.user_id === userId && like.postId === post.id;

  const [optimisticLikes, addOptimisticLike] = useOptimistic<Like[]>(
    post.likes,
    // @ts-ignore
    (state: Like[], newLike: Like) =>
      state.some(predicate)
        ? state.filter((like) => like.user_id !== userId)
        : [...state, newLike]
  );

  const session = useSession();

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

  const handleLikesCount = (result: any) => {
    if (result?.post) {
      socket.emit("likeUpdate", {
        post: result.post,
        likedBy: result.likedBy,
        unlike: result.unlike
      });
    }
  };

  return (
    <ActionIcon
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          addOptimisticLike({ postId: post.id, user_id: userId });
          const result = await likePost({ postId: post.id });
          
          // Emit the complete result object
          if (result) {
            handleLikesCount(result);
          }
        });
      }}
    >
      <Heart
        className={cn("h-6 w-6 transition-colors", {
          "text-red-500 fill-red-500": optimisticLikes.some(predicate),
        })}
      />
    </ActionIcon>
  );
}

export default LikeButton;
