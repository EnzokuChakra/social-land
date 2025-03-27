"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
  DialogDescription,
  DialogTitle,
  DialogHeader,
} from "@/components/ui/dialog";
import SubmitButton from "@/components/SubmitButton";
import { Comment } from "@prisma/client";
import { CommentWithExtras } from "@/lib/definitions";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { deleteComment } from "@/lib/actions";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

type Props = {
  comment: CommentWithExtras;
  postUserId: string;
};

function CommentOptions({ comment, postUserId }: Props) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const isCommentOwner = comment.user_id === currentUserId;
  const isPostOwner = postUserId === currentUserId;
  const canDelete = isCommentOwner || isPostOwner;

  // Debug logging
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.group('CommentOptions Debug');
      console.log('Comment User ID:', comment.user_id);
      console.log('Current User ID:', currentUserId);
      console.log('Post User ID:', postUserId);
      console.log('Is Comment Owner:', isCommentOwner);
      console.log('Is Post Owner:', isPostOwner);
      console.log('Can Delete:', canDelete);
      console.groupEnd();
    }
  }, [comment.user_id, currentUserId, postUserId, isCommentOwner, isPostOwner, canDelete]);

  const handleReport = () => {
    toast.success("Comment reported successfully");
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="hover:text-neutral-600 dark:hover:text-neutral-300">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="dialogContent sm:max-w-md">
        <div className="px-6 py-4">
          {canDelete ? (
            <>
              <DialogHeader className="pb-4">
                <DialogTitle className="text-center font-medium text-base">
                  Delete Comment
                </DialogTitle>
                <DialogDescription className="text-center text-neutral-500">
                  {isPostOwner && !isCommentOwner
                    ? "As the post owner, you can delete any comments on your post."
                    : "Are you sure you want to delete your comment?"}
                </DialogDescription>
              </DialogHeader>

              <form
                action={async (formData) => {
                  try {
                    // Optimistically remove the comment from UI
                    if (window && window.dispatchEvent) {
                      const commentDeletedEvent = new CustomEvent('comment-deleted', {
                        detail: {
                          commentId: comment.id,
                          parentId: comment.parentId
                        }
                      });
                      window.dispatchEvent(commentDeletedEvent);
                    }
                    
                    // Then actually delete from the server
                    const { message } = await deleteComment(formData);
                    toast.success(message);
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Failed to delete comment");
                  }
                }}
                className="space-y-3"
              >
                <input type="hidden" name="id" value={comment.id} />
                <SubmitButton className="w-full bg-red-500 hover:bg-red-600 text-white rounded-md p-2.5 text-sm font-semibold">
                  Delete
                </SubmitButton>
                <DialogClose className="w-full border rounded-md p-2.5 text-sm font-semibold">
                  Cancel
                </DialogClose>
              </form>
            </>
          ) : (
            <>
              <DialogHeader className="pb-4">
                <DialogTitle className="text-center font-medium text-base">
                  Report Comment
                </DialogTitle>
                <DialogDescription className="text-center text-neutral-500">
                  Are you sure you want to report this comment?
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <button
                  onClick={handleReport}
                  className="w-full bg-red-500 hover:bg-red-600 text-white rounded-md p-2.5 text-sm font-semibold"
                >
                  Report
                </button>
                <DialogClose className="w-full border rounded-md p-2.5 text-sm font-semibold">
                  Cancel
                </DialogClose>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CommentOptions;
