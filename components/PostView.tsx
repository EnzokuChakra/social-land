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
import { useStoryModal } from "@/hooks/use-story-modal";
import Timestamp from "@/components/Timestamp";
import { useSocket } from "@/hooks/use-socket";

function PostView({ id, post }: { id: string; post: PostWithExtras }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const user = session?.user;
  const inputRef = useRef<HTMLInputElement>(null);
  const commentFormRef = useRef<CommentFormHandle>(null);
  const username = post.user.username;
  const href = `/dashboard/${username}`;
  const mount = useMount();
  const [isOpen, setIsOpen] = useState(true);
  const isPostModal = pathname === `/dashboard/p/${id}`;
  const isPostMine = post.user_id === user?.id;
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [showTaggedModal, setShowTaggedModal] = useState(false);
  const storyModal = useStoryModal();
  const [comments, setComments] = useState(post.comments);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const socket = useSocket();

  useEffect(() => {
    setIsOpen(true);
  }, [id]);

  useEffect(() => {
    if (!socket) return;

    const handleCommentUpdate = (data: { postId: string; parentId: string | null; comment: any }) => {
      console.log("[PostView] Received comment update:", data);
      
      if (data.postId === id) {
        setComments(prevComments => {
          if (data.parentId) {
            // Handle reply
            return prevComments.map(comment => {
              if (comment.id === data.parentId) {
                return {
                  ...comment,
                  replies: [...(comment.replies || []), data.comment]
                };
              }
              return comment;
            });
          } else {
            // Handle new comment
            return [data.comment, ...prevComments];
          }
        });
      }
    };

    const handleCommentDelete = (data: { postId: string; commentId: string; parentId: string | null }) => {
      console.log("[PostView] Received comment delete:", data);
      
      if (data.postId === id) {
        setComments(prevComments => {
          if (data.parentId) {
            // Handle reply deletion
            return prevComments.map(comment => {
              if (comment.id === data.parentId) {
                return {
                  ...comment,
                  replies: comment.replies?.filter(reply => reply.id !== data.commentId) || []
                };
              }
              return comment;
            });
          } else {
            // Handle main comment deletion
            return prevComments.filter(comment => comment.id !== data.commentId);
          }
        });
      }
    };

    socket.on("commentUpdate", handleCommentUpdate);
    socket.on("commentDelete", handleCommentDelete);
    
    return () => {
      socket.off("commentUpdate", handleCommentUpdate);
      socket.off("commentDelete", handleCommentDelete);
    };
  }, [socket, id]);

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

  const handleAvatarClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (post.user.hasActiveStory) {
      try {
        const response = await fetch(`/api/user-stories/${post.user.id}`);
        const { success, data: stories } = await response.json();
        
        if (success && stories && stories.length > 0) {
          storyModal.setUserStories([{ userId: post.user.id, stories }]);
          storyModal.setUserId(post.user.id);
          storyModal.setCurrentUserIndex(0);
          storyModal.onOpen();
        }
      } catch (error) {
        console.error("Error fetching stories:", error);
      }
    } else {
      router.push(href);
    }
  };

  // Function to fetch more comments
  const fetchMoreComments = async () => {
    if (isLoadingComments || !hasMore) return;

    setIsLoadingComments(true);
    try {
      const response = await fetch(`/api/posts/${id}/comments?page=${page + 1}&limit=10`);
      const data = await response.json();
      
      if (data.comments) {
        setComments(prev => [...prev, ...data.comments]);
        setPage(prev => prev + 1);
        setHasMore(data.hasMore);
      }
    } catch (error) {
      console.error("Error loading more comments:", error);
    } finally {
      setIsLoadingComments(false);
    }
  };

  if (!mount) return null;

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          router.back();
        }
      }}
    >
      <DialogContentWithoutClose 
        className="flex gap-0 flex-col md:flex-row items-start p-0 md:max-w-5xl lg:max-w-6xl xl:max-w-7xl h-[calc(100vh-80px)] max-h-[calc(100vh-80px)] bg-white dark:bg-neutral-950"
      >
        <DialogTitle className="sr-only">Post by {username}</DialogTitle>
        <div className="relative flex-1 bg-black flex items-center justify-center h-[400px] md:h-full">
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

        <div className="flex flex-col md:w-[350px] lg:w-[450px] h-full max-h-full bg-white dark:bg-black border-l border-neutral-200 dark:border-neutral-800">
          <DialogHeader className="flex p-0 border-b border-neutral-200 dark:border-neutral-800 space-y-0">
            <div className="flex items-center justify-between p-2">
              <div className="flex items-center gap-2">
                <div
                  onClick={handleAvatarClick}
                  className={cn(
                    "relative cursor-pointer",
                    post.user.hasActiveStory && "before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-tr before:from-yellow-400 before:to-fuchsia-600 before:p-[2px] before:w-[calc(100%+4px)] before:h-[calc(100%+4px)] before:-left-[2px] before:-top-[2px]"
                  )}
                >
                  <div className={cn(
                    "relative rounded-full overflow-hidden w-[32px] h-[32px]",
                    post.user.hasActiveStory && "p-[2px] bg-white dark:bg-black"
                  )}>
                    <UserAvatar 
                      user={post.user}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div className="text-sm flex-grow min-w-0">
                  <div className="flex items-center gap-1 flex-wrap">
                    <div className="flex items-center gap-1">
                      <ProfileHoverCard user={post.user}>
                        <Link href={href} className="font-semibold hover:underline truncate">
                          {username}
                        </Link>
                      </ProfileHoverCard>
                      {post.user.verified && <VerifiedBadge className="h-3.5 w-3.5" />}
                    </div>
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-[15px] text-neutral-500 dark:text-neutral-400">with</span>
                        {post.tags.length === 1 ? (
                          <ProfileHoverCard user={post.tags[0].user}>
                            <Link
                              href={`/dashboard/${post.tags[0].user.username}`}
                              className="font-semibold hover:underline text-[15px] inline-flex items-center gap-1"
                            >
                              {post.tags[0].user.username}
                              {post.tags[0].user.verified && <VerifiedBadge className="h-3.5 w-3.5" />}
                            </Link>
                          </ProfileHoverCard>
                        ) : (
                          <button
                            onClick={() => setShowTaggedModal(true)}
                            className="font-semibold hover:underline text-[15px]"
                          >
                            {post.tags.length} others
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  {post.location && (
                    <Link
                      href={`/dashboard/location/${encodeURIComponent(post.location)}`}
                      className="text-xs text-neutral-500 dark:text-neutral-400 hover:underline block mt-0.5"
                    >
                      {post.location}
                    </Link>
                  )}
                </div>
              </div>
              <PostOptions post={post} userId={user?.id} />
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 border-b border-neutral-200 dark:border-neutral-800 scrollbar-hide">
            {post.caption && (
              <div className="px-4 py-3">
                <div className="flex gap-3">
                  <div
                    onClick={handleAvatarClick}
                    className={cn(
                      "relative cursor-pointer",
                      post.user.hasActiveStory && "before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-tr before:from-yellow-400 before:to-fuchsia-600 before:p-[0.5px] before:w-[calc(100%+4px)] before:h-[calc(100%+4px)] before:-left-0.5 before:-top-0.5"
                    )}
                  >
                    <div className={cn(
                      "relative rounded-full overflow-hidden",
                      post.user.hasActiveStory && "p-1"
                    )}>
                      <UserAvatar 
                        user={post.user} 
                        className="h-8 w-8"
                      />
                    </div>
                  </div>
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

            {comments.length > 0 && (
              <div className={cn("w-full", post.caption ? "px-4" : "px-4 pt-3")}>
                <div className={cn("w-full", post.caption && "pt-3 border-t border-neutral-100 dark:border-neutral-800/60")}>
                  {comments.map((comment) => (
                    <Comment
                      key={comment.id}
                      comment={comment}
                      inputRef={inputRef}
                      postUserId={post.user.id}
                      onReply={handleReplyToComment}
                      hasStoryRing={comment.user.hasActiveStory}
                      onAvatarClick={async (e) => {
                        e.preventDefault();
                        if (comment.user.hasActiveStory) {
                          try {
                            const response = await fetch(`/api/user-stories/${comment.user.id}`);
                            const { success, data: stories } = await response.json();
                            
                            if (success && stories && stories.length > 0) {
                              storyModal.setUserStories([{ userId: comment.user.id, stories }]);
                              storyModal.setUserId(comment.user.id);
                              storyModal.setCurrentUserIndex(0);
                              storyModal.onOpen();
                            }
                          } catch (error) {
                            console.error("Error fetching stories:", error);
                          }
                        } else {
                          router.push(`/dashboard/${comment.user.username}`);
                        }
                      }}
                    />
                  ))}

                  {/* Load more comments button */}
                  {hasMore && (
                    <div className="flex justify-center py-4">
                      <button
                        onClick={fetchMoreComments}
                        disabled={isLoadingComments}
                        className={cn(
                          "text-sm font-semibold text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100",
                          "flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                      >
                        {isLoadingComments ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-500 border-t-transparent" />
                            Loading...
                          </>
                        ) : (
                          <>
                            View more comments
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M12 5V19M12 19L19 12M12 19L5 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </ScrollArea>

          <div className="px-4 py-2 border-b border-neutral-200 dark:border-neutral-800">
            <PostActions post={post} userId={user?.id} />
          </div>

          <CommentForm
            postId={id}
            className="px-3 py-2.5"
            inputRef={inputRef}
            ref={commentFormRef}
          />
        </div>
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
