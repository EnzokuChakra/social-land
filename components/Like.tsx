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
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 100000,
  forceNew: true,
  secure: false,
  rejectUnauthorized: false,
  path: '/socket.io/',
  extraHeaders: {
    'Access-Control-Allow-Origin': '*'
  }
});

socket.on('connect_error', (error) => {
  console.error('Socket connection error:', error);
  toast.error('Failed to connect to real-time updates');
  
  // Attempt to reconnect on connection error
  setTimeout(() => {
    if (!socket.connected) {
      socket.connect();
    }
  }, 1000);
});

socket.on('disconnect', (reason) => {
  console.log('Socket disconnected:', reason);
  if (reason === 'io server disconnect' || reason === 'transport close' || reason === 'ping timeout') {
    setTimeout(() => {
      if (!socket.connected) {
        socket.connect();
      }
    }, 1000);
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
        unlike: result.unlike,
        timestamp: new Date().toISOString(),
        userId: session.data?.user?.id,
        action: result.unlike ? 'unlike' : 'like'
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
