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
import { useEffect, useState } from "react";

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
  const [isOpen, setIsOpen] = useState(false);

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

  const handleDelete = async () => {
    try {
      const formData = new FormData();
      formData.append("id", comment.id);
      
      // Delete from the server
      const { message } = await deleteComment(formData);
      
      // Close the dialog
      setIsOpen(false);
      
      // Show success message
      toast.success(message);
      
      // Dispatch custom event for optimistic update
      const event = new CustomEvent('commentDelete', {
        detail: { commentId: comment.id }
      });
      window.dispatchEvent(event);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete comment");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
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

              <div className="space-y-3">
                <button
                  onClick={handleDelete}
                  className="w-full bg-red-500 hover:bg-red-600 text-white rounded-md p-2.5 text-sm font-semibold"
                >
                  Delete
                </button>
                <DialogClose className="w-full border rounded-md p-2.5 text-sm font-semibold">
                  Cancel
                </DialogClose>
              </div>
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
