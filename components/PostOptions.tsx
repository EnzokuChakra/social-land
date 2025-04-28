"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { deletePost } from "@/lib/actions";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { PostWithExtras } from "@/lib/definitions";
import { useSession } from "next-auth/react";
import { Input } from "./ui/input";
import EditPost from "./EditPost";

type Props = {
  post: PostWithExtras;
  userId?: string;
  className?: string;
};

function PostOptions({ post, userId, className }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const { data: session } = useSession();
  const isPostOwner = post.user_id === userId;
  const isMasterAdmin = session?.user?.role === "MASTER_ADMIN";
  const isAdmin = session?.user?.role === "ADMIN";
  const canDelete = isPostOwner || isMasterAdmin || isAdmin;
  const postUserId = post.user_id;
  const currentUserId = userId;
  const postUser = post.user || {};
  const sessionUser = session?.user || {};

  const handleDeletePost = async () => {
    try {
      // Close both dialogs
      setIsDeleteDialogOpen(false);
      setIsOptionsOpen(false);

      // Optimistically remove the post from the UI
      const event = new CustomEvent('postDeleted', {
        detail: { postId: post.id }
      });
      window.dispatchEvent(event);

      // Delete from server
      const response = await deletePost(post.id);
      
      toast.success("Post deleted successfully");

      // Handle navigation based on current path
      if (pathname.startsWith('/dashboard/p/')) {
        // If on post detail page, go back to dashboard
        router.replace('/dashboard');
      } else if (pathname.startsWith('/dashboard/')) {
        // If on profile or dashboard, use replace to prevent history stack issues
        router.replace(pathname);
      }
    } catch (error) {
      console.error("[PostOptions] Error deleting post:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete post");
      router.refresh();
    }
  };

  const handleEditPost = () => {
    setIsOptionsOpen(false);
    setIsEditDialogOpen(true);
  };

  const handleReportPost = async () => {
    try {
      if (!reportReason.trim()) {
        toast.error("Please provide a reason for reporting");
        return;
      }

      if (reportReason.length > 100) {
        toast.error("Reason must be 100 characters or less");
        return;
      }

      setIsReportDialogOpen(false);
      setIsOptionsOpen(false);
      
      const response = await fetch("/api/posts/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          postId: post.id,
          reason: reportReason
        }),
      });

      if (!response.ok) throw new Error("Failed to report post");
      
      toast.success("Post reported successfully");
      setReportReason("");
    } catch (error) {
      toast.error("Failed to report post");
    }
  };

  return (
    <>
      {/* Options Dialog */}
      <Dialog open={isOptionsOpen} onOpenChange={setIsOptionsOpen}>
        <DialogTrigger asChild>
          <button className="hover:bg-gray-100 dark:hover:bg-neutral-800 p-2 rounded-full">
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md p-0" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="sr-only">Post Options</DialogTitle>
            <DialogDescription className="sr-only">Options menu for the post</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 p-4">
            {isPostOwner ? (
              <>
                <button
                  onClick={handleEditPost}
                  className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-md"
                >
                  Edit post
                </button>
                <button
                  onClick={() => {
                    setIsOptionsOpen(false);
                    setIsDeleteDialogOpen(true);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md"
                >
                  Delete post
                </button>
              </>
            ) : canDelete ? (
              <button
                onClick={() => {
                  setIsOptionsOpen(false);
                  setIsDeleteDialogOpen(true);
                }}
                className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md"
              >
                Delete post
              </button>
            ) : (
              <button
                onClick={() => {
                  setIsOptionsOpen(false);
                  setIsReportDialogOpen(true);
                }}
                className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md"
              >
                Report
              </button>
            )}
            <DialogClose className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-md">
              Cancel
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Post Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[800px] p-0">
          <DialogHeader>
            <DialogTitle className="sr-only">Edit Post</DialogTitle>
            <DialogDescription className="sr-only">Edit post content and settings</DialogDescription>
          </DialogHeader>
          <EditPost 
            id={post.id} 
            post={post} 
            onClose={() => setIsEditDialogOpen(false)} 
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-center font-medium text-base">
              Delete Post
            </DialogTitle>
            <DialogDescription className="text-center text-neutral-500">
              Are you sure you want to delete this post? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 p-4">
            <button
              onClick={handleDeletePost}
              className="w-full px-4 py-2.5 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-md"
            >
              Delete
            </button>
            <button
              onClick={() => setIsDeleteDialogOpen(false)}
              className="w-full px-4 py-2.5 text-sm font-medium border hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-md"
            >
              Cancel
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-center font-medium text-base">
              Report Post
            </DialogTitle>
            <DialogDescription className="text-center text-neutral-500">
              Please provide a reason for reporting this post.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 p-4">
            <Input
              placeholder="Enter reason (max 100 characters)"
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              maxLength={100}
            />
            <button
              onClick={handleReportPost}
              className="w-full px-4 py-2.5 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-md"
            >
              Report
            </button>
            <button
              onClick={() => {
                setIsReportDialogOpen(false);
                setReportReason("");
              }}
              className="w-full px-4 py-2.5 text-sm font-medium border hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-md"
            >
              Cancel
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default PostOptions;
