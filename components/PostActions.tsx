/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState, useCallback } from "react";
import { PostWithExtras, User, Like } from "@/lib/definitions";
import { cn } from "@/lib/utils";
import ActionIcon from "@/components/ActionIcon";
import { MessageCircle } from "lucide-react";
import Link from "next/link";
import LikeButton from "./Like";
import ShareButton from "./ShareButton";
import BookmarkButton from "./BookmarkButton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import UserAvatar from "./UserAvatar";
import VerifiedBadge from "./VerifiedBadge";
import { useRouter } from "next/navigation";
import FollowButton from "./FollowButton";
import io from "socket.io-client";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import Timestamp from "@/components/Timestamp";
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

type ExtendedUser = User & {
  isFollowing?: boolean;
  hasPendingRequest?: boolean;
  isFollowedByUser?: boolean;
};

type Props = {
  post: PostWithExtras;
  userId?: string;
  className?: string;
  inputRef?: React.RefObject<HTMLInputElement>;
};

function PostActions({ post, userId, className, inputRef }: Props) {
  const [showLikesModal, setShowLikesModal] = useState(false);
  const router = useRouter();
  const { data: session, status } = useSession();

  const handleCommentClick = () => {
    if (inputRef?.current) {
      inputRef.current.focus();
    }
  };

  return (
    <>
      <div className={cn("relative flex flex-col w-full gap-y-1", className)}>
        <div className="flex items-start w-full gap-x-2">
          <LikeButton post={post} userId={userId} />
          {inputRef ? (
            <ActionIcon onClick={handleCommentClick}>
              <MessageCircle className={"h-6 w-6"} />
            </ActionIcon>
          ) : (
            <Link href={`/dashboard/p/${post.id}`}>
              <ActionIcon>
                <MessageCircle className={"h-6 w-6"} />
              </ActionIcon>
            </Link>
          )}
          <ShareButton postId={post.id} />
          <BookmarkButton post={post} userId={userId} />
        </div>

        {/* Like count section */}
        <div>
          {post.likes && post.likes.length > 0 ? (
            <button
              onClick={() => setShowLikesModal(true)}
              className="font-semibold text-sm text-left hover:underline"
            >
              {post.likes.length} {post.likes.length === 1 ? "like" : "likes"}
            </button>
          ) : (
            <div className="font-normal text-sm text-neutral-500 dark:text-neutral-400">
              Be the first to like this
            </div>
          )}
        </div>

        <Timestamp createdAt={post.createdAt} className="text-xs text-neutral-500 dark:text-neutral-400" showFull={true} />
      </div>

      {/* Likes Modal */}
      <Dialog open={showLikesModal} onOpenChange={setShowLikesModal}>
        <DialogContent className="dialogContent max-w-md h-[80vh] flex flex-col bg-white dark:bg-neutral-950">
          <DialogHeader className="border-b border-neutral-200 dark:border-neutral-800 px-4 py-4">
            <DialogTitle className="text-center font-medium text-base">
              Likes
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-800">
              {post.likes && post.likes.length > 0 ? (
                post.likes.map((like: Like & { user: User }) => {
                  const user = like.user as ExtendedUser;
                  return (
                    <div
                      key={like.id}
                      className="flex items-center justify-between p-4"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Link href={`/dashboard/${user.username}`}>
                          <UserAvatar user={user} className="h-9 w-9" />
                        </Link>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1">
                            <Link
                              href={`/dashboard/${user.username}`}
                              className="font-semibold text-sm hover:underline"
                            >
                              {user.username}
                            </Link>
                            {user.verified && (
                              <VerifiedBadge className="h-3.5 w-3.5" />
                            )}
                          </div>
                          {user.name && (
                            <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-1">
                              {user.name}
                            </p>
                          )}
                        </div>
                      </div>
                      {session?.user?.id !== user.id && (
                        <FollowButton
                          followingId={user.id}
                          isFollowing={user.isFollowing || false}
                          hasPendingRequest={user.hasPendingRequest || false}
                          isPrivate={user.isPrivate || false}
                          className={cn(
                            "text-xs",
                            user.isFollowing
                              ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-red-500/10 hover:text-red-500"
                              : "bg-blue-500 hover:bg-blue-600 text-white"
                          )}
                          onSuccess={(success) => {
                            if (success) {
                              router.refresh();
                            }
                          }}
                        />
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="flex items-center justify-center flex-1 p-4">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    No likes yet
                  </p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default PostActions;
