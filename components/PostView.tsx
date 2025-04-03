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
import { Flag, X, MoreHorizontal, ChevronLeft } from "lucide-react";
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
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { getSocket } from "@/lib/socket";

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
  const socket = getSocket();
  const isMobile = useMediaQuery("(max-width: 768px)");
  
  // Initialize currentPost with expanded likes data
  const [currentPost, setCurrentPost] = useState<PostWithExtras>({
    ...post,
    likes: post.likes || [],
    savedBy: post.savedBy || [],
    comments: post.comments || [],
    tags: post.tags || []
  });

  useEffect(() => {
    setIsOpen(true);
  }, [id]);

  useEffect(() => {
    if (!socket) return;

    const handleCommentUpdate = (data: { postId: string; parentId: string | null; comment: any }) => {
      if (data.postId !== id) return;

      setComments(prevComments => {
        if (data.parentId) {
          return prevComments.map(comment => {
            if (comment.id === data.parentId) {
              return {
                ...comment,
                replies: [...(comment.replies || []).map(reply => ({ ...reply })), data.comment],
              };
            }
            return { ...comment, replies: comment.replies ? [...comment.replies] : [] };
          });
        } else {
          return [{ ...data.comment }, ...prevComments]; // Ensure new object reference
        }
      });
    };

    const handleCommentDelete = (data: { postId: string; commentId: string; parentId: string | null }) => {
      if (data.postId === id) {
        setComments(prevComments => {
          if (data.parentId) {
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

  // Update currentPost when post prop changes
  useEffect(() => {
    setCurrentPost(prevPost => ({
      ...prevPost,
      ...post,
      likes: post.likes || prevPost.likes,
      savedBy: post.savedBy || prevPost.savedBy,
      comments: post.comments || prevPost.comments,
      tags: post.tags || prevPost.tags
    }));
  }, [post]);

  useEffect(() => {
    if (!socket) return;

    const handleLikeUpdate = (data: any) => {
      if (data.post?.id === id) {
        setCurrentPost(prevPost => ({
          ...prevPost,
          ...data.post,
          likes: data.post.likes || prevPost.likes
        }));
      }
    };

    socket.on("likeUpdate", handleLikeUpdate);

    return () => {
      socket.off("likeUpdate", handleLikeUpdate);
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
    if (commentFormRef.current) {
      commentFormRef.current.onReply(username, commentId);
      return;
    }
    
    if (inputRef.current && 'onReply' in inputRef.current && typeof inputRef.current.onReply === 'function') {
      inputRef.current.onReply(username, commentId);
      return;
    }
    
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.value = `@${username} `;
      (inputRef.current as any).currentParentId = commentId;
      
      try {
        const event = new Event('input', { bubbles: true });
        inputRef.current.dispatchEvent(event);
      } catch (error) {
        console.error('Error dispatching input event:', error);
      }
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
      const nextPage = page + 1;
      const response = await fetch(`/api/posts/${id}/comments?page=${nextPage}&limit=10`);
      const data = await response.json();

      if (data.comments?.length > 0) {
        const existingIds = new Set(comments.map(c => c.id));
        const newComments = data.comments.filter(
          (comment: CommentWithExtras) => !existingIds.has(comment.id)
        );

        if (newComments.length > 0) {
          setComments(prev => [...prev, ...newComments]);
          setPage(nextPage);
        }
        setHasMore(data.hasMore);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error fetching more comments:", error);
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
        className={cn(
          "flex gap-0 flex-col md:flex-row items-start p-0",
          "md:max-w-5xl lg:max-w-6xl xl:max-w-7xl",
          "h-[100dvh] md:h-[calc(100vh-80px)]",
          "max-h-[100dvh] md:max-h-[calc(100vh-80px)]",
          "bg-white dark:bg-neutral-950",
          "overflow-y-auto md:overflow-hidden"
        )}
      >
        {/* Mobile Back Button */}
        {isMobile && (
          <button
            onClick={() => router.back()}
            className="fixed top-4 left-4 z-50 p-2 rounded-full bg-black/50 text-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        <DialogTitle className="sr-only">Post by {username}</DialogTitle>
        
        {/* Mobile Layout */}
        {isMobile ? (
          <div className="w-full flex flex-col pb-[60px]">
            {/* Image Section */}
            <div className="w-full bg-black flex items-center justify-center">
              <Image
                src={post.fileUrl}
                alt={post.caption || "Post image"}
                className={cn(
                  "w-full h-auto",
                  post.aspectRatio === 1 ? "object-cover" : "object-contain"
                )}
                width={1200}
                height={1200}
                priority
                quality={100}
              />
            </div>

            {/* Content Section */}
            <div className="flex flex-col w-full bg-white dark:bg-black">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-3">
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
                    <div className="flex items-center gap-1">
                      <ProfileHoverCard user={post.user}>
                        <Link href={href} className="font-semibold hover:underline truncate">
                          {username}
                        </Link>
                      </ProfileHoverCard>
                      {post.user.verified && <VerifiedBadge className="h-3.5 w-3.5" />}
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

              {/* Caption */}
              {post.caption && (
                <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
                  <div className="flex gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <ProfileHoverCard user={post.user}>
                          <Link href={href} className="font-semibold hover:underline">
                            {username}
                          </Link>
                        </ProfileHoverCard>
                        {post.user.verified && <VerifiedBadge className="h-3.5 w-3.5" />}
                      </div>
                      <p className="text-sm whitespace-pre-line break-words mt-0.5">{post.caption}</p>
                      <Timestamp className="text-xs text-neutral-500 dark:text-neutral-400 mt-1" createdAt={post.createdAt} />
                    </div>
                  </div>
                </div>
              )}

              {/* Comments */}
              {comments.length > 0 && (
                <div className="px-4 py-2">
                  {comments.map((comment) => (
                    <Comment
                      key={`${comment.id}-${comment.createdAt}`}
                      comment={comment} 
                      replies={comment.replies}
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

                  {hasMore && (
                    <button
                      onClick={fetchMoreComments}
                      disabled={isLoadingComments}
                      className={cn(
                        "text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300",
                        "py-3 w-full text-center",
                        isLoadingComments && "cursor-not-allowed opacity-50"
                      )}
                    >
                      {isLoadingComments ? "Loading..." : "Load more comments"}
                    </button>
                  )}
                </div>
              )}

              {/* Actions and Comment Form */}
              <div className="px-4 py-2 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black">
                <PostActions
                  post={currentPost}
                  userId={user?.id}
                  className="pb-2"
                  inputRef={inputRef}
                />
                <CommentForm
                  ref={commentFormRef}
                  postId={id}
                  className="pt-3 mt-2 border-t border-neutral-200 dark:border-neutral-800"
                  inputRef={inputRef}
                />
              </div>
            </div>
          </div>
        ) : (
          // Desktop Layout
          <>
            {/* Image Section */}
            <div className={cn(
              "relative flex-1 bg-black flex items-center justify-center",
              "h-full w-auto",
              "min-h-0",
              "max-h-full"
            )}>
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

            {/* Content Section */}
            <div className={cn(
              "flex flex-col",
              "w-[350px] lg:w-[450px]",
              "h-full",
              "bg-white dark:bg-black",
              "border-l border-neutral-200 dark:border-neutral-800",
              "overflow-hidden"
            )}>
              {/* Header */}
              <DialogHeader className="flex-shrink-0 p-0 border-b border-neutral-200 dark:border-neutral-800 space-y-0">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
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
                      <div className="flex items-center gap-1">
                        <ProfileHoverCard user={post.user}>
                          <Link href={href} className="font-semibold hover:underline truncate">
                            {username}
                          </Link>
                        </ProfileHoverCard>
                        {post.user.verified && <VerifiedBadge className="h-3.5 w-3.5" />}
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

              {/* Scrollable Content */}
              <ScrollArea className="flex-1">
                {/* Caption */}
                {post.caption && (
                  <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
                    <div className="flex gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <ProfileHoverCard user={post.user}>
                            <Link href={href} className="font-semibold hover:underline">
                              {username}
                            </Link>
                          </ProfileHoverCard>
                          {post.user.verified && <VerifiedBadge className="h-3.5 w-3.5" />}
                        </div>
                        <p className="text-sm whitespace-pre-line break-words mt-0.5">{post.caption}</p>
                        <Timestamp className="text-xs text-neutral-500 dark:text-neutral-400 mt-1" createdAt={post.createdAt} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Comments */}
                {comments.length > 0 && (
                  <div className="px-4 py-2">
                    {comments.map((comment) => (
                      <Comment
                        key={`${comment.id}-${comment.createdAt}`}
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

                    {hasMore && (
                      <button
                        onClick={fetchMoreComments}
                        disabled={isLoadingComments}
                        className={cn(
                          "text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300",
                          "py-3 w-full text-center",
                          isLoadingComments && "cursor-not-allowed opacity-50"
                        )}
                      >
                        {isLoadingComments ? "Loading..." : "Load more comments"}
                      </button>
                    )}
                  </div>
                )}
              </ScrollArea>

              {/* Actions and Comment Form */}
              <div className="flex-shrink-0 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black">
                <div className="px-4 py-2 flex flex-col gap-2">
                  <PostActions
                    post={currentPost}
                    userId={user?.id}
                    className="pb-2"
                    inputRef={inputRef}
                  />
                  <CommentForm
                    ref={commentFormRef}
                    postId={id}
                    className="pt-3 mt-2 border-t border-neutral-200 dark:border-neutral-800"
                    inputRef={inputRef}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContentWithoutClose>

      {/* Tagged Users Modal */}
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
