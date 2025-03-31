"use client";

import { createComment } from "@/lib/actions";
import { CommentWithExtras, UserRole, UserStatus } from "@/lib/definitions";
import { CreateComment } from "@/lib/schemas";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { User } from "next-auth";
import Link from "next/link";
import { useOptimistic, useTransition, useRef, useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import CommentComponent from "./Comment";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useRouter, usePathname } from "next/navigation";

// Define interfaces for event types
interface CommentEventDetail {
  body: string;
  postId: string;
  parentId?: string | null;
  createdAt: Date;
}

interface UpdatedCommentsEvent {
  postId: string;
  comments: CommentWithExtras[];
}

// Define a simplified user type for comments
interface CommentUser {
  id: string;
  image: string | null;
  username: string | null;
  name: string | null;
  bio: null;
  verified: boolean;
  email?: string;
  password?: string;
  isPrivate?: boolean;
  role?: string;
  status?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

function Comments({
  postId,
  comments: initialComments,
  user,
  postUserId,
  inputRef,
  showPreview = true,
}: {
  postId: string;
  comments: CommentWithExtras[];
  user?: User | null;
  postUserId: string;
  inputRef?: React.RefObject<HTMLInputElement>;
  showPreview?: boolean;
}) {
  const [optimisticComments, addOptimisticComment] = useOptimistic<
    CommentWithExtras[],
    CommentWithExtras
  >(initialComments, (state, newComment) => [newComment, ...state]);

  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalComments, setTotalComments] = useState(initialComments.length);
  const commentRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);
  const [deletedCommentIds] = useState(new Set<string>());
  const router = useRouter();
  const pathname = usePathname();
  const isPostPage = pathname?.includes("/p/");
  const [newComments] = useState<string[]>([]);

  // Fetch initial comment count
  useEffect(() => {
    const fetchCommentCount = async () => {
      try {
        const response = await fetch(`/api/posts/${postId}/comments?page=1&limit=10`);
        const data = await response.json();
        setTotalComments(data.totalComments);
        setHasMore(data.totalComments > initialComments.length);
      } catch (error) {
        console.error("Error fetching comment count:", error);
      }
    };
    fetchCommentCount();
  }, [postId, initialComments.length]);

  // Load more comments
  const loadMoreComments = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const nextPage = page + 1;
      const response = await fetch(`/api/posts/${postId}/comments?page=${nextPage}&limit=10`);
      const data = await response.json();
      
      if (data.comments) {
        const newComments = data.comments.filter(
          (comment: CommentWithExtras) => 
            !optimisticComments.some(existing => existing.id === comment.id)
        );
        setPage(nextPage);
        setHasMore(data.hasMore);
        
        // Add new comments to the state
        if (newComments.length > 0) {
          newComments.forEach((comment: CommentWithExtras) => {
            addOptimisticComment(comment);
          });
        }
      }
    } catch (error) {
      console.error("Error loading more comments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize cooldown from localStorage on component mount
  useEffect(() => {
    if (!user?.verified) {
      const storedCooldown = localStorage.getItem(`comment_cooldown_${user?.id}`);
      if (storedCooldown) {
        const cooldownEndTime = parseInt(storedCooldown);
        const now = Date.now();
        if (cooldownEndTime > now) {
          setCooldownTime(Math.ceil((cooldownEndTime - now) / 1000));
        } else {
          localStorage.removeItem(`comment_cooldown_${user?.id}`);
        }
      }
    }
  }, [user]);

  // Handle cooldown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldownTime > 0) {
      // Store end time in localStorage whenever cooldown changes
      if (!user?.verified) {
        const cooldownEndTime = Date.now() + cooldownTime * 1000;
        localStorage.setItem(`comment_cooldown_${user?.id}`, cooldownEndTime.toString());
      }

      timer = setInterval(() => {
        setCooldownTime((prev) => {
          const newTime = Math.max(0, prev - 1);
          if (newTime === 0) {
            localStorage.removeItem(`comment_cooldown_${user?.id}`);
          }
          return newTime;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [cooldownTime, user]);

  // Setup listener for real-time comment updates
  useEffect(() => {
    const handleOptimisticComment = (event: CustomEvent<CommentEventDetail>) => {
      console.log('[COMMENTS] Optimistic comment event received:', event.detail);
      
      const { body, postId: commentPostId, parentId, createdAt } = event.detail;
      
      // Only handle comments for this post
      if (commentPostId !== postId || !user) return;
      
      const optimisticComment: CommentWithExtras = {
        id: `temp-${crypto.randomUUID()}`,
        body,
        createdAt,
        user: {
          id: user.id || '',
          image: user.image || null,
          username: user.username || null,
          name: user.name || null,
          bio: null,
          verified: user.verified || false,
          email: user.email || '',
          password: '',
          isPrivate: false,
          role: "NORMAL" as UserRole,
          status: "NORMAL" as UserStatus,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        user_id: user.id || '',
        postId,
        reelId: null,
        updatedAt: new Date(),
        parentId: parentId || null,
        replies: [],
        likes: [],
      };

      console.log('[COMMENTS] Creating optimistic comment:', {
        id: optimisticComment.id,
        parentId: optimisticComment.parentId,
        body: optimisticComment.body
      });

      addOptimisticComment(optimisticComment);
    };

    // Add event listener for real-time updates
    if (typeof window !== 'undefined') {
      window.addEventListener('optimistic-comment-added', 
        handleOptimisticComment as EventListener);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('optimistic-comment-added', 
          handleOptimisticComment as EventListener);
      }
    };
  }, [postId, user, addOptimisticComment]);

  // Add a refresh mechanism that periodically fetches new comments
  useEffect(() => {
    // Poll for new comments every 10 seconds
    // This is a fallback for when the optimistic updates miss something
    const intervalId = setInterval(() => {
      // In a real app, you would fetch new comments here
      // For now, just rely on the optimistic updates
    }, 10000);

    return () => clearInterval(intervalId);
  }, []);

  // Setup listener for real-time comment updates from other users
  useEffect(() => {
    const handleCommentsUpdate = (event: CustomEvent<UpdatedCommentsEvent>) => {
      console.log('Update comments event received:', event.detail);
      
      const { postId: updatedPostId, comments: updatedComments } = event.detail;
      
      // Only handle comments for this post
      if (updatedPostId !== postId) return;
      
      // Compare existing comments with updated comments to avoid unnecessary re-renders
      const existingCommentIds = new Set(optimisticComments.map((c: CommentWithExtras) => c.id));
      const newComments = updatedComments.filter((c: CommentWithExtras) => !existingCommentIds.has(c.id));
      
      if (newComments.length > 0) {
        console.log(`Found ${newComments.length} new comments from other users`);
        
        // Add all new comments
        addOptimisticComment(newComments[0]);
      }
    };

    // Add event listener for comment updates
    if (typeof window !== 'undefined') {
      window.addEventListener('update-comments', 
        handleCommentsUpdate as EventListener);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('update-comments', 
          handleCommentsUpdate as EventListener);
      }
    };
  }, [addOptimisticComment, postId, optimisticComments]);

  const isDisabled = isSubmitting || (!user?.verified && cooldownTime > 0);
  
  // Filter comments to remove deleted ones
  const filteredComments = optimisticComments.filter(comment => 
    !deletedCommentIds.has(comment.id) && 
    !(comment.parentId && deletedCommentIds.has(comment.parentId))
  );

  // Get user comments (for optimistic updates)
  const userComments = filteredComments.filter(comment => 
    comment.user_id === user?.id && newComments.includes(comment.id)
  );
  
  // Get all comments sorted by date (newest first)
  const sortedComments = [...filteredComments].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  
  // Filter only top-level comments (those without a parentId)
  const topLevelComments = sortedComments.filter(comment => 
    !comment.parentId && !deletedCommentIds.has(comment.id)
  );
  
  const userTopLevelComments = userComments.filter(comment => !comment.parentId);
  
  // For optimistic UI updates, we need to check if any of the new comments are replies
  const newReplies = filteredComments.filter(comment => 
    comment.parentId && newComments.includes(comment.id)
  );
  
  // If we have new replies, ensure their parent comments are expanded by passing a prop
  const expandedCommentIds = newReplies.map(reply => reply.parentId!);
  
  // Pass expanded state to comments
  const commentWithExpandState = (comment: CommentWithExtras) => {
    // If this comment has a new reply, we want to show its replies
    const shouldExpandReplies = expandedCommentIds.includes(comment.id);
    
    return (
      <CommentComponent
        key={comment.id}
        comment={comment}
        inputRef={commentRef}
        postUserId={postUserId}
        onReply={handleReplyToComment}
        initialShowReplies={shouldExpandReplies}
      />
    );
  };
  
  // Get top-level comments (no parent)
  const topLevelCommentsMemo = useMemo(() => {
    return optimisticComments.filter(comment => !comment.parentId);
  }, [optimisticComments]);

  // Get comments made by the current user
  const userTopLevelCommentsMemo = useMemo(() => {
    if (!user) return [];
    return topLevelCommentsMemo.filter(comment => comment.user_id === user.id);
  }, [topLevelCommentsMemo, user]);

  // Only show optimistic user comments or the most recent comment on the main feed
  const displayComments = useMemo(() => {
    // If showPreview is false, don't show any comments except optimistic ones
    if (!showPreview && !userTopLevelCommentsMemo.some(c => c.id.startsWith('temp-'))) {
      return [];
    }

    if (isPostPage) {
      return topLevelCommentsMemo;
    }

    // For dashboard view, show only the user's most recent comment or nothing
    const userComment = userTopLevelCommentsMemo[0];
    if (userComment?.id.startsWith('temp-')) {
      return [userComment];
    }

    return [];
  }, [isPostPage, topLevelCommentsMemo, userTopLevelCommentsMemo, showPreview]);

  // Form setup for comment submission
  const form = useForm<z.infer<typeof CreateComment>>({
    resolver: zodResolver(CreateComment),
    defaultValues: {
      body: "",
      postId: postId,
      parentId: null
    },
  });

  // Handle reply to comment
  const handleReplyToComment = (username: string, commentId: string) => {
    if (commentRef.current) {
      commentRef.current.focus();
      commentRef.current.value = `@${username} `;
      // Store the parent comment ID for submission
      form.setValue("parentId", commentId);
      form.setValue("body", `@${username} `);
    }
  };

  // Handle comment submission
  const onSubmit = async (values: z.infer<typeof CreateComment>) => {
    if (!user) return;
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      // Create optimistic comment
      const optimisticComment: CommentWithExtras = {
        id: `temp-${crypto.randomUUID()}`,
        body: values.body,
        createdAt: new Date(),
        user: {
          id: user.id,
          image: user.image || null,
          username: user.username || null,
          name: user.name || null,
          bio: null,
          verified: user.verified || false,
          email: user.email || '',
          password: '',
          isPrivate: false,
          role: "NORMAL" as UserRole,
          status: "NORMAL" as UserStatus,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        user_id: user.id,
        postId: postId,
        reelId: null,
        updatedAt: new Date(),
        parentId: values.parentId || null,
        replies: [],
        likes: [],
      };

      // Add optimistic comment
      addOptimisticComment(optimisticComment);

      // Create actual comment
      const response = await createComment({
        ...values,
        parentId: values.parentId // Ensure parentId is passed
      });

      if (!response || response.errors) {
        throw new Error(response?.message || "Failed to create comment");
      }

      // Reset form and input
      form.reset();
      if (commentRef.current) {
        commentRef.current.value = '';
      }
      // Reset parentId after successful submission
      form.setValue("parentId", null);

      // Set cooldown for non-verified users
      if (!user.verified) {
        setCooldownTime(30);
      }

    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render comments recursively
  const renderComments = (comments: CommentWithExtras[]) => {
    console.log('[COMMENTS] Rendering comments:', {
      totalComments: comments.length,
      commentIds: comments.map(c => ({
        id: c.id,
        parentId: c.parentId,
        hasReplies: Boolean(c.replies?.length)
      }))
    });
    
    // Get top-level comments (those without a parentId)
    const topLevelComments = comments.filter(comment => !comment.parentId);
    
    console.log('[COMMENTS] Found top-level comments:', {
      count: topLevelComments.length,
      ids: topLevelComments.map(c => c.id)
    });
    
    // Sort comments by creation date (newest first)
    const sortedTopLevelComments = topLevelComments.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    return sortedTopLevelComments.map((comment) => {
      // Get all replies for this comment
      const replies = comments.filter(reply => reply.parentId === comment.id);
      
      console.log('[COMMENTS] Processing comment with replies:', {
        commentId: comment.id,
        repliesCount: replies.length,
        replyIds: replies.map(r => r.id)
      });
      
      // Sort replies by creation date (oldest first)
      const sortedReplies = replies.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      
      // Create the comment component with its replies
      const commentWithReplies = {
        ...comment,
        replies: sortedReplies.map(reply => ({
          ...reply,
          replies: [] // Initialize empty replies array for nested replies
        }))
      };
      
      console.log('[COMMENTS] Rendering comment component:', {
        commentId: commentWithReplies.id,
        repliesCount: commentWithReplies.replies.length,
        isExpanded: expandedCommentIds.includes(commentWithReplies.id)
      });
      
      return (
        <CommentComponent
          key={comment.id}
          comment={commentWithReplies}
          postUserId={postUserId}
          inputRef={commentRef}
          onReply={handleReplyToComment}
          initialShowReplies={expandedCommentIds.includes(comment.id)}
        />
      );
    });
  };

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="relative flex items-center space-x-2 w-full px-3 sm:px-0"
        >
          <FormField
            control={form.control}
            name="body"
            render={({ field }) => (
              <FormItem className="flex-grow">
                <FormControl>
                  <input
                    type="text"
                    placeholder={form.watch("parentId") ? "Add a reply..." : "Add a comment..."}
                    className="w-full text-sm py-1 px-3 bg-transparent border-none focus:outline-none dark:text-white disabled:opacity-50"
                    disabled={isSubmitting || cooldownTime > 0}
                    {...field}
                    ref={(e) => {
                      field.ref(e);
                      if (commentRef && 'current' in commentRef && e) {
                        (commentRef as React.MutableRefObject<HTMLInputElement>).current = e;
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <button
            type="submit"
            className={cn(
              "text-sky-500 text-sm font-semibold hover:text-sky-700 dark:hover:text-sky-300 disabled:opacity-50 disabled:cursor-not-allowed",
              (form.watch("body")?.length === 0 || isSubmitting) && "opacity-50"
            )}
            disabled={form.watch("body")?.length === 0 || isSubmitting || cooldownTime > 0}
          >
            {form.watch("parentId") ? "Reply" : "Post"}
          </button>
          {form.watch("parentId") && (
            <button
              type="button"
              onClick={() => {
                form.setValue("parentId", null);
                form.setValue("body", "");
              }}
              className="text-neutral-500 text-sm hover:text-neutral-600 dark:hover:text-neutral-400"
            >
              Cancel
            </button>
          )}
        </form>
      </Form>

      {/* Display cooldown timer if active */}
      {cooldownTime > 0 && !user?.verified && (
        <div className="text-xs text-neutral-500 dark:text-neutral-400 px-3 sm:px-0">
          You can comment again in {cooldownTime} seconds
        </div>
      )}

      {/* Comments list */}
      {showPreview && (
        <div className="space-y-4 px-3 sm:px-0">
          {renderComments(optimisticComments)}
          
          {/* Show View more comments button only when there are more than 10 comments and more to load */}
          {totalComments > 10 && hasMore && (
            <button
              onClick={loadMoreComments}
              disabled={isLoading}
              className="w-full text-sm font-semibold text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 py-2.5 border-t border-neutral-200 dark:border-neutral-800 mt-2"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-500 border-t-transparent" />
                  Loading...
                </div>
              ) : (
                "View more comments"
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default Comments;
