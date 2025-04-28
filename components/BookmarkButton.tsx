"use client";

import { bookmarkPost } from "@/lib/actions";
import { PostWithExtras, SavedPost, User, UserRole } from "@/lib/definitions";
import { cn } from "@/lib/utils";
import ActionIcon from "@/components/ActionIcon";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { useOptimistic, useState, useCallback, useRef, startTransition, useEffect } from "react";
import { toast } from "sonner";
import { getSocket } from "@/lib/socket";
import { useRouter } from "next/navigation";

type BookmarkUser = {
  id: string;
  username: string | null;
  name: string | null;
  image: string | null;
  verified: boolean;
  isPrivate: boolean;
  role: string;
  status: string;
};

type BookmarkWithUser = SavedPost & {
  user: BookmarkUser;
};

type Props = {
  post: PostWithExtras;
  userId?: string;
  className?: string;
  onBookmarkUpdate?: (savedBy: BookmarkWithUser[]) => void;
};

function BookmarkButton({ post, userId, className = "", onBookmarkUpdate }: Props) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const socket = getSocket();
  const [optimisticBookmarks, setOptimisticBookmarks] = useState<BookmarkWithUser[]>(post?.savedBy || []);
  const isBookmarked = optimisticBookmarks.some((bookmark) => bookmark.user_id === userId);

  useEffect(() => {
    // Update optimisticBookmarks when post.savedBy changes
    if (post?.savedBy) {
      setOptimisticBookmarks(post.savedBy);
    }
  }, [post?.savedBy]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleBookmark = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (isPending) {
      return;
    }

    if (!userId) {
      toast.error("You must be logged in to bookmark posts");
      return;
    }
    
    setIsPending(true);
    const currentState = [...post.savedBy];
    const willBeBookmarked = !isBookmarked;
    
    try {
      const formData = new FormData();
      formData.append("postId", post.id);
      await bookmarkPost(formData);
      
      // Update the optimistic state
      const newState = willBeBookmarked 
        ? [...currentState, {
            id: crypto.randomUUID(),
            postId: post.id,
            user_id: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
            user: {
              id: userId,
              username: null,
              name: null,
              image: null,
              verified: false,
              isPrivate: false,
              role: 'USER',
              status: 'ACTIVE'
            }
          }]
        : currentState.filter(bookmark => bookmark.user_id !== userId);
      
      setOptimisticBookmarks(newState);
      
      if (onBookmarkUpdate) {
        onBookmarkUpdate(newState);
      }

      // Emit socket event for real-time updates
      if (socket) {
        socket.emit("bookmarkUpdate", {
          postId: post.id,
          userId: userId,
          action: willBeBookmarked ? "bookmark" : "unbookmark"
        });
      }
      
      // Show appropriate toast message
      toast.success(willBeBookmarked ? "Post saved" : "Post unsaved");
      
      // Force a refresh of the profile data
      router.refresh();
    } catch (error) {
      toast.error("Something went wrong");
      // Revert to the original state on error
      setOptimisticBookmarks(currentState);
      if (onBookmarkUpdate) {
        onBookmarkUpdate(currentState);
      }
    } finally {
      timeoutRef.current = setTimeout(() => {
        setIsPending(false);
      }, 500);
    }
  }, [isBookmarked, post.savedBy, userId, post.id, isPending, onBookmarkUpdate, socket, router]);

  return (
    <div className="ml-auto">
      <ActionIcon 
        disabled={isPending} 
        onClick={handleBookmark}
        type="button"
      >
        {isBookmarked ? (
          <BookmarkCheck className="h-6 w-6 text-white fill-white" />
        ) : (
          <Bookmark className="h-6 w-6 text-white" />
        )}
      </ActionIcon>
    </div>
  );
}

export default BookmarkButton;
