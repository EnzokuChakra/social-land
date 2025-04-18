"use client";

import { CommentWithExtras } from "@/lib/definitions";
import CommentOptions from "@/components/CommentOptions";
import UserAvatar from "@/components/UserAvatar";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Timestamp from "./Timestamp";
import { RefObject, useMemo, useEffect, useState } from "react";
import VerifiedBadge from "./VerifiedBadge";
import { Heart, ChevronDown, ChevronUp, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { likeComment, unlikeComment } from "@/lib/actions";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import FollowButton from "./FollowButton";
import { useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket";
import ProfileHoverCard from "./ProfileHoverCard";
import { ScrollArea } from "./ui/scroll-area";
import { Input } from "./ui/input";

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
    isFollowing?: boolean;
  };
};

function Comment({ comment: initialComment, replies, inputRef, postUserId, onReply, initialShowReplies = false, hasStoryRing, onAvatarClick }: Props) {
  const [comment, setComment] = useState<CommentWithExtras | null>(initialComment);
  const [deletedReplyIds, setDeletedReplyIds] = useState(new Set<string>());
  const [likesCount, setLikesCount] = useState(initialComment.likes?.length || 0);
  const [likes, setLikes] = useState<CommentLikeState[]>(initialComment.likes?.map(like => ({
    id: like.id,
    user_id: like.user_id,
    user: {
      id: like.user.id,
      username: like.user.username || null,
      name: like.user.name || null,
      image: like.user.image || null,
      verified: like.user.verified || false,
      isFollowing: like.user.isFollowing || false
    }
  })) || []);
  const [isLiked, setIsLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showReplies, setShowReplies] = useState(initialShowReplies);
  const [showLikesModal, setShowLikesModal] = useState(false);
  const { data: session, status } = useSession();
  const [showOptions, setShowOptions] = useState(false);
  const router = useRouter();
  const socket = getSocket();
  const [viewedStories, setViewedStories] = useState<Record<string, boolean>>({});
  const [stories, setStories] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter replies to remove deleted ones
  const filteredReplies = useMemo(() => {
    if (!comment?.replies) return [];
    return comment.replies.filter(reply => !deletedReplyIds.has(reply.id));
  }, [comment?.replies, deletedReplyIds]);

  // Handle comment deletion
  useEffect(() => {
    const handleCommentDelete = (event: CustomEvent<{ commentId: string }>) => {
      if (event.detail.commentId === comment?.id) {
        setComment(null);
      }
    };

    window.addEventListener('commentDelete', handleCommentDelete as EventListener);
    return () => {
      window.removeEventListener('commentDelete', handleCommentDelete as EventListener);
    };
  }, [comment?.id]);

  // Handle socket events
  useEffect(() => {
    if (!socket) return;

    const handleCommentUpdate = (data: { comment: CommentWithExtras }) => {
      if (data.comment.id === comment?.id) {
        setComment(data.comment);
      }
    };

    const handleSocketCommentDelete = (data: { postId: string; commentId: string; parentId: string | null }) => {
      setDeletedReplyIds(prev => new Set([...prev, data.commentId]));
      if (data.commentId === comment?.id) {
        setComment(null);
      }
    };

    socket.on('commentUpdate', handleCommentUpdate);
    socket.on('commentDelete', handleSocketCommentDelete);
    
    return () => {
      socket.off('commentUpdate', handleCommentUpdate);
      socket.off('commentDelete', handleSocketCommentDelete);
    };
  }, [socket, comment?.id]);

  // Handle like/unlike
  const handleLike = async () => {
    if (!session?.user) {
      toast.error("You must be logged in to like comments");
      return;
    }

    if (isLoading) return;

    setIsLoading(true);
    try {
      if (isLiked) {
        await unlikeComment(comment?.id || '');
        setLikesCount(prev => Math.max(0, prev - 1));
        setIsLiked(false);
        setLikes(prev => prev.filter(like => like.user_id !== session.user.id));
        socket?.emit("commentLikeUpdate", {
          commentId: comment?.id,
          userId: session.user.id,
          action: 'unlike',
          timestamp: new Date().toISOString()
        });
      } else {
        await likeComment(comment?.id || '');
        setLikesCount(prev => prev + 1);
        setIsLiked(true);
        setLikes(prev => [...prev, {
          id: 'temp-' + Date.now(),
          user_id: session.user.id,
          user: {
            id: session.user.id,
            username: session.user.username || null,
            name: session.user.name || null,
            image: session.user.image || null,
            verified: session.user.verified || false,
            isFollowing: false
          }
        }]);
        // Emit socket event for real-time update
        socket?.emit("commentLikeUpdate", {
          commentId: comment?.id ,
          userId: session.user.id,
          action: 'like',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      toast.error("Failed to update like");
    } finally {
      setIsLoading(false);
    }
  };

  // Update replies when parent comment changes
  useEffect(() => {
    if (comment && replies) {
      const validReplies = replies.filter(reply => !deletedReplyIds.has(reply.id));
      setComment(prev => prev ? {
        ...prev,
        replies: validReplies
      } : null);
    }
  }, [replies, deletedReplyIds]);

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
      // Socket is connected, no need to log
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
                  verified: session?.user?.verified || false,
                  isFollowing: false
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

  // Initialize viewed stories from localStorage on mount
  useEffect(() => {
    if (session?.user?.id && comment?.user?.id) {
      const storageKey = `viewed_stories_${comment?.user?.id}_${session?.user?.id}`;
      const storedViewedStories = localStorage.getItem(storageKey);
      
      if (storedViewedStories) {
        try {
          const parsedViewedStories = JSON.parse(storedViewedStories);
          setViewedStories(parsedViewedStories);
        } catch (error) {
          console.error("Error parsing viewed stories:", error);
          setViewedStories({});
        }
      }
    }
  }, [session?.user?.id, comment?.user?.id]);

  // Fetch stories when component mounts
  useEffect(() => {
    const fetchStories = async () => {
      if (comment?.user?.hasActiveStory) {
        try {
          const response = await fetch(`/api/user-stories/${comment?.user?.id}`);
          const { success, data } = await response.json();
          if (success && data) {
            setStories(data);
          }
        } catch (error) {
          console.error("Error fetching stories:", error);
        }
      }
    };

    if (comment?.user?.id) {
      fetchStories();
    }
  }, [comment?.user?.id, comment?.user?.hasActiveStory]);

  // Listen for story viewed events
  useEffect(() => {
    // Skip if comment or user is null
    if (!comment?.user?.id || !session?.user?.id) return;

    const handleStoryViewed = (event: CustomEvent) => {
      if (event.detail.userId === comment?.user?.id && session?.user?.id) {
        const storageKey = `viewed_stories_${comment?.user?.id}_${session?.user?.id}`;
        const viewedStories = event.detail.viewedStories || {};
        
        // If it's the user's own story, update the last viewed timestamp
        if (event.detail.isOwnStory) {
          const lastViewedKey = `last_viewed_own_stories_${session?.user?.id}`;
          localStorage.setItem(lastViewedKey, new Date().toISOString());
        }
        
        // Update the state with the new viewed stories
        setViewedStories(prevStories => {
          const newStories = { ...prevStories, ...viewedStories };
          localStorage.setItem(storageKey, JSON.stringify(newStories));
          return newStories;
        });
      }
    };

    window.addEventListener('storyViewed', handleStoryViewed as EventListener);
    return () => {
      window.removeEventListener('storyViewed', handleStoryViewed as EventListener);
    };
  }, [comment?.user?.id, session?.user?.id]);

  // Check if there are unviewed stories
  const hasUnviewedStories = useMemo(() => {
    if (!comment?.user?.hasActiveStory) return false;
    
    if (typeof window === 'undefined') return false;
    
    // Make sure stories is defined and an array
    if (!Array.isArray(stories) || stories.length === 0) return false;
    
    const isCurrentUser = session?.user?.id === comment?.user?.id;
    const storageKey = `viewed_stories_${comment?.user?.id}_${session?.user?.id || 'anonymous'}`;
    
    if (isCurrentUser && session?.user?.id) {
      const lastViewedKey = `last_viewed_own_stories_${session?.user?.id}`;
      const lastViewed = localStorage.getItem(lastViewedKey);
      if (!lastViewed) return true;
      
      try {
        const lastViewedDate = new Date(lastViewed);
        return stories.some(story => story?.createdAt && new Date(story.createdAt) > lastViewedDate);
      } catch (error) {
        console.error("Error comparing story dates:", error);
        return false;
      }
    } else {
      const storedViewedStories = localStorage.getItem(storageKey);
      if (!storedViewedStories) return true;
      
      try {
        const viewedStories = JSON.parse(storedViewedStories);
        return stories.some(story => story?.id && !viewedStories[story.id]);
      } catch (error) {
        console.error("Error parsing viewed stories:", error);
        return false; // Changed to false to avoid showing story rings erroneously
      }
    }
  }, [comment?.user?.hasActiveStory, comment?.user?.id, session?.user?.id, stories, viewedStories]);

  if (!comment) return null;

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
  
  // Update the hasReplies check to use filteredReplies
  const hasReplies = filteredReplies.length > 0;
  
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
            <div onClick={onAvatarClick}>
              <UserAvatar 
                user={user} 
                className="h-8 w-8"
                showStoryRing={hasStoryRing}
                hasUnviewedStories={hasStoryRing && hasUnviewedStories}
              />
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
              onClick={handleLike}
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
                {showReplies ? "Hide replies" : `View ${filteredReplies.length} ${filteredReplies.length === 1 ? 'reply' : 'replies'}`}
              </div>
            </button>
          )}
          
          {/* Replies section */}
          {hasReplies && showReplies && (
            <div className="mt-2 ml-2 pl-3 border-l border-neutral-200 dark:border-neutral-700">
              {filteredReplies.map((reply) => (
                <Comment
                  key={`${reply.id}-${reply.createdAt}`}
                  comment={reply}
                  replies={[]}
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
        <DialogContent className="max-w-md p-0 bg-black">
          <DialogHeader className="border-b border-neutral-800">
            <DialogTitle className="text-center font-semibold text-lg py-2 text-white">
              Likes
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            {likes && likes.length > 0 ? (
              [...likes]
                .sort((a, b) => {
                  // Current user first
                  if (a.user_id === session?.user?.id) return -1;
                  if (b.user_id === session?.user?.id) return 1;
                  
                  // Then sort by most recent likes (newest first)
                  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                })
                .map((like) => (
                  <div
                    key={like.id}
                    className="flex items-center justify-between p-4 hover:bg-neutral-900 transition"
                  >
                    <Link
                      href={`/dashboard/${like.user.username}`}
                      className="flex items-center gap-3"
                    >
                      <UserAvatar
                        user={like.user}
                        className="h-11 w-11"
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-white">{like.user.username}</span>
                        {like.user.name && (
                          <span className="text-sm text-neutral-400">{like.user.name}</span>
                        )}
                      </div>
                    </Link>
                    {session?.user?.id !== like.user.id && (
                      <FollowButton
                        followingId={like.user.id}
                        isFollowing={false}
                        hasPendingRequest={false}
                        isPrivate={false}
                        className="h-9 min-w-[104px]"
                        variant="profile"
                      />
                    )}
                  </div>
                ))
            ) : (
              <div className="p-4 text-center text-neutral-400">
                No likes yet
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default Comment;