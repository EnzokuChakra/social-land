"use client";

import CommentForm, { CommentFormHandle } from "@/components/CommentForm";
import PostActions from "@/components/PostActions";
import UserAvatar from "@/components/UserAvatar";
import ViewPost from "@/components/ViewPost";
import {
  Dialog,
  DialogContent,
  DialogContentWithoutClose,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import useMount from "@/hooks/useMount";
import { PostWithExtras, CommentWithExtras } from "@/lib/definitions";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useEffect, useState } from "react";
import MiniPost from "./MiniPost";
import Comment from "./Comment";
import PostOptions from "./PostOptions";
import { Button } from "./ui/button";
import { Flag, X, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import VerifiedBadge from "./VerifiedBadge";
import { deletePost } from "@/lib/actions";
import FollowButton from "@/components/FollowButton";
import TaggedUsersModal from "@/components/TaggedUsersModal";
import ProfileHoverCard from "@/components/ProfileHoverCard";

function PostView({ id, post }: { id: string; post: PostWithExtras }) {
  const pathname = usePathname();
  const isPostModal = pathname === `/dashboard/p/${id}`;
  const router = useRouter();
  const { data: session, status } = useSession();
  const user = session?.user;
  const inputRef = useRef<HTMLInputElement>(null);
  const commentFormRef = useRef<CommentFormHandle>(null);
  const username = post.user.username;
  const href = `/dashboard/${username}`;
  const mount = useMount();
  const isPostMine = post.user_id === user?.id;
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [showTaggedModal, setShowTaggedModal] = useState(false);

  // Transform comments to include all required fields
  const transformedComments = post.comments.map(comment => ({
    ...comment,
    parentId: comment.parentId ?? null,
    likes: comment.likes ?? [],
    user: {
      ...comment.user,
      email: '',
      password: null,
      bio: null,
      isPrivate: false,
      role: 'USER',
      status: 'NORMAL',
      createdAt: new Date(),
      updatedAt: new Date(),
      posts: [],
      saved: [],
      followers: [],
      following: [],
      stories: []
    },
    replies: (comment.replies ?? []).map(reply => ({
      ...reply,
      parentId: reply.parentId ?? null,
      likes: reply.likes ?? [],
      user: {
        ...reply.user,
        email: '',
        password: null,
        bio: null,
        isPrivate: false,
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
    }))
  })) as CommentWithExtras[];

  // Handle reply to comment
  const handleReplyToComment = (username: string, commentId: string) => {
    console.log('PostView handleReplyToComment called', { username, commentId });
    
    // Use the commentFormRef if available
    if (commentFormRef.current) {
      console.log('Using CommentForm ref onReply method');
      commentFormRef.current.onReply(username, commentId);
      return;
    }
    
    // Fallback to input ref onReply
    if (inputRef.current && 'onReply' in inputRef.current && typeof inputRef.current.onReply === 'function') {
      console.log('Using inputRef.current.onReply method');
      inputRef.current.onReply(username, commentId);
      return;
    }
    
    // Last resort: direct manipulation
    console.log('Using direct input manipulation');
    if (inputRef.current) {
      // Focus on the input field
      inputRef.current.focus();
      // Set the @username mention
      inputRef.current.value = `@${username} `;
      // Store the parent comment ID for submission
      (inputRef.current as any).currentParentId = commentId;
      
      // Trigger input event to ensure form state updates
      try {
        const event = new Event('input', { bubbles: true });
        inputRef.current.dispatchEvent(event);
      } catch (error) {
        console.error('Error dispatching input event:', error);
      }
    } else {
      console.error('No input reference available!');
    }
  };

  // Check if input ref is properly set up
  useEffect(() => {
    if (mount) {
      console.log('PostView mounted, inputRef:', inputRef.current);
    }
  }, [mount, inputRef]);

  // Enhance the Post component with real-time updates
  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;
    
    // If we're on the post modal view, we want to refresh data periodically
    // This ensures comments stay in sync with the server
    if (isPostModal && mount) {
      // Function to refresh post data with rate limiting
      const refreshPostData = async () => {
        try {
          const response = await fetch(`/api/posts/${id}/comments`);
          if (!response.ok) return;
          
          const data = await response.json();
          
          // Make sure we have comments data before dispatching
          if (data?.comments) {
            // Dispatch event with new comments for Comments component to listen for
            window.dispatchEvent(
              new CustomEvent('update-comments', {
                detail: {
                  postId: id,
                  comments: data.comments
                }
              })
            );
          }
        } catch (error) {
          console.error('Error refreshing comments:', error);
        }
      };
      
      // Initial fetch
      refreshPostData();
      
      // Set up a polling interval (every 15 seconds instead of 5)
      intervalId = setInterval(refreshPostData, 15000);
    }
    
    // Cleanup function to clear interval when component unmounts or modal closes
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = undefined;
      }
    };
  }, [isPostModal, mount, id]);

  if (!mount) return null;

  return (
    <Dialog 
      open={isPostModal} 
      onOpenChange={(open) => !open && router.back()}
    >
      <DialogContentWithoutClose 
        className="flex gap-0 flex-col md:flex-row items-start p-0 md:max-w-5xl lg:max-w-6xl xl:max-w-7xl h-full md:h-[calc(100vh-80px)] max-h-[100vh] md:max-h-[calc(100vh-80px)] bg-white dark:bg-neutral-950"
      >
        <DialogTitle className="sr-only">Post by {username}</DialogTitle>

        {/* Mobile Header - Only visible on mobile */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800 md:hidden">
          <div className="flex items-center gap-2">
            <Link href={href}>
              <UserAvatar user={post.user} className="h-8 w-8" />
            </Link>
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <ProfileHoverCard user={post.user}>
                  <Link href={href} className="font-semibold text-sm hover:underline">
                    {username}
                  </Link>
                </ProfileHoverCard>
                {post.user.verified && (
                  <VerifiedBadge className="h-3.5 w-3.5 fill-blue-500" />
                )}
              </div>
              {post.location && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {post.location}
                </p>
              )}
            </div>
          </div>
          <PostOptions post={post} userId={user?.id} />
        </div>

        <div className="relative flex-1 bg-black flex items-center justify-center h-[450px] md:h-full w-full">
          <div className="relative w-full h-full flex items-center justify-center">
            <Image
              src={post.fileUrl}
              alt={post.caption || "Post image"}
              className={cn(
                "max-h-full w-auto",
                post.aspectRatio === 1 ? "object-cover" : "object-contain"
              )}
              width={1200}
              height={1200}
              priority
              quality={100}
            />
          </div>
        </div>

        <div className="flex w-full md:w-[350px] lg:w-[450px] flex-col">
          {/* Desktop Header - Hidden on mobile */}
          <DialogHeader className="hidden md:flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-2">
              <Link href={href}>
                <UserAvatar user={post.user} className="h-8 w-8" />
              </Link>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <ProfileHoverCard user={post.user}>
                    <Link href={href} className="font-semibold text-sm hover:underline">
                      {username}
                    </Link>
                  </ProfileHoverCard>
                  {post.user.verified && (
                    <VerifiedBadge className="h-3.5 w-3.5 fill-blue-500" />
                  )}
                </div>
                {post.location && (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {post.location}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <PostOptions post={post} userId={user?.id} />
              <Button
                onClick={() => router.back()}
                size="icon"
                variant="ghost"
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 border-b border-neutral-200 dark:border-neutral-800">
            {post.caption && (
              <div className="px-4 py-3">
                <div className="flex gap-3">
                  <Link href={href} className="md:hidden">
                    <UserAvatar user={post.user} className="h-8 w-8" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">
                      <ProfileHoverCard user={post.user}>
                        <Link href={href} className="font-semibold hover:underline inline">
                          {username}
                        </Link>
                      </ProfileHoverCard>
                      {post.user.verified && (
                        <VerifiedBadge className="h-3.5 w-3.5 fill-blue-500 inline-block ml-1" />
                      )}
                      <span className="text-neutral-800 dark:text-neutral-200 ml-1.5 inline">
                        {post.caption}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="px-4 space-y-3">
              {transformedComments.map((comment) => (
                <Comment 
                  key={comment.id} 
                  comment={comment} 
                  inputRef={inputRef} 
                  postId={post.id} 
                  user={user} 
                  commentFormRef={commentFormRef}
                />
              ))}
            </div>
          </ScrollArea>

          <div className="px-4 py-3 flex flex-col gap-3">
            <PostActions
              post={post}
              userId={user?.id}
              className="justify-between"
              inputRef={inputRef}
            />
            <CommentForm
              postId={post.id}
              ref={commentFormRef}
              inputRef={inputRef}
              className="border-none p-0 !pt-4"
            />
          </div>
        </div>

        {/* Mobile Close Button - Only visible on mobile */}
        <Button
          onClick={() => router.back()}
          size="icon"
          variant="ghost"
          className="absolute top-2 right-2 md:hidden z-50 bg-neutral-900/60 hover:bg-neutral-900/70"
        >
          <X className="h-4 w-4 text-white" />
        </Button>
      </DialogContentWithoutClose>
      {post.tags && post.tags.length > 0 && (
        <TaggedUsersModal
          isOpen={showTaggedModal}
          onClose={() => setShowTaggedModal(false)}
          tags={post.tags}
        />
      )}
    </Dialog>
  );
}

export default PostView;
