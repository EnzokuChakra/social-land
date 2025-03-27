"use client";

import { createComment } from "@/lib/actions";
import { CommentWithExtras } from "@/lib/definitions";
import { CreateComment } from "@/lib/schemas";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Comment } from "@prisma/client";
import { User } from "next-auth";
import Link from "next/link";
import { useOptimistic, useTransition, useRef, useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import CommentComponent from "./Comment";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  comments,
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
  const [optimisticComments, addOptimisticComment] = useOptimistic(
    comments,
    (state: CommentWithExtras[], newComment: CommentWithExtras): CommentWithExtras[] => {
      // If it's an existing comment (from real-time update)
      if (!newComment.id.startsWith('temp-') && state.some(c => c.id === newComment.id)) {
        return state;
      }
      
      // If it's a reply
      if (newComment.parentId) {
        return state.map(comment => {
          if (comment.id === newComment.parentId) {
            return {
              ...comment,
              replies: [...(comment.replies || []), newComment],
            };
          }
          return comment;
        });
      }
      
      // It's a new top-level comment
      return [newComment, ...state];
    }
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);
  const [newComments, setNewComments] = useState<string[]>([]);
  const defaultCommentRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const isPostPage = pathname.includes(`/dashboard/p/${postId}`);
  const [showNewCommentsIndicator, setShowNewCommentsIndicator] = useState(false);

  // Use the passed inputRef if available, otherwise use the default one
  const commentRef = inputRef || defaultCommentRef;

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
      console.log('Optimistic comment event received:', event.detail);
      
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
          role: 'USER',
          status: 'NORMAL',
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
        parent: null,
      };

      startTransition(() => {
        addOptimisticComment(optimisticComment);
        setNewComments(prev => [...prev, optimisticComment.id]);
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
  }, [addOptimisticComment, postId, user]);

  // Add a state to track deleted comments
  const [deletedCommentIds, setDeletedCommentIds] = useState<Set<string>>(new Set());

  // Setup listener for real-time comment deletions
  useEffect(() => {
    const handleCommentDeleted = (event: CustomEvent) => {
      console.log('Comment deleted event received:', event.detail);
      
      const { commentId, parentId } = event.detail;
      
      // Add the deleted comment ID to our tracking set
      setDeletedCommentIds(prevIds => {
        const newIds = new Set(prevIds);
        newIds.add(commentId);
        return newIds;
      });
    };

    // Add event listener for real-time updates
    if (typeof window !== 'undefined') {
      window.addEventListener('comment-deleted', 
        handleCommentDeleted as EventListener);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('comment-deleted', 
          handleCommentDeleted as EventListener);
      }
    };
  }, []);

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
      
      // Don't update comments during optimistic updates to prevent conflicts
      if (isPending) return;
      
      // Compare existing comments with updated comments to avoid unnecessary re-renders
      const existingCommentIds = new Set(optimisticComments.map((c: CommentWithExtras) => c.id));
      const newComments = updatedComments.filter((c: CommentWithExtras) => !existingCommentIds.has(c.id));
      
      if (newComments.length > 0) {
        console.log(`Found ${newComments.length} new comments from other users`);
        
        // Show visual indicator
        setShowNewCommentsIndicator(true);
        
        // Hide indicator after 3 seconds
        setTimeout(() => {
          setShowNewCommentsIndicator(false);
        }, 3000);
        
        // Add all new comments
        startTransition(() => {
          // We need to add each comment individually to maintain the correct state
          newComments.forEach((newComment: CommentWithExtras) => {
            // Skip temp comments
            if (newComment.id.startsWith('temp-')) return;
            
            // Add the new comment to the state
            addOptimisticComment({
              ...newComment,
              // Convert date strings to Date objects
              createdAt: new Date(newComment.createdAt),
              updatedAt: new Date(newComment.updatedAt),
              replies: newComment.replies?.map((reply: CommentWithExtras) => ({
                ...reply,
                createdAt: new Date(reply.createdAt),
                updatedAt: new Date(reply.updatedAt),
              })) || [],
              likes: [],
              parent: null,
            });
          });
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
  }, [addOptimisticComment, postId, optimisticComments, isPending]);

  const isDisabled = isPending || isSubmitting || (!user?.verified && cooldownTime > 0);
  
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

  // Handle reply to comment
  const handleReplyToComment = (username: string, commentId: string) => {
    console.log('Comments handleReplyToComment', { username, commentId });
    
    if (!commentRef.current) return;

    // Focus the input and set the value
    commentRef.current.focus();
    commentRef.current.value = `@${username} `;
    
    // Store the comment ID for submission - this will be either the original comment ID
    // or the parent comment ID if this is a nested reply
    (commentRef.current as any).currentParentId = commentId;
    
    // Trigger an input event to ensure other handlers detect the change
    const inputEvent = new Event('input', { bubbles: true });
    commentRef.current.dispatchEvent(inputEvent);
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!commentRef.current?.value.trim() || isSubmitting || (!user?.verified && cooldownTime > 0) || !user) return;
    
    setIsSubmitting(true);
    const input = commentRef.current;
    const comment = input.value;
    input.value = "";

    // Get the parent ID if this is a reply
    let parentId: string | null = null;
    if ('currentParentId' in input && typeof input.currentParentId === 'string') {
      parentId = input.currentParentId;
      // Clear the stored parentId after using it
      input.currentParentId = undefined;
    }

    try {
      const optimisticComment: CommentWithExtras = {
        id: `temp-${crypto.randomUUID()}`,
        body: comment,
        createdAt: new Date(),
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
          role: 'USER',
          status: 'NORMAL',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        user_id: user.id || '',
        postId,
        reelId: null,
        updatedAt: new Date(),
        parentId,
        replies: [],
        likes: [],
        parent: null,
      };

      startTransition(() => {
        addOptimisticComment(optimisticComment);
        setNewComments(prev => [...prev, optimisticComment.id]);
      });

      const response = await createComment({
        body: comment,
        postId,
        parentId: parentId || undefined,
      });

      // Only throw error if we have actual error messages
      if (response?.errors) {
        input.value = comment; // Restore the comment text
        // Get the first error message from any field, or use a default message
        const errorMessage = Object.values(response.errors)
          .flat()
          .filter(Boolean)[0] || "Error posting comment";
        throw new Error(errorMessage);
      }

      // Set cooldown timer for non-verified users
      if (!user?.verified) {
        setCooldownTime(15);
      }

      // Show success message
      toast.success(response?.message || "Comment posted successfully");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Error posting comment");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col space-y-4">
      {showNewCommentsIndicator && (
        <div className="text-center py-2 text-sm text-blue-500 animate-pulse">
          New comments added
        </div>
      )}
      
      <div className="space-y-3 w-full px-3 sm:px-0">
        {displayComments.map(comment => commentWithExpandState(comment))}
      </div>
      
      <form
        onSubmit={handleSubmit}
        className="flex items-center space-x-2 px-3 py-2"
      >
        <input
          type="text"
          ref={commentRef}
          placeholder="Add a comment..."
          className="w-full bg-transparent focus:outline-none"
          disabled={isDisabled}
        />
        {!user?.verified && cooldownTime > 0 ? (
          <span className="text-sm font-semibold text-neutral-500">
            {Math.floor(cooldownTime / 60)}:{(cooldownTime % 60).toString().padStart(2, '0')}
          </span>
        ) : (
          <button
            type="submit"
            disabled={isDisabled}
            className={cn(
              "text-sky-500 text-sm font-semibold hover:text-sky-700 disabled:hover:text-sky-500 disabled:opacity-50 transition",
              isDisabled && "opacity-50 cursor-not-allowed"
            )}
          >
            Post
          </button>
        )}
      </form>
    </div>
  );
}

export default Comments;
