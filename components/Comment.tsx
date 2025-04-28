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
import LikesList from "./LikesList";

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

type CommentUser = {
  id: string;
  username: string | null;
  name: string | null;
  image: string | null;
  verified: boolean;
  isFollowing?: boolean;
  hasPendingRequest?: boolean;
  isPrivate?: boolean;
};

type CommentLikeState = {
  id: string;
  user_id: string;
  user: CommentUser;
  createdAt: string | Date;
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
      isFollowing: like.user.isFollowing || false,
      hasPendingRequest: like.user.hasPendingRequest || false,
      isPrivate: like.user.isPrivate || false
    },
    createdAt: like.createdAt
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
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreLikes, setHasMoreLikes] = useState(false);

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
    if (!session?.user || isLoading || !comment) return;
    
    setIsLoading(true);
    try {
      if (isLiked) {
        await unlikeComment(comment.id);
        setLikes(prevLikes => prevLikes.filter(like => like.user_id !== session.user.id));
        setIsLiked(false);
      } else {
        await likeComment(comment.id);
        setLikes(prevLikes => [...prevLikes, {
          id: crypto.randomUUID(),
          user_id: session.user.id,
          user: {
            id: session.user.id,
            username: session.user.username,
            name: session.user.name,
            image: session.user.image,
            verified: session.user.verified || false,
            isFollowing: false,
            hasPendingRequest: false,
            isPrivate: false
          },
          createdAt: new Date().toISOString()
        }]);
        setIsLiked(true);
      }
    } catch (error) {
      toast.error("Something went wrong");
      // Revert the optimistic update
      setIsLiked(!isLiked);
      if (comment.likes) {
        setLikes(comment.likes.map(like => ({
          id: like.id,
          user_id: like.user_id,
          user: {
            id: like.user.id,
            username: like.user.username,
            name: like.user.name,
            image: like.user.image,
            verified: like.user.verified || false,
            isFollowing: like.user.isFollowing || false,
            hasPendingRequest: like.user.hasPendingRequest || false,
            isPrivate: like.user.isPrivate || false
          },
          createdAt: like.createdAt
        })));
      }
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
                },
                createdAt: data.timestamp
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
        setViewedStories(prevStories => {
          const newStories = { ...prevStories };
          stories?.forEach(story => {
            newStories[story.id] = true;
          });
          return newStories;
        });
      }
    };

    window.addEventListener('storyViewed', handleStoryViewed as EventListener);
    return () => {
      window.removeEventListener('storyViewed', handleStoryViewed as EventListener);
    };
  }, [comment?.user?.id, session?.user?.id, stories]);

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

  const handleLoadMoreLikes = async () => {
    if (isLoadingMore || !comment) return;
    
    setIsLoadingMore(true);
    try {
      const response = await fetch(`/api/comments/${comment.id}/likes?cursor=${likes[likes.length - 1]?.id}`);
      if (response.ok) {
        const data = await response.json();
        const newLikes = data.likes;
        setHasMoreLikes(data.hasMore);
        setLikes(prevLikes => [...prevLikes, ...newLikes]);
      }
    } catch (error) {
      console.error('Error loading more likes:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

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
            <LikesList
              likes={likes}
              onLoadMore={handleLoadMoreLikes}
              hasMore={hasMoreLikes}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default Comment;