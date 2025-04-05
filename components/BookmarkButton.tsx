"use client";

import { bookmarkPost } from "@/lib/actions";
import { PostWithExtras } from "@/lib/definitions";
import { cn } from "@/lib/utils";
import ActionIcon from "@/components/ActionIcon";
import { savedpost } from "@prisma/client";
import { Bookmark } from "lucide-react";
import { useOptimistic, useState, useCallback, useRef, startTransition } from "react";
import { toast } from "sonner";

type Props = {
  post: PostWithExtras;
  userId?: string;
  onBookmarkUpdate?: (savedBy: savedpost[]) => void;
};

function BookmarkButton({ post, userId, onBookmarkUpdate }: Props) {
  const [isPending, setIsPending] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const predicate = (bookmark: savedpost) =>
    bookmark.user_id === userId && bookmark.postId === post.id;
    
  const isBookmarked = post.savedBy.some(predicate);
  
  const [optimisticBookmarks, addOptimisticBookmark] = useOptimistic<
    savedpost[]
  >(
    post.savedBy,
    // @ts-ignore
    (state: savedpost[], newBookmark: savedpost) =>
      state.find(predicate)
        ? state.filter((bookmark) => bookmark.user_id !== userId)
        : [...state, newBookmark]
  );

  const handleBookmark = useCallback(async () => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // If already pending, ignore the click
    if (isPending) {
      return;
    }

    console.log('BookmarkButton - Initial state:', {
      isBookmarked,
      savedBy: post.savedBy,
      optimisticBookmarks,
      userId,
      postId: post.id
    });

    if (!userId) {
      toast.error("You must be logged in to bookmark posts");
      return;
    }
    
    setIsPending(true);
    const currentState = [...post.savedBy];
    const willBeBookmarked = !isBookmarked;
    
    console.log('BookmarkButton - Before optimistic update:', {
      willBeBookmarked,
      currentState,
      isBookmarked
    });
    
    // Optimistically update the UI within a transition
    startTransition(() => {
      const newBookmark = { 
        postId: post.id, 
        user_id: userId,
        id: Date.now().toString(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      addOptimisticBookmark(newBookmark);
      
      // Call onBookmarkUpdate with the new state
      if (onBookmarkUpdate) {
        const newBookmarks = isBookmarked 
          ? currentState.filter(bookmark => bookmark.user_id !== userId)
          : [...currentState, newBookmark];
        onBookmarkUpdate(newBookmarks);
      }
    });
    
    console.log('BookmarkButton - After optimistic update:', {
      optimisticBookmarks,
      isBookmarked
    });
    
    try {
      const formData = new FormData();
      formData.append("postId", post.id);
      await bookmarkPost(formData.get("postId") as string);
      const isCurrentlyBookmarked = optimisticBookmarks.some(predicate);
      console.log('BookmarkButton - After successful bookmark:', {
        willBeBookmarked,
        isBookmarked,
        isCurrentlyBookmarked,
        optimisticBookmarks
      });
      // Inverted the messages to match the visual state
      toast.success(isCurrentlyBookmarked ? "Post unsaved" : "Post saved");
    } catch (error) {
      console.error('BookmarkButton - Error:', error);
      toast.error("Something went wrong");
      // Revert to the original state on error
      startTransition(() => {
        addOptimisticBookmark(currentState[0] || { 
          postId: post.id, 
          user_id: userId,
          id: Date.now().toString(),
          createdAt: new Date(),
          updatedAt: new Date()
        });
        // Revert the bookmark update
        if (onBookmarkUpdate) {
          onBookmarkUpdate(currentState);
        }
      });
    } finally {
      // Set a timeout to re-enable the button after 500ms
      timeoutRef.current = setTimeout(() => {
        setIsPending(false);
      }, 500);
    }
  }, [isBookmarked, post.savedBy, optimisticBookmarks, userId, post.id, isPending, onBookmarkUpdate]);

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
