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
import { CommentWithExtras } from "@/lib/definitions";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { deleteComment } from "@/lib/actions";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {getSocket} from "@/lib/socket";

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
  const [reason, setReason] = useState("");
  const [isReporting, setIsReporting] = useState(false);
  const socket = getSocket();

  const handleReport = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason for reporting.");
      return;
    }
    setIsReporting(true);
    try {
      const response = await fetch('/api/reports/comment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commentId: comment.id,
          reason: reason,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.error === 'Comment already reported') {
          toast.error('Comment already reported');
        } else {
          throw new Error('Failed to report comment');
        }
      } else {
        toast.success('Comment reported successfully');
        setIsOpen(false);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to report comment');
    } finally {
      setIsReporting(false);
    }
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

      if (socket) {
        socket.emit("deleteComment", {
          commentId: comment.id
        });
      }
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
                <div className="space-y-1.5">
                  <Label htmlFor="reason">Reason</Label>
                  <Textarea id="reason" placeholder="Please provide a reason for reporting this comment..." value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="resize-none" />
                </div>
                <button
                  onClick={handleReport}
                  disabled={isReporting || !reason.trim()}
                  className="w-full bg-red-500 hover:bg-red-600 text-white rounded-md p-2.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isReporting ? 'Reporting...' : 'Report'}
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
