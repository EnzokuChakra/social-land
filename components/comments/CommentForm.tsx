"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MAX_COMMENT_LENGTH = 100;

interface CommentFormProps {
  onSubmit: (content: string) => Promise<void>;
  placeholder?: string;
  buttonText?: string;
}

export function CommentForm({ 
  onSubmit, 
  placeholder = "Write a comment...", 
  buttonText = "Comment" 
}: CommentFormProps) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: session } = useSession();

  const charactersLeft = MAX_COMMENT_LENGTH - content.length;
  const isNearLimit = charactersLeft <= 50;
  const isAtLimit = charactersLeft <= 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session?.user) {
      toast.error("You must be logged in to comment");
      return;
    }

    if (!content.trim()) {
      toast.error("Comment cannot be empty");
      return;
    }

    if (content.length > MAX_COMMENT_LENGTH) {
      toast.error(`Comment cannot exceed ${MAX_COMMENT_LENGTH} characters`);
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(content);
      setContent("");
      toast.success("Comment posted successfully");
    } catch (error) {
      console.error("Error posting comment:", error);
      toast.error("Failed to post comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="relative">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          className="min-h-[80px] resize-none"
          maxLength={MAX_COMMENT_LENGTH}
        />
        {content.length > 0 && isNearLimit && (
          <div className={cn(
            "text-[10px] absolute bottom-1 right-2",
            isAtLimit ? "text-red-500" : "text-amber-500"
          )}>
            {charactersLeft}
          </div>
        )}
      </div>
      <div className="flex justify-end">
        <Button 
          type="submit" 
          disabled={isSubmitting || !content.trim() || content.length > MAX_COMMENT_LENGTH}
          size="sm"
        >
          {buttonText}
        </Button>
      </div>
    </form>
  );
} 