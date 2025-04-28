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
import { EmojiPicker } from "@/components/EmojiPicker";
import { getSocket } from "@/lib/socket";

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

// Define the type for optimistic updates
type OptimisticAction = 
  | { type: 'add'; comment: CommentWithExtras }
  | { type: 'delete'; commentId: string; parentId: string | null }
  | { type: 'like'; commentId: string; userId: string; parentId: string | null };

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
    OptimisticAction
  >(initialComments, (state, action) => {
    switch (action.type) {
      case 'add':
        return [action.comment, ...state];
      case 'delete':
        // First filter out the deleted comment
        const filteredState = state.filter(comment => comment.id !== action.commentId);
        // Then filter out any replies to the deleted comment
        return filteredState.map(comment => {
          if (comment.replies) {
            return {
              ...comment,
              replies: comment.replies.filter(reply => 
                reply.id !== action.commentId && reply.parentId !== action.commentId
              )
            };
          }
          return comment;
        });
      case 'like':
        return state;
    }
  });

  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalComments, setTotalComments] = useState(initialComments.length);
  const [comments, setComments] = useState<CommentWithExtras[]>(initialComments);
  const [replyingTo, setReplyingTo] = useState<{ username: string; commentId: string } | null>(null);
  const commentRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);
  const [deletedCommentIds, setDeletedCommentIds] = useState(new Set<string>());
  const router = useRouter();
  const pathname = usePathname();
  const isPostPage = pathname?.includes("/p/");
  const [newComments] = useState<string[]>([]);

  // Fetch initial comment count
  const fetchCommentCount = async () => {
    // Don't fetch if showPreview is false
    if (!showPreview && !isPostPage) return { comments: [], totalComments: 0, hasMore: false };

    try {
      const response = await fetch(`/api/posts/${postId}/comments?page=1&limit=10`, {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.log('User not authenticated for comments');
          return { comments: [], totalComments: 0, hasMore: false };
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        comments: data.comments || [],
        totalComments: data.totalComments || 0,
        hasMore: data.hasMore || false,
      };
    } catch (error) {
      // In development, log the error but don't throw
      if (process.env.NODE_ENV === 'development') {
        console.log('Comments fetch error (expected in dev):', error);
        return { comments: [], totalComments: 0, hasMore: false };
      }
      // In production, we might want to log this to monitoring
      console.error('Comments fetch error:', error);
      return { comments: [], totalComments: 0, hasMore: false };
    }
  };

  useEffect(() => {
    let mounted = true;

    const loadComments = async () => {
      try {
        const result = await fetchCommentCount();
        if (mounted) {
          setComments(result.comments);
          setTotalComments(result.totalComments);
          setHasMore(result.hasMore);
        }
      } catch (error) {
        // Handle error silently in development
        if (process.env.NODE_ENV !== 'development') {
          console.error('Error loading comments:', error);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    if (postId) {
      loadComments();
    }

    return () => {
      mounted = false;
    };
  }, [postId, initialComments?.length]);

  // Load more comments
  const loadMoreComments = async () => {
    console.log('[Comments] View more comments clicked:', {
      isLoading,
      hasMore,
      currentPage: page,
      currentCommentsCount: optimisticComments.length,
      totalComments
    });

    if (isLoading) {
      console.log('[Comments] Aborting loadMoreComments: Already loading');
      return;
    }

    setIsLoading(true);
    try {
      const nextPage = page + 1;
      console.log('[Comments] Fetching more comments:', {
        postId,
        nextPage,
        limit: 10
      });

      const response = await fetch(`/api/posts/${postId}/comments?page=${nextPage}&limit=10`);
      const data = await response.json();
      
      console.log('[Comments] Received comments data:', {
        success: !!data.comments,
        commentsReceived: data.comments?.length || 0,
        hasMore: data.hasMore,
        totalComments: data.totalComments
      });
      
      if (data.comments) {
        // Filter out any comments that already exist in optimisticComments
        const existingCommentIds = new Set(optimisticComments.map(c => c.id));
        const newComments = data.comments.filter(
          (comment: CommentWithExtras) => !existingCommentIds.has(comment.id)
        );
        
        console.log('[Comments] After filtering:', {
          newCommentsCount: newComments.length,
          filteredOutCount: data.comments.length - newComments.length,
          existingCommentsCount: existingCommentIds.size
        });
        
        // Update state with new comments
        startTransition(() => {
          addOptimisticComment({
            type: 'add',
            comment: data.comments[0]
          });
          setPage(nextPage);
          setHasMore(data.hasMore);
          setTotalComments(data.totalComments);
        });
      }
    } catch (error) {
      console.error("[Comments] Error loading more comments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize cooldown from localStorage on component mount
  useEffect(() => {
    const checkCooldown = () => {
      const storedCooldown = localStorage.getItem('comment_cooldown');
      if (storedCooldown) {
        const cooldownEndTime = parseInt(storedCooldown);
        const now = Date.now();
        if (cooldownEndTime > now) {
          setCooldownTime(Math.ceil((cooldownEndTime - now) / 1000));
        } else {
          localStorage.removeItem('comment_cooldown');
          setCooldownTime(0);
        }
      }
    };

    // Check immediately on mount
    checkCooldown();

    // Set up an interval to check every second
    const interval = setInterval(checkCooldown, 1000);

    return () => clearInterval(interval);
  }, []);

  // Handle cooldown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldownTime > 0) {
      // Store end time in localStorage whenever cooldown changes
      const cooldownEndTime = Date.now() + cooldownTime * 1000;
      localStorage.setItem('comment_cooldown', cooldownEndTime.toString());

      timer = setInterval(() => {
        setCooldownTime((prev) => {
          const newTime = Math.max(0, prev - 1);
          if (newTime === 0) {
            localStorage.removeItem('comment_cooldown');
          }
          return newTime;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [cooldownTime]);

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

      addOptimisticComment({
        type: 'add',
        comment: optimisticComment
      });
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
        addOptimisticComment({
          type: 'add',
          comment: newComments[0]
        });
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

  // Add effect to handle comment deletion events
  useEffect(() => {
    const handleCommentDelete = (event: CustomEvent) => {
      const { commentId, parentId } = event.detail;
      setDeletedCommentIds(prev => {
        const newSet = new Set(prev);
        newSet.add(commentId);
        return newSet;
      });
      addOptimisticComment({ type: 'delete', commentId, parentId });
    };

    window.addEventListener('commentDelete', handleCommentDelete as EventListener);
    return () => {
      window.removeEventListener('commentDelete', handleCommentDelete as EventListener);
    };
  }, [addOptimisticComment]);

  const isDisabled = isSubmitting || (!user?.verified && cooldownTime > 0);
  
  // Update the filtered comments logic
  const filteredComments = useMemo(() => {
    return optimisticComments.filter(comment => {
      // Remove deleted comments
      if (deletedCommentIds.has(comment.id)) return false;
      // Remove comments whose parent was deleted
      if (comment.parentId && deletedCommentIds.has(comment.parentId)) return false;
      
      // Filter replies of each comment
      if (comment.replies) {
        comment.replies = comment.replies.filter(reply => 
          !deletedCommentIds.has(reply.id) && 
          !deletedCommentIds.has(reply.parentId!)
        );
      }
      
      return true;
    });
  }, [optimisticComments, deletedCommentIds]);

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
        key={`${comment.id}-${comment.createdAt}`}
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

  // Submission handler with real-time updates
  const handleSubmit = async (values: z.infer<typeof CreateComment>) => {
    if (!user) {
      toast.error("You must be logged in to comment");
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await createComment(values);
      
      if (result.comment) {
        // Create optimistic comment data
        const optimisticComment = {
          ...result.comment,
          user: user,
          likes: [],
          replies: []
        };

        // Emit socket event for real-time update
        const socket = getSocket();
        if (socket) {
          socket.emit('commentCreate', {
            postId: values.postId,
            comment: optimisticComment
          });
        }

        // Optimistic update using startTransition
        startTransition(() => {
          addOptimisticComment({
            type: 'add',
            comment: optimisticComment
          });
        });

        // Reset form
        form.reset();
        if (typeof setReplyingTo === 'function') {
          setReplyingTo(null);
        }

        // Set cooldown timer for non-verified users
        if (!user.verified) {
          const cooldownEndTime = Date.now() + 15000; // 15 seconds
          localStorage.setItem('comment_cooldown', cooldownEndTime.toString());
          setCooldownTime(15);
        }
      }
    } catch (error) {
      console.error('Error creating comment:', error);
      toast.error('Failed to create comment');
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
    
    // Create a Set of processed comment IDs to avoid duplicates
    const processedCommentIds = new Set<string>();
    
    console.log('[COMMENTS] Found top-level comments:', {
      count: topLevelComments.length,
      ids: topLevelComments.map(c => c.id)
    });
    
    // Sort comments by creation date (newest first)
    const sortedTopLevelComments = topLevelComments
      .filter(comment => {
        // Only include comments that haven't been processed yet
        if (processedCommentIds.has(comment.id)) {
          return false;
        }
        processedCommentIds.add(comment.id);
        return true;
      })
      .sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    
    return sortedTopLevelComments.map((comment) => {
      // Get all replies for this comment
      const replies = comments
        .filter(reply => reply.parentId === comment.id)
        .filter(reply => {
          // Only include replies that haven't been processed yet
          if (processedCommentIds.has(reply.id)) {
            return false;
          }
          processedCommentIds.add(reply.id);
          return true;
        });
      
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
          key={`${comment.id}-${comment.createdAt}`}
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
          onSubmit={form.handleSubmit(handleSubmit)}
          className="relative flex items-center space-x-2 w-full px-3 sm:px-0"
        >
          <div className="flex items-center space-x-2 w-full">
            <EmojiPicker
              onChange={(emoji) => {
                const currentValue = form.getValues("body");
                form.setValue("body", currentValue + emoji);
              }}
            />
            
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
                        if (inputRef && e) {
                          (inputRef as React.MutableRefObject<HTMLInputElement>).current = e;
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          {cooldownTime > 0 ? (
            <div className="text-sm font-semibold text-neutral-500">
              {cooldownTime}s
            </div>
          ) : (
            <button
              type="submit"
              className={cn(
                "text-sky-500 text-sm font-semibold hover:text-sky-700 dark:hover:text-sky-300 disabled:opacity-50 disabled:cursor-not-allowed",
                (form.watch("body")?.length === 0 || isSubmitting) && "opacity-50"
              )}
              disabled={form.watch("body")?.length === 0 || isSubmitting}
            >
              {form.watch("parentId") ? "Reply" : "Post"}
            </button>
          )}
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

      {/* Comments list */}
      {showPreview && (
        <div className="space-y-4 px-3 sm:px-0">
          {renderComments(optimisticComments)}
          
          {totalComments > 10 && hasMore && optimisticComments.length >= 10 && (
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
                `View previous comments (${totalComments - optimisticComments.length} more)`
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default Comments;
