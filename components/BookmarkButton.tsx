"use client";

import { bookmarkPost } from "@/lib/actions";
import { PostWithExtras } from "@/lib/definitions";
import { cn } from "@/lib/utils";
import ActionIcon from "@/components/ActionIcon";
import { SavedPost } from "@prisma/client";
import { Bookmark } from "lucide-react";
import { useOptimistic, useState } from "react";
import { toast } from "sonner";

type Props = {
  post: PostWithExtras;
  userId?: string;
};

function BookmarkButton({ post, userId }: Props) {
  const [isPending, setIsPending] = useState(false);
  const predicate = (bookmark: SavedPost) =>
    bookmark.user_id === userId && bookmark.postId === post.id;
    
  const isBookmarked = post.savedBy.some(predicate);
  
  const [optimisticBookmarks, addOptimisticBookmark] = useOptimistic<
    SavedPost[]
  >(
    post.savedBy,
    // @ts-ignore
    (state: SavedPost[], newBookmark: SavedPost) =>
      state.find(predicate)
        ? state.filter((bookmark) => bookmark.user_id !== userId)
        : [...state, newBookmark]
  );

  return (
    <form
      action={async (formData: FormData) => {
        if (!userId) {
          toast.error("You must be logged in to bookmark posts");
          return;
        }
        
        setIsPending(true);
        const postId = formData.get("postId");
        
        // Optimistically update the UI
        addOptimisticBookmark({ 
          postId: post.id, 
          user_id: userId,
          id: Date.now().toString(),
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        try {
          await bookmarkPost(postId);
          toast.success(isBookmarked ? "Post removed from saved" : "Post saved");
        } catch (error) {
          toast.error("Something went wrong");
          // Revert optimistic update on error
          addOptimisticBookmark({ 
            postId: post.id, 
            user_id: userId,
            id: Date.now().toString(),
            createdAt: new Date(),
            updatedAt: new Date()
          });
        } finally {
          setIsPending(false);
        }
      }}
      className="ml-auto"
    >
      <input type="hidden" name="postId" value={post.id} />

      <ActionIcon disabled={isPending}>
        <Bookmark
          className={cn("h-6 w-6 transition-all", {
            "dark:fill-white fill-black": optimisticBookmarks.some(predicate),
          })}
        />
      </ActionIcon>
    </form>
  );
}

export default BookmarkButton;
