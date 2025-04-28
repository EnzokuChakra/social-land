/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/rules-of-hooks */
"use client";

import { auth } from "@/lib/auth";
import UserAvatar from "@/components/UserAvatar";
import { PostWithExtras, PostTag, CommentWithExtras } from "@/lib/definitions";
import Image from "next/image";
import Link from "next/link";
import Comments from "./Comments";
import Timestamp from "./Timestamp";
import { Card } from "./ui/card";
import PostOptions from "./PostOptions";
import PostActions from "./PostActions";
import VerifiedBadge from "./VerifiedBadge";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import ProfileHoverCard from "./ProfileHoverCard";
import { useRouter } from "next/navigation";
import TaggedUsersModal from "./TaggedUsersModal";
import { useStoryModal } from "@/hooks/use-story-modal";
import { cn } from "@/lib/utils";
import { getSocket } from "@/lib/socket";

interface PostProps {
  post: PostWithExtras;
  priority?: boolean;
}

export default function Post({ post, priority = false }: PostProps) {
  const { data: session, status } = useSession();
  const userId = session?.user?.id;
  const username = post?.user?.username;
  const commentInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [showTaggedModal, setShowTaggedModal] = useState(false);
  const [likesCount, setLikesCount] = useState(post?.likes?.length || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const socket = getSocket();
  const storyModal = useStoryModal();
  const [viewedStories, setViewedStories] = useState<Record<string, boolean>>({});
  const [stories, setStories] = useState<any[]>([]);
  const [comments, setComments] = useState<CommentWithExtras[]>(post.comments || []);

  // Initialize likes count and liked status from the actual post data
  useEffect(() => {
    if (!post) return;
    
    if (status === "authenticated") {
      setShowOptions(true);
      if (post.likes) {
        setIsLiked(post.likes.some(like => like.user_id === session?.user.id) || false);
        setLikesCount(post.likes.length);
      }
      if (post.savedBy) {
        setIsSaved(post.savedBy.some(saved => saved.user_id === session?.user.id) || false);
      }
    }
  }, [post, session?.user.id, status]);

  // Handle like updates from socket
  const handleLikeUpdate = useCallback((data: { postId: string; userId: string; action: 'like' | 'unlike'; timestamp: string }) => {
    if (!post || data.postId !== post.id) return;
    
    if (data.action === 'like') {
      setIsLiked(true);
      setLikesCount(prev => prev + 1);
    } else {
      setIsLiked(false);
      setLikesCount(prev => Math.max(0, prev - 1));
    }
  }, [post]);

  // Socket event listener for real-time like updates
  useEffect(() => {
    if (!socket || !post) return;

    socket.on("postLikeUpdate", handleLikeUpdate);
    return () => {
      socket.off("postLikeUpdate", handleLikeUpdate);
    };
  }, [socket, handleLikeUpdate, post]);

  // Initialize viewed stories from localStorage on mount
  useEffect(() => {
    if (!post?.user?.id || !session?.user?.id) return;
    
    const storageKey = `viewed_stories_${post.user.id}_${session.user.id}`;
    const storedViewedStories = localStorage.getItem(storageKey);
    
    if (storedViewedStories) {
      try {
        const parsedViewedStories = JSON.parse(storedViewedStories);
        setViewedStories(parsedViewedStories);
      } catch (error) {
        console.error('Error parsing viewed stories:', error);
        setViewedStories({});
      }
    }
  }, [post?.user?.id, session?.user?.id]);

  // Fetch stories when component mounts
  useEffect(() => {
    if (!post?.user?.id || !post?.user?.hasActiveStory) return;
    
    const fetchStories = async () => {
      try {
        const response = await fetch(`/api/user-stories/${post.user.id}`);
        if (!response.ok) throw new Error('Failed to fetch stories');
        
        const { success, data } = await response.json();
        if (success && data) {
          setStories(data);
        }
      } catch (error) {
        console.error('Error fetching stories:', error);
        setStories([]);
      }
    };

    fetchStories();
  }, [post?.user?.id, post?.user?.hasActiveStory]);

  // Listen for story viewed events
  useEffect(() => {
    if (!post?.user?.id || !session?.user?.id) return;
    
    const handleStoryViewed = (event: CustomEvent) => {
      if (event.detail.userId === post.user.id) {
        const storageKey = `viewed_stories_${post.user.id}_${session.user.id}`;
        const viewedStories = event.detail.viewedStories || {};
        
        if (event.detail.isOwnStory) {
          const lastViewedKey = `last_viewed_own_stories_${session.user.id}`;
          localStorage.setItem(lastViewedKey, new Date().toISOString());
        }
        
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
  }, [post?.user?.id, session?.user?.id]);

  // Check if there are unviewed stories
  const hasUnviewedStories = useMemo(() => {
    if (!post?.user?.hasActiveStory) return false;
    if (typeof window === 'undefined') return false;
    
    const isCurrentUser = session?.user?.id === post.user.id;
    const storageKey = `viewed_stories_${post.user.id}_${session?.user?.id}`;
    
    if (isCurrentUser) {
      const lastViewedKey = `last_viewed_own_stories_${session.user.id}`;
      const lastViewed = localStorage.getItem(lastViewedKey);
      if (!lastViewed) return true;
      
      const lastViewedDate = new Date(lastViewed);
      return stories.some(story => new Date(story.createdAt) > lastViewedDate);
    } else {
      const storedViewedStories = localStorage.getItem(storageKey);
      if (!storedViewedStories) return true;
      
      try {
        const viewedStories = JSON.parse(storedViewedStories);
        return stories.some(story => !viewedStories[story.id]);
      } catch (error) {
        console.error('Error parsing viewed stories:', error);
        return true;
      }
    }
  }, [post?.user?.hasActiveStory, post?.user?.id, session?.user?.id, stories, viewedStories]);

  // Socket event handlers for comments
  useEffect(() => {
    if (!socket) return;

    const handleCommentUpdate = (data: { postId: string; parentId: string | null; comment: any }) => {
      if (data.postId !== post.id) return;

      setComments(prevComments => {
        if (data.parentId) {
          // This is a reply, we don't need to update the count in the dashboard view
          return prevComments;
        }
        // This is a new top-level comment
        return [...prevComments, data.comment];
      });
    };

    const handleCommentDelete = (data: { postId: string; commentId: string; parentId: string | null }) => {
      if (data.postId === post.id) {
        setComments(prevComments => {
          if (data.parentId) {
            // This is a reply, we don't need to update the count in the dashboard view
            return prevComments;
          }
          return prevComments.filter(comment => comment.id !== data.commentId);
        });
      }
    };

    socket.on("commentUpdate", handleCommentUpdate);
    socket.on("commentDelete", handleCommentDelete);

    return () => {
      socket.off("commentUpdate", handleCommentUpdate);
      socket.off("commentDelete", handleCommentDelete);
    };
  }, [socket, post.id]);

  if (!session?.user) return null;

  const handleAvatarClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!post.user) return;
    
    if (post.user.hasActiveStory) {
      try {
        const response = await fetch(`/api/user-stories/${post.user.id}`);
        const { success, data: stories } = await response.json();
        
        if (success && stories && stories.length > 0) {
          storyModal.setUserStories([{ userId: post.user.id, stories }]);
          storyModal.setUserId(post.user.id);
          storyModal.setCurrentUserIndex(0);
          storyModal.onOpen();
        }
      } catch (error) {
        console.error('Error fetching stories:', error);
      }
    } else {
      router.push(`/dashboard/${username}`);
    }
  };

  // Get caption length to determine display style
  const isCaptionShort = post.caption ? post.caption.length < 30 : true;

  // Add proper type for tags
  const handleTagClick = (tag: PostTag) => {
    router.push(`/dashboard/${tag.user.username}`);
  };

  const isPostOwner = post.user_id === userId;
  const postUser = post.user || {};
  const sessionUser = session?.user || {};

  return (
    <div className="flex flex-col space-y-2 mb-7 border-b border-gray-200 dark:border-neutral-800 pb-4">
      <div className="flex items-center justify-between px-3 sm:px-0">
        <div className="flex items-center gap-2">
          <div
            onClick={handleAvatarClick}
            className={cn(
              "relative cursor-pointer",
              post?.user?.hasActiveStory && hasUnviewedStories && "before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-tr before:from-yellow-400 before:to-fuchsia-600 before:p-[2px] before:w-[calc(100%+4px)] before:h-[calc(100%+4px)] before:-left-[2px] before:-top-[2px]",
              post?.user?.hasActiveStory && !hasUnviewedStories && "before:absolute before:inset-0 before:rounded-full before:bg-neutral-300 dark:before:bg-neutral-700 before:p-[2px] before:w-[calc(100%+4px)] before:h-[calc(100%+4px)] before:-left-[2px] before:-top-[2px]"
            )}
          >
            <div className={cn(
              "relative rounded-full overflow-hidden w-[32px] h-[32px]",
              post?.user?.hasActiveStory && "p-[2px] bg-white dark:bg-black"
            )}>
              <UserAvatar 
                user={post?.user}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div className="text-sm flex-grow min-w-0">
            <div className="flex items-center gap-1 flex-wrap">
              <div className="flex items-center gap-1">
                <ProfileHoverCard user={{
                  ...post?.user,
                  bio: null
                }}>
                  <Link href={`/dashboard/${username}`} className="text-sm font-semibold hover:underline truncate">
                    {username}
                  </Link>
                </ProfileHoverCard>
                {post?.user?.verified && <VerifiedBadge className="h-3.5 w-3.5" isDashboardPostHeader={true} />}
              </div>
              {post?.tags && post.tags.length > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">with</span>
                  {post.tags.length === 1 ? (
                    <ProfileHoverCard user={post.tags[0].user}>
                      <Link
                        href={`/dashboard/${post.tags[0].user.username}`}
                        className="text-sm font-semibold hover:underline inline-flex items-center gap-1"
                      >
                        {post.tags[0].user.username}
                        {post.tags[0].user.verified && <VerifiedBadge className="h-3.5 w-3.5" isDashboardPostHeader={true} />}
                      </Link>
                    </ProfileHoverCard>
                  ) : (
                    <button
                      onClick={() => setShowTaggedModal(true)}
                      className="text-sm font-semibold hover:underline"
                    >
                      {post.tags.length} others
                    </button>
                  )}
                </div>
              )}
              <span className="text-sm text-neutral-500 dark:text-neutral-400">•</span>
              {post?.createdAt && <Timestamp createdAt={post.createdAt} className="text-sm" />}
            </div>
            {post?.location && (
              <Link
                href={`/dashboard/location/${encodeURIComponent(post.location)}`}
                className="text-xs text-neutral-500 dark:text-neutral-400 hover:underline block mt-0.5"
              >
                {post.location}
              </Link>
            )}
          </div>
        </div>
        {showOptions && <PostOptions post={post} userId={userId} />}
      </div>

      <button 
        onClick={() => router.push(`/dashboard/p/${post?.id}`)}
        className="relative block w-full"
      >
        <Card className="relative w-full overflow-hidden rounded-none sm:rounded-md">
          {post?.fileUrl ? (
            <Image
              src={post.fileUrl}
              alt="Post Image"
              width={1000}
              height={1000}
              quality={100}
              priority={priority}
              className="h-auto w-full object-contain"
            />
          ) : (
            <div className="w-full h-[400px] bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center">
              <span className="text-neutral-500 dark:text-neutral-400">No image available</span>
            </div>
          )}
        </Card>
      </button>

      <PostActions
        post={post}
        userId={userId}
        className="px-3 sm:px-0 mt-2"
        inputRef={commentInputRef}
      />

      {post?.caption && (
        <div className="text-sm px-3 sm:px-0 mt-1">
          <div className="flex flex-wrap items-baseline gap-x-1">
            <ProfileHoverCard user={{
              ...post?.user,
              bio: null
            }}>
              <Link
                href={`/dashboard/${username}`}
                className="text-sm hover:underline"
              >
                {username}
              </Link>
            </ProfileHoverCard>
            {post?.user?.verified && (
              <div className="inline-flex flex-shrink-0">
                <VerifiedBadge className="h-3.5 w-3.5" isDashboardPostHeader={true} />
              </div>
            )}
            <span className="text-sm break-words">{post.caption}</span>
          </div>
        </div>
      )}

      {comments.length > 0 && (
        <Link
          href={`/dashboard/p/${post.id}`}
          className="text-sm text-neutral-500 dark:text-neutral-400 px-3 sm:px-0 hover:underline mt-1"
        >
          View all {comments.length} comments
        </Link>
      )}

      {/* Only show comment input, hide comment previews on initial load */}
      <div className="mt-1">
        <Comments
          postId={post?.id}
          comments={comments}
          user={session?.user}
          postUserId={post?.user?.id}
          inputRef={commentInputRef}
          showPreview={false}
        />
      </div>

      {post?.tags && post.tags.length > 0 && (
        <TaggedUsersModal
          isOpen={showTaggedModal}
          onClose={() => setShowTaggedModal(false)}
          tags={post.tags}
        />
      )}
    </div>
  );
}