/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState, useCallback } from "react";
import { PostWithExtras, User, Like as PrismaLike } from "@/lib/definitions";
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
import {useSocket} from "@/hooks/use-socket";
import { getSocket } from "@/lib/socket";
import { savedpost } from "@prisma/client";

type ExtendedUser = User & {
  isFollowing?: boolean;
  hasPendingRequest?: boolean;
  isFollowedByUser?: boolean;
};

type LikeUser = Pick<User, keyof User> & {
  isFollowing?: boolean;
  hasPendingRequest?: boolean;
  isPrivate?: boolean;
};

type PostUser = PostWithExtras['user'];
type Like = PrismaLike & {
  user: PostUser;
};

type LikeUpdateData = {
  post: { id: string };
  action: "like" | "unlike";
  user_id: string;
  likedBy: PostUser;
};

type Props = {
  post: PostWithExtras;
  userId?: string;
  className?: string;
  inputRef?: React.RefObject<HTMLInputElement>;
  onBookmarkUpdate?: (savedBy: savedpost[]) => void;
};

function PostActions({ post, userId, className, inputRef, onBookmarkUpdate }: Props) {
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [currentPost, setCurrentPost] = useState<PostWithExtras>(post);
  const router = useRouter();
  const { data: session, status } = useSession();
  const socket = getSocket();

  // Initialize currentPost with follow status
  useEffect(() => {
    setCurrentPost(prevPost => ({
      ...prevPost,
      likes: post.likes.map(like => ({
        ...like,
        user: {
          ...like.user,
          isFollowing: like.user.isFollowing || false,
          hasPendingRequest: like.user.hasPendingRequest || false,
          isPrivate: like.user.isPrivate || false
        }
      }))
    }));
  }, [post]);

  const handleLikeUpdate = useCallback((data: LikeUpdateData) => {
    if (data.post.id === post.id) {
      setCurrentPost((prevPost: PostWithExtras) => {
        let updatedLikes = [...prevPost.likes];

        if (data.action === "unlike") {
          updatedLikes = updatedLikes.filter((like) => like.user_id !== data.user_id);
        } else {
          const likeExists = updatedLikes.some((like) => like.user_id === data.likedBy.id);
          if (!likeExists) {
            const newLike = {
              id: crypto.randomUUID(),
              user_id: data.likedBy.id,
              postId: data.post.id,
              reelId: null,
              storyId: null,
              user: data.likedBy,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            updatedLikes.push(newLike);
          }
        }

        return {
          ...prevPost,
          likes: updatedLikes
        };
      });
    }
  }, [post.id]);

  const handleLikesModalOpen = async () => {
    console.log('Opening likes modal for post:', currentPost.id);
    console.log('Raw likes data:', JSON.stringify(currentPost.likes, null, 2));
    
    // Fetch follow status for each user
    const likesWithFollowStatus = await Promise.all(
      currentPost.likes.map(async (like) => {
        if (!like.user) return like;

        try {
          const response = await fetch(`/api/users/follow/status/?userId=${like.user.id}`);
          if (!response.ok) {
            console.error(`Failed to fetch follow status for user ${like.user.username}`);
            return like;
          }

          const followStatus = await response.json();

          return {
            ...like,
            user: {
              ...like.user,
              isFollowing: followStatus.isFollowing || false,
              hasPendingRequest: followStatus.hasPendingRequest || false,
              isPrivate: like.user.isPrivate || false
            }
          };
        } catch (error) {
          console.error(`Error fetching follow status for user ${like.user.username}:`, error);
          return like;
        }
      })
    );

    // Update the current post with the new follow status information
    setCurrentPost(prevPost => ({
      ...prevPost,
      likes: likesWithFollowStatus
    }));

    setShowLikesModal(true);
  };

  // This effect will run when the component is mounted
  useEffect(() => {
    if (!socket) return;
    socket.on("likeUpdate", handleLikeUpdate);

    return () => {
      socket.off("likeUpdate", handleLikeUpdate);
    };
  }, [socket, handleLikeUpdate]);

  const handleCommentClick = () => {
    if (inputRef?.current) {
      // Focus the input
      inputRef.current.focus();
      // Scroll the input into view if needed
      inputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <>
      <div className={cn("relative flex flex-col w-full gap-y-1", className)}>
        <div className="flex items-start w-full gap-x-2">
          <LikeButton post={currentPost} userId={userId} onLikeUpdate={handleLikeUpdate}/>
          {inputRef ? (
            <ActionIcon onClick={handleCommentClick}>
              <MessageCircle className={"h-6 w-6"} />
            </ActionIcon>
          ) : (
            <Link href={`/dashboard/p/${currentPost.id}`}>
              <ActionIcon>
                <MessageCircle className={"h-6 w-6"} />
              </ActionIcon>
            </Link>
          )}
          <ShareButton postId={currentPost.id} />
          <BookmarkButton post={currentPost} userId={userId} onBookmarkUpdate={onBookmarkUpdate} />
        </div>

        {/* Like count section */}
        <div>
          {currentPost.likes && currentPost.likes.length > 0 ? (
            <button
              onClick={handleLikesModalOpen}
              className="font-semibold text-sm text-left hover:underline"
            >
              {currentPost.likes.length} {currentPost.likes.length === 1 ? "like" : "likes"}
            </button>
          ) : (
            <div className="font-normal text-sm text-neutral-500 dark:text-neutral-400">
              Be the first to like this
            </div>
          )}
        </div>
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
              {currentPost.likes && currentPost.likes.length > 0 ? (
                currentPost.likes.map((like) => {
                  if (!like.user) return null;
                  
                  return (
                    <div
                      key={like.id}
                      className="flex items-center justify-between p-4"
                    >
                      <div className="flex items-center gap-x-2">
                        <Link href={`/dashboard/${like.user.username}`}>
                          <UserAvatar user={like.user} />
                        </Link>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-x-1">
                            <Link href={`/dashboard/${like.user.username}`}>
                              <p className="font-semibold text-sm hover:underline">
                                {like.user.username}
                              </p>
                            </Link>
                            {like.user.verified && (
                              <VerifiedBadge className="h-4 w-4" />
                            )}
                          </div>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            {like.user.name}
                          </p>
                        </div>
                      </div>

                      {session?.user?.id !== like.user.id && (
                        <FollowButton
                          followingId={like.user.id}
                          isFollowing={like.user.isFollowing || false}
                          hasPendingRequest={like.user.hasPendingRequest || false}
                          isPrivate={like.user.isPrivate || false}
                          className={cn(
                            "text-xs",
                            like.user.isFollowing
                              ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-red-500/10 hover:text-red-500"
                              : "bg-blue-500 hover:bg-blue-600 text-white"
                          )}
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
