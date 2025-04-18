import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { CommentWithExtras } from "@/lib/definitions";
import { likeComment, unlikeComment } from "@/lib/actions";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

type Props = {
  comment: CommentWithExtras;
};

export default function CommentLikeButton({ comment }: Props) {
  const { data: session } = useSession();
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (comment.likes) {
      setLikesCount(comment.likes.length);
      if (session?.user) {
        setIsLiked(comment.likes.some(like => like.user_id === session.user.id));
      }
    }
  }, [comment.likes, session?.user]);

  const handleLikeClick = async () => {
    if (!session?.user || isLoading) return;
    
    setIsLoading(true);
    try {
      if (isLiked) {
        await unlikeComment(comment.id);
        setLikesCount(prev => prev - 1);
        setIsLiked(false);
      } else {
        await likeComment(comment.id);
        setLikesCount(prev => prev + 1);
        setIsLiked(true);
      }
    } catch (error) {
      toast.error("Something went wrong");
      // Revert the optimistic update
      setIsLiked(!isLiked);
      setLikesCount(comment.likes?.length || 0);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleLikeClick}
      disabled={isLoading || !session?.user}
      className={cn(
        "flex items-center gap-1 text-sm",
        isLiked ? "text-red-500" : "text-neutral-600 dark:text-neutral-400",
        "hover:text-red-500 dark:hover:text-red-500"
      )}
    >
      <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
      {likesCount > 0 && (
        <span className="font-medium">{likesCount}</span>
      )}
    </button>
  );
} 