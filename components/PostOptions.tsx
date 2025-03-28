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
  const { data: session } = useSession();
  const isPostOwner = post.user_id === userId;
  const isMasterAdmin = session?.user?.role === "MASTER_ADMIN";

  const handleDeletePost = async () => {
    try {
      // Close both dialogs
      setIsDeleteDialogOpen(false);
      setIsOptionsOpen(false);

      // Delete from server
      await deletePost(post.id);
      
      toast.success("Post deleted successfully");

      // If we're on a post page, go back to the previous page
      if (pathname.startsWith('/dashboard/p/')) {
        router.back();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete post");
      router.refresh();
    }
  };

  const handleEditPost = () => {
    setIsOptionsOpen(false);
    router.push(`/dashboard/p/${post.id}/edit`);
  };

  const handleReportPost = async () => {
    try {
      setIsOptionsOpen(false);
      const response = await fetch("/api/posts/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          postId: post.id,
          reason: "Inappropriate content"
        }),
      });

      if (!response.ok) throw new Error("Failed to report post");
      
      toast.success("Post reported successfully");
      router.back();
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
            ) : isMasterAdmin ? (
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
                onClick={handleReportPost}
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
    </>
  );
}

export default PostOptions;
