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

type Props = {
  comment: CommentWithExtras;
  inputRef?: RefObject<HTMLInputElement>;
  postUserId: string;
  onReply?: (username: string, commentId: string) => void;
  initialShowReplies?: boolean;
};

function Comment({ comment, inputRef, postUserId, onReply, initialShowReplies = false }: Props) {
  const { data: session, status } = useSession();
  const [showOptions, setShowOptions] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [showReplies, setShowReplies] = useState(initialShowReplies);
  const router = useRouter();

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
  const hasReplies = comment.replies && comment.replies.length > 0;
  
  // Auto-expand comments with new replies
  useEffect(() => {
    if (comment.replies && comment.replies.length > 0) {
      // Check if there are any replies that were created in the last 5 seconds
      const hasNewReplies = comment.replies.some(
        reply => new Date().getTime() - new Date(reply.createdAt).getTime() < 5000
      );
      
      if (hasNewReplies) {
        setShowReplies(true);
      }
    }
  }, [comment.replies]);
  
  // Initialize likes count and liked status from the actual comment data
  useEffect(() => {
    if (comment.likes) {
      setLikesCount(comment.likes.length);
    }
    
    if (status === "authenticated" && comment.likes) {
      const isCommentOwner = comment.user_id === session?.user.id;
      const isPostOwner = postUserId === session?.user.id;
      // Show options if user is either the comment owner, post owner, or any logged-in user (for reporting)
      setShowOptions(true);
      // Check if the current user has liked the comment
      setIsLiked(comment.likes.some(like => like.user_id === session?.user.id) || false);
    }
  }, [status, session, comment.user_id, postUserId, comment.likes]);

  // Initialize show replies state from prop when it changes
  useEffect(() => {
    if (initialShowReplies) {
      setShowReplies(true);
    }
  }, [initialShowReplies]);

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

  return (
    <>
      <div className="group w-full py-2 flex items-start relative">
        <div className="flex-shrink-0 mr-3">
          <ProfileHoverCard user={user}>
            <Link href={href}>
              <UserAvatar user={user} className="h-8 w-8" />
            </Link>
          </ProfileHoverCard>
        </div>
        <div className="flex-1 min-w-0 max-w-full overflow-hidden">
          <div className="text-sm">
            <div className="flex flex-wrap items-start gap-1">
              <div className="inline-flex items-center flex-shrink-0">
                <ProfileHoverCard user={user}>
                  <Link href={href}>
                    <span className="font-semibold hover:underline">
                      {username}
                    </span>
                  </Link>
                </ProfileHoverCard>
                {user.verified && <VerifiedBadge className="h-4 w-4 fill-sky-600 flex-shrink-0 ml-1" />}
              </div>
              <div className="text-neutral-800 dark:text-neutral-200 break-words w-full">
                <span className="whitespace-pre-line break-all inline-block max-w-full">
                  {comment.body}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center mt-1 space-x-3 text-neutral-500 text-[11px]">
            <Timestamp createdAt={comment.createdAt} className="text-[11px]" />
            {likesCount > 0 && (
              <button 
                onClick={() => setShowLikesModal(true)} 
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
                {showReplies ? "Hide replies" : `View ${comment.replies?.length} ${comment.replies?.length === 1 ? 'reply' : 'replies'}`}
              </div>
            </button>
          )}
          
          {/* Replies section */}
          {hasReplies && showReplies && (
            <div className="mt-2 ml-2 pl-3 border-l border-neutral-200 dark:border-neutral-700">
              {comment.replies?.map((reply) => (
                <Comment
                  key={reply.id}
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
              {comment.likes && comment.likes.length > 0 ? (
                comment.likes.map((like) => (
                  <div key={like.id} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <Link href={`/dashboard/${like.user.username}`}>
                        <UserAvatar user={like.user} className="h-9 w-9" />
                      </Link>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1">
                          <Link href={`/dashboard/${like.user.username}`} className="font-semibold text-sm hover:underline">
                            {like.user.username}
                          </Link>
                          {like.user.verified && <VerifiedBadge className="h-3.5 w-3.5" />}
                        </div>
                        {like.user.name && (
                          <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-1">
                            {like.user.name}
                          </p>
                        )}
                      </div>
                    </div>
                    {session?.user?.id !== like.user_id && (
                      <FollowButton
                        followingId={like.user.id}
                        isFollowing={like.user.isFollowing}
                        hasPendingRequest={like.user.hasPendingRequest}
                        isPrivate={like.user.isPrivate}
                        isFollowedByUser={like.user.isFollowedByUser}
                        className={cn(
                          "text-xs",
                          like.user.isFollowing 
                            ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-red-500/10 hover:text-red-500"
                            : "bg-blue-500 hover:bg-blue-600 text-white"
                        )}
                        onSuccess={() => {
                          router.refresh();
                        }}
                      />
                    )}
                  </div>
                ))
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
