"use client";

import { CommentWithExtras } from "@/lib/definitions";
import CommentOptions from "@/components/CommentOptions";
import UserAvatar from "@/components/UserAvatar";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Timestamp from "./Timestamp";
import { RefObject } from "react";
import VerifiedBadge from "./VerifiedBadge";
import { useEffect, useState } from "react";
import ProfileHoverCard from "./ProfileHoverCard";
import { Heart, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { likeComment, unlikeComment } from "@/lib/actions";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import FollowButton from "./FollowButton";
import { useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket";

type Props = {
  comment: CommentWithExtras;
  replies?: CommentWithExtras[];
  inputRef?: RefObject<HTMLInputElement>;
  postUserId: string;
  onReply?: (username: string, commentId: string) => void;
  initialShowReplies?: boolean;
  hasStoryRing?: boolean;
  onAvatarClick?: (e: React.MouseEvent) => Promise<void>;
};

type CommentLikeState = {
  id: string;
  user_id: string;
  user: {
    id: string;
    username: string | null;
    name: string | null;
    image: string | null;
    verified: boolean;
  };
};

function Comment({ comment: initialComment, replies, inputRef, postUserId, onReply, initialShowReplies = false, hasStoryRing, onAvatarClick }: Props) {
  const [comment, setComment] = useState<CommentWithExtras | null>(initialComment);
  const [likesCount, setLikesCount] = useState(initialComment.likes?.length || 0);
  const [likes, setLikes] = useState<CommentLikeState[]>(initialComment.likes?.map(like => ({
    id: like.id,
    user_id: like.user_id,
    user: {
      id: like.user.id,
      username: like.user.username || null,
      name: like.user.name || null,
      image: like.user.image || null,
      verified: like.user.verified || false
    }
  })) || []);
  const [isLiked, setIsLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [showLikesModal, setShowLikesModal] = useState(false);
  const { data: session, status } = useSession();
  const [showOptions, setShowOptions] = useState(false);
  const router = useRouter();
  const socket = getSocket();

  // Handle comment deletion event
  useEffect(() => {
    const handleCommentDelete = (event: CustomEvent) => {
      if (!comment) return;

      if (event.detail.commentId === comment.id) {
        // If this is the deleted comment, remove it from the UI
        setComment(null);
      } else if (comment.replies) {
        // If this is a parent comment, remove the deleted reply
        setComment({
          ...comment,
          replies: comment.replies.filter(reply => reply.id !== event.detail.commentId)
        });
      }
    };

    window.addEventListener('commentDelete', handleCommentDelete as EventListener);
    return () => {
      window.removeEventListener('commentDelete', handleCommentDelete as EventListener);
    };
  }, [comment]);

  // Auto-expand comments with new replies
  useEffect(() => {
    if (replies && replies.length > 0) {
      const hasNewReplies = replies.some(
        reply => new Date().getTime() - new Date(reply.createdAt).getTime() < 5000
      );
      
      if (hasNewReplies) {
        setShowReplies(true);
      }
    }
  }, [replies]);

  // Initialize likes count and liked status from the actual comment data
  useEffect(() => {
    if (!comment) return;
    
    if (status === "authenticated" && comment.likes) {
      const isCommentOwner = comment.user_id === session?.user.id;
      const isPostOwner = postUserId === session?.user.id;
      setShowOptions(true);
      setIsLiked(comment.likes.some(like => like.user_id === session?.user.id) || false);
    }
  }, [status, session, comment?.user_id, postUserId, comment?.likes, comment?.id]);

  // Debug socket connection
  useEffect(() => {
    if (socket) {
      console.log("[Comment] Socket connected:", socket.id);
    } else {
      console.log("[Comment] Socket not connected");
    }
  }, [socket]);

  // Socket event listener for real-time like updates
  useEffect(() => {
    if (!socket || !comment) return;

    const handleLikeUpdate = (data: { commentId: string; userId: string; action: 'like' | 'unlike'; timestamp: string }) => {
      if (data.commentId === comment.id) {
        // Only update the count if it's from another user
        if (session?.user?.id !== data.userId) {
          setLikesCount(prev => {
            const newCount = data.action === 'like' ? prev + 1 : Math.max(0, prev - 1);
            return newCount;
          });

          // Update likes array
          setLikes(prev => {
            if (data.action === 'like') {
              return [...prev, {
                id: data.timestamp,
                user_id: data.userId,
                user: {
                  id: session?.user?.id || '',
                  username: session?.user?.username || null,
                  name: session?.user?.name || null,
                  image: session?.user?.image || null,
                  verified: session?.user?.verified || false
                }
              }];
            } else {
              return prev.filter(like => like.user_id !== data.userId);
            }
          });
        }
        
        // Update isLiked only for the current user
        if (session?.user?.id === data.userId) {
          setIsLiked(data.action === 'like');
        }
      }
    };

    socket.on("commentLikeUpdate", handleLikeUpdate);
    return () => {
      socket.off("commentLikeUpdate", handleLikeUpdate);
    };
  }, [socket, comment?.id, session?.user?.id, session?.user]);

  // Initialize show replies state from prop when it changes
  useEffect(() => {
    if (initialShowReplies) {
      setShowReplies(true);
    }
  }, [initialShowReplies]);

  // If comment was deleted, don't render anything
  if (!comment) return null;

  // Ensure we have a valid user object, even for deleted users
  const user = comment.user || {
    id: 'deleted',
    username: 'deleted',
    name: 'Deleted User',
    image: null,
    verified: false,
    email: null,
    bio: null,
    isPrivate: false,
    role: 'USER' as const,
    status: 'NORMAL' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const username = user.username || "deleted";
  const href = username === "deleted" ? "#" : `/dashboard/${username}`;
  
  // Check if comment has replies
  const hasReplies = replies && replies.length > 0;
  
  const handleLikeClick = async () => {
    if (!session?.user?.id || !comment) return;
    
    setIsLoading(true);
    try {
      if (isLiked) {
        await unlikeComment(comment.id);
        setLikesCount(prev => prev - 1);
        setLikes(prev => prev.filter(like => like.user_id !== session.user.id));
        setIsLiked(false);
        
        if (socket) {
          socket.emit("commentLikeUpdate", {
            commentId: comment.id,
            userId: session.user.id,
            action: "unlike"
          });
        }
      } else {
        await likeComment(comment.id);
        setLikesCount(prev => prev + 1);
        setLikes(prev => [...prev, {
          id: Date.now().toString(),
          user_id: session.user.id,
          user: {
            id: session.user.id,
            username: session.user.username || null,
            name: session.user.name || null,
            image: session.user.image || null,
            verified: session.user.verified || false
          }
        }]);
        setIsLiked(true);
        
        if (socket) {
          socket.emit("commentLikeUpdate", {
            commentId: comment.id,
            userId: session.user.id,
            action: "like"
          });
        }
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReplyClick = () => {
    if (!username) return;
    
    // For replies, we want to reply to the original top-level comment
    // This ensures replies are grouped together properly
    const targetCommentId = comment.parentId || comment.id;
    
    if (onReply) {
      onReply(username, targetCommentId);
    } else if (inputRef?.current) {
      // Direct manipulation of input
      inputRef.current.focus();
      inputRef.current.value = `@${username} `;
      
      // Store the parent ID for submission
      (inputRef.current as any).currentParentId = targetCommentId;
      
      // Trigger input event to ensure form state updates
      try {
        const event = new Event('input', { bubbles: true });
        inputRef.current.dispatchEvent(event);
      } catch (e) {
        const event = document.createEvent('Event');
        event.initEvent('input', true, true);
        inputRef.current.dispatchEvent(event);
      }
    }
  };

  const handleLikesModalOpen = async () => {
    setShowLikesModal(true);
  };

  return (
    <>
      <div className="group w-full py-2 flex items-start relative">
        <div className="flex-shrink-0 mr-3">
          <ProfileHoverCard user={user}>
            <div
              onClick={onAvatarClick}
              className={cn(
                "relative cursor-pointer",
                hasStoryRing && "before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-tr before:from-yellow-400 before:to-fuchsia-600 before:p-[2px] before:w-[calc(100%+4px)] before:h-[calc(100%+4px)] before:-left-[2px] before:-top-[2px]"
              )}
            >
              <div className={cn(
                "relative rounded-full overflow-hidden",
                hasStoryRing && "p-[2px] bg-white dark:bg-black"
              )}>
                <UserAvatar user={user} className="h-8 w-8 object-cover" />
              </div>
            </div>
          </ProfileHoverCard>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm">
            <span className="inline-flex items-center">
              <ProfileHoverCard user={user}>
                <Link href={href}>
                  <span className="font-semibold hover:underline">
                    {username}
                  </span>
                </Link>
              </ProfileHoverCard>
              {user.verified && <VerifiedBadge className="h-4 w-4 fill-sky-600 flex-shrink-0 ml-1" />}
            </span>
            <span className="text-neutral-800 dark:text-neutral-200 ml-1">
              {comment.body}
            </span>
          </div>
          <div className="flex items-center mt-1 space-x-3 text-neutral-500 text-[11px]">
            <Timestamp createdAt={comment.createdAt} className="text-[11px]" />
            {likesCount > 0 && (
              <button 
                onClick={handleLikesModalOpen} 
                className="font-semibold hover:underline text-[11px]"
              >
                {likesCount} {likesCount === 1 ? 'like' : 'likes'}
              </button>
            )}
            <button
              className="font-semibold text-[11px]"
              onClick={handleReplyClick}
            >
              Reply
            </button>
            <button
              onClick={handleLikeClick}
              disabled={isLoading}
              className={cn(
                "flex items-center hover:opacity-70 transition",
                isLoading && "cursor-not-allowed opacity-50"
              )}
            >
              <Heart 
                className={cn(
                  "h-3.5 w-3.5 flex-shrink-0", 
                  isLiked ? "text-red-500 fill-red-500" : "text-neutral-500"
                )} 
              />
            </button>
            {showOptions && (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <CommentOptions comment={comment} postUserId={postUserId} />
              </div>
            )}
          </div>
          
          {/* Show/Hide Replies Button */}
          {hasReplies && (
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="flex items-center mt-2 space-x-1 text-neutral-500 text-[11px] font-semibold hover:text-neutral-700 dark:hover:text-neutral-300"
            >
              <div className="flex items-center">
                {showReplies ? (
                  <ChevronUp className="h-3 w-3 mr-1" />
                ) : (
                  <ChevronDown className="h-3 w-3 mr-1" />
                )}
                {showReplies ? "Hide replies" : `View ${replies?.length} ${replies?.length === 1 ? 'reply' : 'replies'}`}
              </div>
            </button>
          )}
          
          {/* Replies section */}
          {hasReplies && showReplies && (
            <div className="mt-2 ml-2 pl-3 border-l border-neutral-200 dark:border-neutral-700">
              {replies?.map((reply) => (
                <Comment
                  key={`${reply.id}-${reply.createdAt}`}
                  comment={reply}
                  inputRef={inputRef}
                  postUserId={postUserId}
                  onReply={onReply}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Likes Modal */}
      <Dialog open={showLikesModal} onOpenChange={setShowLikesModal}>
        <DialogContent className="dialogContent max-w-md h-[80vh] flex flex-col bg-white dark:bg-neutral-950">
          <DialogHeader className="border-b border-neutral-200 dark:border-neutral-800 px-4 py-4">
            <DialogTitle className="text-center font-medium text-base">
              Likes
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-800">
              {likes && likes.length > 0 ? (
                likes.map((like) => {
                  return (
                    <div
                      key={like.id}
                      className="flex items-center justify-between p-4"
                    >
                      <div className="flex items-center gap-x-2">
                        <Link href={`/dashboard/${like.user.username}`}>
                          <UserAvatar user={like.user} />
                        </Link>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-x-1">
                            <Link href={`/dashboard/${like.user.username}`}>
                              <p className="font-semibold text-sm hover:underline">
                                {like.user.username}
                              </p>
                            </Link>
                            {like.user.verified && (
                              <VerifiedBadge className="h-4 w-4" />
                            )}
                          </div>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            {like.user.name}
                          </p>
                        </div>
                      </div>

                      {session?.user?.id !== like.user.id && (
                        <FollowButton
                          followingId={like.user.id}
                          isFollowing={false}
                          hasPendingRequest={false}
                          isPrivate={false}
                          className="h-9 min-w-[120px] w-[120px]"
                          variant="profile"
                        />
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="flex items-center justify-center flex-1 p-4">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    No likes yet
                  </p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default Comment;