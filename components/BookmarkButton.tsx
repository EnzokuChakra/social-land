"use client";

import { bookmarkPost } from "@/lib/actions";
import { PostWithExtras, SavedPost, User, UserRole } from "@/lib/definitions";
import { cn } from "@/lib/utils";
import ActionIcon from "@/components/ActionIcon";
import { Bookmark } from "lucide-react";
import { useOptimistic, useState, useCallback, useRef, startTransition } from "react";
import { toast } from "sonner";
import { getSocket } from "@/lib/socket";
import { useRouter } from "next/navigation";

type Props = {
  post: PostWithExtras;
  userId?: string;
  onBookmarkUpdate?: (savedBy: (SavedPost & { user: User })[]) => void;
};

function BookmarkButton({ post, userId, onBookmarkUpdate }: Props) {
  const [isPending, setIsPending] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const socket = getSocket();
  const router = useRouter();
  const predicate = (bookmark: SavedPost & { user: User }) =>
    bookmark.user_id === userId && bookmark.postId === post.id;
    
  const isBookmarked = post.savedBy.some(predicate);
  
  const [optimisticBookmarks, setOptimisticBookmarks] = useState(post.savedBy);

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
    
    // Create the new bookmark object
    const newBookmark: SavedPost & { user: User } = { 
      postId: post.id, 
      user_id: userId,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
      user: {
        id: userId,
        username: '',
        name: '',
        email: '',
        password: null,
        image: '',
        bio: null,
        isFollowing: false,
        isPrivate: false,
        verified: false,
        role: UserRole.USER,
        status: 'NORMAL',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    };
    
    // Optimistically update the UI
    const newState = willBeBookmarked 
      ? [...currentState, newBookmark]
      : currentState.filter(bookmark => bookmark.user_id !== userId);
    
    setOptimisticBookmarks(newState);
    
    if (onBookmarkUpdate) {
      onBookmarkUpdate(newState);
    }
    
    try {
      const formData = new FormData();
      formData.append("postId", post.id);
      await bookmarkPost(formData);
      toast.success(willBeBookmarked ? "Post saved" : "Post unsaved");

      // Emit socket event for real-time updates
      if (socket) {
        socket.emit("bookmarkUpdate", {
          postId: post.id,
          userId: userId,
          action: willBeBookmarked ? "bookmark" : "unbookmark"
        });
      }
      
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
        <Bookmark
          className={cn("h-6 w-6 transition-all", {
            "fill-black dark:fill-white": optimisticBookmarks.some(predicate),
            "text-neutral-600 dark:text-neutral-400": !optimisticBookmarks.some(predicate),
            "hover:text-neutral-800 dark:hover:text-neutral-200": !optimisticBookmarks.some(predicate),
          })}
        />
      </ActionIcon>
    </div>
  );
}

export default BookmarkButton;
