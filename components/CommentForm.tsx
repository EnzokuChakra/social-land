"use client";

import { createComment } from "@/lib/actions";
import { CreateComment } from "@/lib/schemas";
import { cn, containsUrl } from "@/lib/utils";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm, UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { useEffect, useState, forwardRef, useImperativeHandle, Ref } from "react";
import { toast } from "react-hot-toast";
import { useSession } from "next-auth/react";
import { getSocket } from "@/lib/socket";
import { EmojiPicker } from "./EmojiPicker";

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
  const { data: session, status } = useSession();
  const [replyingTo, setReplyingTo] = useState<{username: string, commentId: string} | null>(null);
  const [internalInputRef, setInternalInputRef] = useState<HTMLInputElement | null>(null);
  const [cooldownTime, setCooldownTime] = useState(0);
  const socket = getSocket();
  
  const form = useForm<z.infer<typeof CreateComment>>({
    resolver: zodResolver(CreateComment),
    defaultValues: {
      body: replyingTo ? `@${replyingTo.username} ` : '',
      parentId: replyingTo?.commentId || null,
      postId: postId || null,
    },
  });

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

    // Listen for storage events from other tabs/windows
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'comment_cooldown') {
        checkCooldown();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
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

  // Function to handle reply click from Comment component
  const handleReplyToComment = (username: string, commentId: string) => {
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
    if (containsUrl(values.body)) {
      toast.error("URLs are not allowed in comments");
      return;
    }

    // Get parentId from either the form values or the replyingTo state
    const parentId = values.parentId || replyingTo?.commentId || null;
    
    try {
      // Create the comment on the server
      const response = await createComment({
        ...values,
        parentId: parentId
      });

      if (!response || !response.comment) {
        throw new Error(response?.message || "Failed to create comment");
      }

      // Emit socket event for real-time updates
      if (socket) {
        socket.emit("commentCreate", {
          postId,
          parentId,
          comment: response.comment,
        });
      }
      
      // Reset form state after success
      form.reset();
      setReplyingTo(null);

      // Set cooldown timer for non-verified users
      if (!session?.user?.verified) {
        const cooldownEndTime = Date.now() + 15000; // 15 seconds
        localStorage.setItem('comment_cooldown', cooldownEndTime.toString());
        setCooldownTime(15);
      }
    } catch (error) {
      console.error("Error creating comment:", error);
      toast.error("Failed to create comment");
    }
  };

  const isDisabled = isSubmitting || (!session?.user?.verified && cooldownTime > 0);

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
          <EmojiPicker
            onChange={(emoji) => {
              const currentValue = form.getValues("body");
              form.setValue("body", currentValue + emoji);
            }}
          />
          
          <FormField
            control={form.control}
            name="body"
            render={({ field: { ref: fieldRef, ...fieldProps } }) => {
              return (
                <FormItem className="w-full flex-1">
                  <FormControl>
                    <input
                      disabled={isDisabled}
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
        {cooldownTime > 0 ? (
          <div className="text-sm font-semibold text-neutral-500">
            {cooldownTime}s
          </div>
        ) : (
          <button
            disabled={isDisabled || isAtLimit || !body.trim()}
            type="submit"
            className="text-sky-500 text-sm font-semibold hover:text-sky-700 dark:hover:text-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Post
          </button>
        )}
        
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
