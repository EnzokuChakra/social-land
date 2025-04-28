import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { CommentWithExtras } from "@/lib/definitions";
import { likeComment, unlikeComment } from "@/lib/actions";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { getSocket } from "@/lib/socket";

type Props = {
  comment: CommentWithExtras;
};

export default function CommentLikeButton({ comment }: Props) {
  const { data: session } = useSession();
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const socket = getSocket();

  useEffect(() => {
    if (comment.likes) {
      setLikesCount(comment.likes.length);
      if (session?.user) {
        setIsLiked(comment.likes.some(like => like.user_id === session.user.id));
      }
    }
  }, [comment.likes, session?.user]);

  // Listen for socket updates
  useEffect(() => {
    if (!socket || !comment) return;

    const handleLikeUpdate = (data: { commentId: string; userId: string; action: 'like' | 'unlike' }) => {
      if (data.commentId === comment.id) {
        if (data.action === 'like') {
          setLikesCount(prev => prev + 1);
          if (data.userId === session?.user?.id) {
            setIsLiked(true);
          }
        } else {
          setLikesCount(prev => Math.max(0, prev - 1));
          if (data.userId === session?.user?.id) {
            setIsLiked(false);
          }
        }
      }
    };

    socket.on('commentLikeUpdate', handleLikeUpdate);
    return () => {
      socket.off('commentLikeUpdate', handleLikeUpdate);
    };
  }, [socket, comment?.id, session?.user?.id]);

  const handleLikeClick = async () => {
    if (!session?.user || isLoading) return;
    
    setIsLoading(true);
    try {
      const action = isLiked ? 'unlike' : 'like';
      
      // Optimistic update
      setIsLiked(!isLiked);
      setLikesCount(prev => action === 'like' ? prev + 1 : Math.max(0, prev - 1));

      // Emit socket event
      if (socket) {
        socket.emit('commentLikeUpdate', {
          commentId: comment.id,
          userId: session.user.id,
          action
        });
      }

      // Make API call
      if (action === 'like') {
        await likeComment(comment.id);
      } else {
        await unlikeComment(comment.id);
      }
    } catch (error) {
      toast.error("Something went wrong");
      // Revert optimistic update
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