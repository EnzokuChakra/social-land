"use client";

import { createComment } from "@/lib/actions";
import { CreateComment } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Smile, X } from "lucide-react";
import { useForm, UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { useEffect, useState, forwardRef, useImperativeHandle, Ref } from "react";
import { useSocket } from "@/hooks/use-socket";
import { toast } from "react-hot-toast";

const MAX_COMMENT_LENGTH = 1000;

// Export the handle type for TypeScript
export type CommentFormHandle = {
  onReply: (username: string, commentId: string) => void;
};

// Utility function to combine refs
function mergeRefs<T = any>(
  ...refs: (React.Ref<T> | null | undefined)[]
): React.RefCallback<T> {
  return (value) => {
    refs.forEach((ref) => {
      if (typeof ref === 'function') {
        ref(value);
      } else if (ref != null) {
        (ref as React.MutableRefObject<T | null>).current = value;
      }
    });
  };
}

const CommentForm = forwardRef<
  CommentFormHandle,
  {
    postId: string;
    className?: string;
    inputRef?: React.RefObject<HTMLInputElement>;
  }
>(function CommentForm({ postId, className, inputRef }, forwardedRef) {
  const [replyingTo, setReplyingTo] = useState<{username: string, commentId: string} | null>(null);
  const [internalInputRef, setInternalInputRef] = useState<HTMLInputElement | null>(null);
  const socket = useSocket();
  
  const form = useForm<z.infer<typeof CreateComment>>({
    resolver: zodResolver(CreateComment),
    defaultValues: {
      body: replyingTo ? `@${replyingTo.username} ` : '',
      parentId: replyingTo?.commentId || null,
      postId: postId || null,
    },
  });

  // Function to handle reply click from Comment component
  const handleReplyToComment = (username: string, commentId: string) => {
    console.log('CommentForm handleReplyToComment called', { username, commentId });
    
    // Set the replying state with the username and commentId
    setReplyingTo({ username, commentId });
    
    // Update the form values
    form.setValue("body", `@${username} `);
    form.setValue("parentId", commentId);
    
    // Focus the input and ensure it has the parent ID stored for direct access
    if (internalInputRef) {
      internalInputRef.focus();
      (internalInputRef as any).currentParentId = commentId;
    }
  };

  // Expose the reply handler to parent components
  useImperativeHandle(forwardedRef, () => ({
    onReply: handleReplyToComment
  }));

  // Also make the handler available on the input ref if provided
  useEffect(() => {
    if (inputRef && 'current' in inputRef && inputRef.current) {
      console.log('Setting onReply on inputRef.current');
      (inputRef.current as any).onReply = handleReplyToComment;
    }
  }, [inputRef, handleReplyToComment]);

  const body = form.watch("body");
  const isSubmitting = form.formState.isSubmitting;
  const charactersLeft = MAX_COMMENT_LENGTH - (body?.length || 0);
  const isNearLimit = charactersLeft <= 100;
  const isAtLimit = charactersLeft <= 0;

  const handleClearReply = () => {
    setReplyingTo(null);
    form.setValue("parentId", null);
    form.setValue("body", "");
  };

  // Submission handler with real-time updates
  const handleSubmit = async (values: z.infer<typeof CreateComment>) => {
    console.log('Submitting comment', { values, replyingTo });
    
    // Get parentId from either the form values or the replyingTo state
    const parentId = values.parentId || replyingTo?.commentId || null;
    
    try {
      // Create the comment on the server
      const response = await createComment({
        ...values,
        parentId: parentId
      });

      if (!response || response.errors) {
        throw new Error(response?.message || "Failed to create comment");
      }

      // Emit socket event for real-time updates
      if (socket) {
        socket.emit("commentUpdate", {
          postId,
          parentId,
          comment: response.comment,
        });
      }
      
      // Reset form state after success
      form.reset();
      setReplyingTo(null);
    } catch (error) {
      console.error("Error creating comment:", error);
      toast.error("Failed to create comment");
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className={cn(
          "relative border-t border-neutral-200 dark:border-neutral-800 py-3 flex w-full px-3",
          className
        )}
      >
        {isSubmitting && (
          <div className="flex justify-center items-center w-full absolute inset-0 bg-white/80 dark:bg-black/80 z-10">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}
        <div className="flex items-center space-x-2 w-full">
          <button 
            type="button"
            className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          >
            <Smile className="h-5 w-5" />
          </button>
          <div className="w-full flex-1 relative">
            <FormField
              control={form.control}
              name="body"
              render={({ field: { ref: fieldRef, ...fieldProps } }) => {
                return (
                  <FormItem className="w-full flex-1">
                    <FormControl>
                      <input
                        disabled={isSubmitting}
                        type="text"
                        placeholder={replyingTo ? `Reply to @${replyingTo.username}...` : "Add a comment..."}
                        className="bg-transparent text-sm border-none focus:outline-none w-full dark:text-neutral-200 placeholder-neutral-500 disabled:opacity-30"
                        maxLength={MAX_COMMENT_LENGTH}
                        ref={mergeRefs(
                          fieldRef, 
                          (el) => setInternalInputRef(el),
                          inputRef
                        )}
                        {...fieldProps}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
          </div>
          {body.trim().length > 0 && (
            <button
              disabled={isSubmitting || isAtLimit}
              type="submit"
              className="text-sky-500 text-sm font-semibold hover:text-sky-700 dark:hover:text-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Post
            </button>
          )}
        </div>
        
        {body.length > 0 && isNearLimit && (
          <div className={cn(
            "text-[10px] absolute bottom-1 right-14",
            isAtLimit ? "text-red-500" : "text-amber-500"
          )}>
            {charactersLeft}
          </div>
        )}
      </form>
    </Form>
  );
});

export default CommentForm;
