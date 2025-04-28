/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState, useCallback } from "react";
import { PostWithExtras, User, Like as PrismaLike, SavedPost } from "@/lib/definitions";
import { cn } from "@/lib/utils";
import ActionIcon from "@/components/ActionIcon";
import { MessageCircle, Search } from "lucide-react";
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
import { getSocket } from "@/lib/socket";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import LikesList from "./LikesList";

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

type BookmarkWithUser = SavedPost & {
  user: User;
};

type Props = {
  post: PostWithExtras;
  userId?: string;
  className?: string;
  inputRef?: React.RefObject<HTMLInputElement>;
  onBookmarkUpdate?: (savedBy: BookmarkWithUser[]) => void;
};

function PostActions({ post, userId, className, inputRef, onBookmarkUpdate }: Props) {
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [currentPost, setCurrentPost] = useState<PostWithExtras>(post);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreLikes, setHasMoreLikes] = useState(false);
  const router = useRouter();
  const { data: session, status } = useSession();
  const socket = getSocket();

  // Initialize currentPost with follow status
  useEffect(() => {
    if (!post?.likes) {
      setCurrentPost(prevPost => ({
        ...prevPost,
        likes: []
      }));
      return;
    }

    setCurrentPost(prevPost => ({
      ...prevPost,
      likes: post.likes.map(like => ({
        ...like,
        user: {
          ...like.user,
          isFollowing: like.user?.isFollowing || false,
          hasPendingRequest: like.user?.hasPendingRequest || false,
          isPrivate: like.user?.isPrivate || false
        }
      }))
    }));
  }, [post]);

  const handleLikeUpdate = useCallback((data: LikeUpdateData) => {
    if (data.post.id === post.id) {
      setCurrentPost((prevPost: PostWithExtras) => {
        // Skip update if the like state is already correct
        const currentLikeState = prevPost.likes.some(like => like.user_id === data.user_id);
        const newLikeState = data.action === "like";
        
        if (currentLikeState === newLikeState) {
          return prevPost;
        }

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

  const handleBookmarkUpdate = useCallback((data: { postId: string; userId: string; action: 'bookmark' | 'unbookmark' }) => {
    if (data.postId === post.id) {
      setCurrentPost((prevPost: PostWithExtras) => {
        let updatedSavedBy = [...prevPost.savedBy];

        if (data.action === "unbookmark") {
          updatedSavedBy = updatedSavedBy.filter((save) => save.user_id !== data.userId);
        } else {
          const saveExists = updatedSavedBy.some((save) => save.user_id === data.userId);
          if (!saveExists) {
            const newSave = {
              id: crypto.randomUUID(),
              user_id: data.userId,
              postId: data.postId,
              createdAt: new Date(),
              updatedAt: new Date(),
              user: {
                id: data.userId,
                username: '',
                name: '',
                email: '',
                password: null,
                image: '',
                bio: null,
                isFollowing: false,
                hasPendingRequest: false,
                isPrivate: false,
                verified: false,
                role: 'USER',
                status: 'NORMAL',
                createdAt: new Date(),
                updatedAt: new Date(),
                posts: [],
                saved: [],
                followers: [],
                following: [],
                stories: []
              }
            };
            updatedSavedBy.push(newSave);
          }
        }

        return {
          ...prevPost,
          savedBy: updatedSavedBy
        };
      });
    }
  }, [post.id]);

  const handleLikesModalOpen = async () => {    
    // Fetch follow status for each user
    const likesWithFollowStatus = await Promise.all(
      currentPost.likes.map(async (like) => {
        if (!like.user) return like;

        try {
          const response = await fetch(`/api/users/follow/status/?userId=${like.user.id}`);
          if (!response.ok) {
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
    setSearchQuery(''); // Reset search query when opening modal
  };

  const handleLoadMoreLikes = async () => {
    if (isLoadingMore) return;
    
    setIsLoadingMore(true);
    try {
      const response = await fetch(`/api/posts/${post.id}/likes?cursor=${currentPost.likes[currentPost.likes.length - 1]?.id}`);
      if (response.ok) {
        const data = await response.json();
        const newLikes = data.likes;
        setHasMoreLikes(data.hasMore);
        
        // Fetch follow status for new likes
        const likesWithFollowStatus = await Promise.all(
          newLikes.map(async (like: Like) => {
            if (!like.user) return like;

            try {
              const response = await fetch(`/api/users/follow/status/?userId=${like.user.id}`);
              if (!response.ok) {
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
              return like;
            }
          })
        );

        setCurrentPost(prevPost => ({
          ...prevPost,
          likes: [...prevPost.likes, ...likesWithFollowStatus]
        }));
      }
    } catch (error) {
      console.error('Error loading more likes:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // This effect will run when the component is mounted
  useEffect(() => {
    if (!socket) return;
    socket.on("likeUpdate", handleLikeUpdate);
    socket.on("bookmarkUpdate", handleBookmarkUpdate);

    return () => {
      socket.off("likeUpdate", handleLikeUpdate);
      socket.off("bookmarkUpdate", handleBookmarkUpdate);
    };
  }, [socket, handleLikeUpdate, handleBookmarkUpdate]);

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
        <DialogContent className="max-w-md p-0 bg-black">
          <DialogHeader className="border-b border-neutral-800">
            <DialogTitle className="text-center font-semibold text-lg py-2 text-white">
              Likes
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            <LikesList
              likes={currentPost.likes}
              onLoadMore={handleLoadMoreLikes}
              hasMore={hasMoreLikes}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default PostActions;
