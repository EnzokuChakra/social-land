"use client";

import CommentForm, { CommentFormHandle } from "@/components/CommentForm";
import PostActions from "@/components/PostActions";
import UserAvatar from "@/components/UserAvatar";
import ViewPost from "@/components/ViewPost";
import {
  Dialog,
  DialogContent,
  DialogContentWithoutClose,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import useMount from "@/hooks/useMount";
import { PostWithExtras, CommentWithExtras, SavedPost, User, CommentLike, SavedPostWithExtras, StoryWithExtras } from "@/lib/definitions";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useEffect, useState, memo, useCallback, useMemo } from "react";
import MiniPost from "./MiniPost";
import Comment from "./Comment";
import PostOptions from "./PostOptions";
import { Button } from "./ui/button";
import { Flag, X, MoreHorizontal, ChevronLeft, Heart } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import VerifiedBadge from "./VerifiedBadge";
import { deletePost, likePost } from "@/lib/actions";
import FollowButton from "@/components/FollowButton";
import TaggedUsersModal from "@/components/TaggedUsersModal";
import ProfileHoverCard from "@/components/ProfileHoverCard";
import { useStoryModal } from "@/hooks/use-story-modal";
import Timestamp from "@/components/Timestamp";
import { getSocket } from "@/lib/socket";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { useImage } from "@/lib/hooks/use-image";

const MemoizedImage = memo(function MemoizedImage({ src, alt, aspectRatio, onDoubleClick }: { 
  src: string;
  alt: string;
  aspectRatio: number;
  onDoubleClick?: () => void;
}) {
  // Use our image caching hook
  const { imageUrl, blurDataURL } = useImage(src);
  
  return (
    <Image
      src={imageUrl || src}
      alt={alt}
      className={cn(
        "w-full h-auto select-none",
        aspectRatio === 1 ? "object-cover" : "object-contain"
      )}
      width={1200}
      height={1200}
      loading="eager"
      decoding="sync"
      priority={true}
      quality={100}
      onDoubleClick={onDoubleClick}
      placeholder="blur"
      blurDataURL={blurDataURL}
    />
  );
}, function areEqual(prevProps: { 
  src: string;
  alt: string;
  aspectRatio: number;
  onDoubleClick?: () => void;
}, nextProps: {
  src: string;
  alt: string;
  aspectRatio: number;
  onDoubleClick?: () => void;
}) {
  // More strict equality check to prevent flickering
  return prevProps.src === nextProps.src && 
         prevProps.alt === nextProps.alt && 
         prevProps.aspectRatio === nextProps.aspectRatio;
});
MemoizedImage.displayName = "MemoizedImage";

const MemoizedDesktopImage = memo(function MemoizedDesktopImage({ src, alt, aspectRatio }: {
  src: string;
  alt: string;
  aspectRatio: number;
}) {
  // Use our image caching hook
  const { imageUrl, blurDataURL } = useImage(src);
  
  return (
    <div className={cn(
      "relative flex-1 bg-black flex items-center justify-center",
      "h-full w-auto",
      "min-h-0",
      "max-h-full"
    )}>
      <div className="relative w-full h-full flex items-center justify-center">
        <Image
          src={imageUrl || src}
          alt={alt}
          className={cn(
            "max-h-full w-auto select-none",
            aspectRatio === 1 ? "object-cover" : "object-contain"
          )}
          width={1200}
          height={1200}
          loading="eager"
          decoding="sync"
          priority={true}
          quality={100}
          placeholder="blur"
          blurDataURL={blurDataURL}
        />
      </div>
    </div>
  );
}, function areEqual(prevProps: { src: string; alt: string; aspectRatio: number }, nextProps: { src: string; alt: string; aspectRatio: number }) {
  return prevProps.src === nextProps.src;
});
MemoizedDesktopImage.displayName = "MemoizedDesktopImage";

interface Story {
  id: string;
  createdAt: Date;
  user: {
    id: string;
  };
}

interface Follower {
  followerId: string;
  status: string;
}

interface StoryRingState {
  hasStories: boolean;
  hasUnviewedStories: boolean;
  shouldShowStoryRing: boolean;
}

function formatUserForAvatar(user: PostWithExtras['user']) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    image: user.image,
    bio: null,
    verified: user.verified,
    isPrivate: user.isPrivate,
    hasActiveStory: user.hasActiveStory,
    isFollowing: user.isFollowing
  };
}

function PostView({ id, post }: { id: string; post: PostWithExtras }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const user = session?.user;
  const inputRef = useRef<HTMLInputElement>(null);
  const commentFormRef = useRef<CommentFormHandle>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const username = post.user.username;
  const href = `/dashboard/${username}`;
  const mount = useMount();
  const [isOpen, setIsOpen] = useState(true);
  const isPostModal = pathname === `/dashboard/p/${id}`;
  const isPostMine = post.user_id === user?.id;
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [showTaggedModal, setShowTaggedModal] = useState(false);
  const storyModal = useStoryModal();
  const [comments, setComments] = useState(post.comments);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const socket = getSocket();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [lastDoubleTapTime, setLastDoubleTapTime] = useState(0);
  const [isProcessingLike, setIsProcessingLike] = useState(false);
  const [stories, setStories] = useState<StoryWithExtras[]>([]);
  const [viewedStories, setViewedStories] = useState<Record<string, boolean>>({});
  const [currentPost, setCurrentPost] = useState<PostWithExtras>(post);
  const [isInitialRender, setIsInitialRender] = useState(true);
  const [hasNewStory, setHasNewStory] = useState(false);

  // Handle post deletion
  useEffect(() => {
    if (!socket) return;

    const handlePostDeleted = (data: { postId: string }) => {
      if (data.postId === post.id) {
        // Redirect to dashboard if the current post is deleted
        router.push('/dashboard');
      }
    };

    socket.on('postDeleted', handlePostDeleted);

    return () => {
      socket.off('postDeleted', handlePostDeleted);
    };
  }, [socket, post.id, router]);

  // Remove the delayed animation effect
  useEffect(() => {
    if (isInitialRender) {
      setIsInitialRender(false);
    }
  }, [isInitialRender]);

  // Memoize shouldShowStoryRing to prevent unnecessary calculations
  const shouldShowStoryRing = useMemo(() => {
    const isCurrentUser = session?.user?.id === post.user.id;
    const isFollowing = post.user.isFollowing;
    return isCurrentUser || (!post.user.isPrivate && post.user.hasActiveStory) || (post.user.isPrivate && isFollowing && post.user.hasActiveStory);
  }, [session?.user?.id, post.user.id, post.user.isPrivate, post.user.hasActiveStory, post.user.isFollowing]);

  // Check if there are unviewed stories - memoized for performance
  const hasUnviewedStories = useMemo(() => {
    if (!post.user.hasActiveStory) return false;
    if (typeof window === 'undefined') return false;
    
    const isCurrentUser = session?.user?.id === post.user.id;
    
    if (isCurrentUser) {
      return stories.some(story => !story.views?.some(view => view.user_id === session?.user?.id));
    }
    
    return stories.some(story => !story.views?.some(view => view.user_id === session?.user?.id));
  }, [post.user.hasActiveStory, post.user.id, session?.user?.id, stories]);

  // Memoize the initial post data
  const initialPostData = useMemo(() => ({
    ...post,
    likes: post.likes.map(like => ({
      ...like,
      user: {
        ...like.user,
        isFollowing: Boolean(like.user.isFollowing),
        hasPendingRequest: Boolean(like.user.hasPendingRequest),
        isPrivate: Boolean(like.user.isPrivate)
      }
    })),
    savedBy: post.savedBy || [],
    comments: post.comments || [],
    tags: post.tags || []
  }), [post]);

  // Update currentPost only when necessary
  useEffect(() => {
    if (!isInitialRender) {
      setCurrentPost(initialPostData);
    }
  }, [initialPostData, isInitialRender]);

  // Load viewed stories after initial render - use a more efficient approach
  useEffect(() => {
    if (!session?.user?.id || !post.user.id) return;

    const loadViewedStories = () => {
      const storageKey = `viewed_stories_${post.user.id}_${session.user.id}`;
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
    };

    // Use requestAnimationFrame for smoother rendering
    const frameId = requestAnimationFrame(loadViewedStories);
    return () => cancelAnimationFrame(frameId);
  }, [session?.user?.id, post.user.id]);

  // Fetch stories only if needed and after initial render - use a more efficient approach
  useEffect(() => {
    if (!post.user.hasActiveStory) return;

    const fetchStories = async () => {
      try {
        const response = await fetch(`/api/user-stories/${post.user.id}`);
        const { success, data } = await response.json();
        if (success && data) {
          setStories(data);
        }
      } catch (error) {
        console.error("Error fetching stories:", error);
      }
    };

    // Use requestAnimationFrame for smoother rendering
    const frameId = requestAnimationFrame(fetchStories);
    return () => cancelAnimationFrame(frameId);
  }, [post.user.id, post.user.hasActiveStory]);

  // Add effect to handle story viewing
  useEffect(() => {
    if (!socket || !post.user.id) return;

    const handleStoryViewed = (data: { userId: string; storyId: string }) => {
      if (data.userId === post.user.id) {
        setViewedStories(prev => ({
          ...prev,
          [data.storyId]: true
        }));
      }
    };

    socket.on('storyViewed', handleStoryViewed);

    return () => {
      socket.off('storyViewed', handleStoryViewed);
    };
  }, [socket, post.user.id]);

  // Save previous focus when opening modal
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    }
  }, [isOpen]);

  // Handle focus restoration and cleanup
  useEffect(() => {
    return () => {
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        setTimeout(() => {
          previousFocusRef.current?.focus();
        }, 0);
      }
    };
  }, []);

  // Handle modal close with cleanup and prevent multiple calls
  const handleModalClose = useCallback((open: boolean) => {
    if (!open && isOpen) {
      setIsOpen(false);
      // Reduce transition time for quicker navigation
      const timer = setTimeout(() => {
        if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
          previousFocusRef.current.focus();
        }
        router.back();
      }, 100); // Reduced from 200ms to 100ms
      return () => clearTimeout(timer);
    }
  }, [router, isOpen]);

  // Socket event handlers for comments
  useEffect(() => {
    if (!socket) return;

    const handleCommentUpdate = (data: { postId: string; parentId: string | null; comment: any }) => {
      if (data.postId !== id) return;

      setComments(prevComments => {
        const newComments = prevComments.map(c => ({
          ...c,
          replies: c.replies ? [...c.replies] : []
        }));

        if (data.parentId) {
          const parentIndex = newComments.findIndex(c => c.id === data.parentId);
          if (parentIndex !== -1) {
            if (!newComments[parentIndex].replies) {
              newComments[parentIndex].replies = [];
            }
            newComments[parentIndex].replies.push(data.comment);
          }
          return newComments;
        }
        return [data.comment, ...newComments];
      });
    };

    const handleCommentDelete = (data: { postId: string; commentId: string; parentId: string | null }) => {
      if (data.postId === id) {
        setComments(prevComments => {
          if (data.parentId) {
            return prevComments.map(comment => {
              if (comment.id === data.parentId) {
                return {
                  ...comment,
                  replies: comment.replies?.filter(reply => reply.id !== data.commentId) || []
                };
              }
              return comment;
            });
          }
          return prevComments.filter(comment => comment.id !== data.commentId);
        });
      }
    };

    const handleCommentLikeUpdate = (data: { commentId: string; userId: string; action: 'like' | 'unlike' }) => {
      setComments(prevComments => {
        return prevComments.map(comment => {
          if (comment.id === data.commentId) {
            const updatedLikes = data.action === 'like' 
              ? [...(comment.likes || []), { id: crypto.randomUUID(), user_id: data.userId, createdAt: new Date(), updatedAt: new Date(), commentId: data.commentId, user: { id: data.userId } as User }]
              : (comment.likes || []).filter(like => like.user_id !== data.userId);
            
            return {
              ...comment,
              likes: updatedLikes
            };
          }
          
          // Check replies
          if (comment.replies) {
            const updatedReplies = comment.replies.map(reply => {
              if (reply.id === data.commentId) {
                const updatedReplyLikes = data.action === 'like'
                  ? [...(reply.likes || []), { id: crypto.randomUUID(), user_id: data.userId, createdAt: new Date(), updatedAt: new Date(), commentId: data.commentId, user: { id: data.userId } as User }]
                  : (reply.likes || []).filter(like => like.user_id !== data.userId);
                
                return {
                  ...reply,
                  likes: updatedReplyLikes
                };
              }
              return reply;
            });
            
            return {
              ...comment,
              replies: updatedReplies
            };
          }
          
          return comment;
        });
      });
    };

    socket.on("commentUpdate", handleCommentUpdate);
    socket.on("commentDelete", handleCommentDelete);
    socket.on("commentLikeUpdate", handleCommentLikeUpdate);
    
    return () => {
      socket.off("commentUpdate", handleCommentUpdate);
      socket.off("commentDelete", handleCommentDelete);
      socket.off("commentLikeUpdate", handleCommentLikeUpdate);
    };
  }, [socket, id]);

  // Socket handler for likes updates
  useEffect(() => {
    if (!socket) return;

    const handleLikeUpdate = (data: any) => {
      setCurrentPost(prevPost => {
        // Create a map of existing likes for quick lookup
        const existingLikes = new Map(prevPost.likes.map(like => [like.user.id, like]));
        
        let updatedLikes = [...prevPost.likes];
        
        if (data.action === "unlike") {
          // Remove the like if it exists
          updatedLikes = updatedLikes.filter(like => like.user_id !== data.user_id);
        } else if (!existingLikes.has(data.likedBy.id)) {
          // Only add the like if it doesn't already exist
          const newLike = {
            id: crypto.randomUUID(),
            user_id: data.likedBy.id,
            postId: data.post.id,
            reelId: null,
            storyId: null,
            user: {
              ...data.likedBy,
              isFollowing: existingLikes.get(data.likedBy.id)?.user.isFollowing || false,
              hasPendingRequest: existingLikes.get(data.likedBy.id)?.user.hasPendingRequest || false,
              isPrivate: existingLikes.get(data.likedBy.id)?.user.isPrivate || false
            },
            createdAt: new Date(),
            updatedAt: new Date()
          };
          updatedLikes.push(newLike);
        }

        return {
          ...prevPost,
          likes: updatedLikes
        };
      });
    };

    socket.on("likeUpdate", handleLikeUpdate);
    return () => {
      socket.off("likeUpdate", handleLikeUpdate);
    };
  }, [socket]);

  // Real-time updates polling with increased interval and conditions
  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;
    
    if (isPostModal && mount && !isInitialRender) {
      const refreshPostData = async () => {
        try {
          const response = await fetch(`/api/posts/${id}/comments`);
          if (!response.ok) return;
          
          const data = await response.json();
          
          if (data?.comments) {
            window.dispatchEvent(
              new CustomEvent('update-comments', {
                detail: {
                  postId: id,
                  comments: data.comments
                }
              })
            );
          }
        } catch (error) {
          // Silently handle error
        }
      };
      
      refreshPostData();
      intervalId = setInterval(refreshPostData, 30000); // Increased to 30 seconds
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isPostModal, mount, id, isInitialRender]);

  // Transform comments to include all required fields
  const transformedComments = post.comments.map(comment => ({
    ...comment,
    parentId: comment.parentId ?? null,
    likes: comment.likes ?? [],
    user: {
      ...comment.user,
      email: '',
      password: null,
      bio: null,
      isPrivate: false,
      role: 'USER',
      status: 'NORMAL',
      createdAt: new Date(),
      updatedAt: new Date(),
      posts: [],
      saved: [],
      followers: [],
      following: [],
      stories: []
    },
    replies: (comment.replies ?? []).map(reply => ({
      ...reply,
      parentId: reply.parentId ?? null,
      likes: reply.likes ?? [],
      user: {
        ...reply.user,
        email: '',
        password: null,
        bio: null,
        isPrivate: false,
        role: 'USER',
        status: 'NORMAL',
        createdAt: new Date(),
        updatedAt: new Date(),
        posts: [],
        saved: [],
        followers: [],
        following: [],
        stories: []
      }
    }))
  })) as CommentWithExtras[];

  // Handle reply to comment
  const handleReplyToComment = (username: string, commentId: string) => {
    if (commentFormRef.current) {
      commentFormRef.current.onReply(username, commentId);
      return;
    }
    
    if (inputRef.current && 'onReply' in inputRef.current && typeof inputRef.current.onReply === 'function') {
      inputRef.current.onReply(username, commentId);
      return;
    }
    
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.value = `@${username} `;
      (inputRef.current as any).currentParentId = commentId;
      
      try {
        const event = new Event('input', { bubbles: true });
        inputRef.current.dispatchEvent(event);
      } catch (error) {
        // Silently handle error
      }
    }
  };

  // Check if input ref is properly set up
  useEffect(() => {
    // No need to log mount status
  }, [mount, inputRef]);

  const handleAvatarClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    router.push(href);
  };

  // Function to fetch more comments
  const fetchMoreComments = async () => {
    if (isLoadingComments || !hasMore) return;

    setIsLoadingComments(true);
    try {
      const nextPage = page + 1;
      const response = await fetch(`/api/posts/${id}/comments?page=${nextPage}&limit=10`);
      const data = await response.json();

      if (data.comments?.length > 0) {
        const existingIds = new Set(comments.map(c => c.id));
        const newComments = data.comments.filter(
          (comment: CommentWithExtras) => !existingIds.has(comment.id)
        );

        if (newComments.length > 0) {
          setComments(prev => [...prev, ...newComments]);
          setPage(nextPage);
        }
        setHasMore(data.hasMore);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      // Silently handle error
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handleImageDoubleClick = async () => {
    if (!user?.id || isProcessingLike) return;
    
    // Set processing flag immediately to prevent multiple calls
    setIsProcessingLike(true);
    
    try {
      // Check if post is already liked by the user
      const isAlreadyLiked = currentPost.likes.some(like => like.user_id === user.id);
      
      // Only perform like action if not already liked
      if (!isAlreadyLiked) {
        // Show heart animation
        setShowHeartAnimation(true);
        
        // Call likePost API
        await likePost({ postId: currentPost.id });
        
        // Hide heart animation after delay
        setTimeout(() => {
          setShowHeartAnimation(false);
        }, 1700);
      }
    } catch (error) {
      console.error("[Double-click like error]:", error);
      // Ensure animation is hidden even if there's an error
      setShowHeartAnimation(false);
    } finally {
      // Use a longer timeout to prevent rapid double-tapping
      setTimeout(() => {
        setIsProcessingLike(false);
      }, 2000);
    }
  };

  const handleBookmarkUpdate = useCallback((savedBy: (SavedPost & { user: User })[]) => {
    setCurrentPost((prev: PostWithExtras) => ({
      ...prev,
      savedBy: savedBy.map(bookmark => ({
        ...bookmark,
        user: {
          ...bookmark.user,
          isFollowing: false,
          hasPendingRequest: false,
          isPrivate: false
        }
      }))
    }));
  }, []);

  // Add effect to listen for story uploads
  useEffect(() => {
    if (!socket || !post.user.id) return;

    const handleStoryUploaded = (data: { userId: string }) => {
      if (data.userId === post.user.id) {
        setHasNewStory(true);
      }
    };

    socket.on('storyUploaded', handleStoryUploaded);

    return () => {
      socket.off('storyUploaded', handleStoryUploaded);
    };
  }, [socket, post.user.id]);

  // Update the story ring state logic
  const storyRingState = useMemo<StoryRingState>(() => {
    const hasStories = Boolean(post.user.hasActiveStory);
    const hasUnviewedStories = Boolean(hasStories && stories?.some((story) => {
      if (!story || !story.createdAt) return false;
      const storyDate = new Date(story.createdAt);
      const now = new Date();
      const diff = now.getTime() - storyDate.getTime();
      const hours = diff / (1000 * 60 * 60);
      return hours < 24 && !viewedStories[story.id];
    }));

    const isCurrentUser = session?.user?.id === post.user.id;
    const isFollowing = Boolean(post.user.isFollowing);

    // If there's a new story, reset the viewed state
    if (hasNewStory) {
      setHasNewStory(false);
      return {
        hasStories,
        hasUnviewedStories: true,
        shouldShowStoryRing: hasStories && (isCurrentUser || !post.user.isPrivate || (post.user.isPrivate && isFollowing))
      };
    }

    return {
      hasStories,
      hasUnviewedStories,
      shouldShowStoryRing: hasStories && (isCurrentUser || !post.user.isPrivate || (post.user.isPrivate && isFollowing))
    };
  }, [post.user.hasActiveStory, stories, post.user.isPrivate, post.user.isFollowing, session?.user?.id, viewedStories, hasNewStory]);

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={handleModalClose}
    >
      <DialogContentWithoutClose 
        className={cn(
          "flex gap-0 flex-col md:flex-row items-start p-0",
          "md:max-w-5xl lg:max-w-6xl xl:max-w-7xl",
          "h-[100dvh] md:h-[calc(100vh-80px)]",
          "max-h-[100dvh] md:max-h-[calc(100vh-80px)]",
          "bg-white dark:bg-black",
          "overflow-y-auto md:overflow-hidden",
          "animate-none motion-reduce:animate-none",
          "will-change-transform will-change-opacity"
        )}
        tabIndex={0}
        aria-modal="true"
        role="dialog"
      >
        {/* Mobile Back Button */}
        {isMobile && (
          <button
            onClick={() => router.back()}
            className="fixed top-4 left-4 z-50 p-2 rounded-full bg-black/50 text-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        <DialogTitle className="sr-only">Post by {username}</DialogTitle>
        
        {/* Mobile Layout */}
        {isMobile ? (
          <div className="w-full flex flex-col pb-[60px]">
            {/* Image Section */}
            <div className="w-full bg-black flex items-center justify-center relative">
              <MemoizedImage
                src={post.fileUrl}
                alt={post.caption || "Post image"}
                aspectRatio={post.aspectRatio}
                onDoubleClick={handleImageDoubleClick}
              />
              {showHeartAnimation && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <Heart className="h-28 w-28 text-red-500 fill-red-500 animate-float-heart drop-shadow-lg" />
                </div>
              )}
            </div>

            {/* Content Section */}
            <div className="flex flex-col w-full bg-white dark:bg-black">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-3">
                  <div onClick={handleAvatarClick}>
                    <UserAvatar 
                      user={formatUserForAvatar(post.user)}
                      className="w-8 h-8"
                    />
                  </div>
                  
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1 flex-wrap">
                      <Link
                        href={href}
                        className="text-sm font-semibold"
                      >
                        {username}
                      </Link>
                      
                      {post.user.verified && <VerifiedBadge size={14} isDashboardPostHeader={true} />}
                      
                      {post.tags && post.tags.length > 0 && (
                        <>
                          <span className="text-neutral-500 dark:text-neutral-400 text-sm">•</span>
                          <span className="text-sm text-neutral-500 dark:text-neutral-400">with</span>
                          {post.tags.length === 1 ? (
                            <ProfileHoverCard user={{
                              ...post.tags[0].user,
                              bio: null
                            }}>
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
                        </>
                      )}
                      
                      <span className="text-neutral-500 dark:text-neutral-400 text-xs">•</span>
                      <Timestamp createdAt={post.createdAt} className="text-xs" />
                    </div>
                    
                    {post.location && (
                      <Link
                        href={`/dashboard/location/${encodeURIComponent(post.location)}`}
                        className="text-xs text-neutral-500 dark:text-neutral-400 hover:underline mt-1"
                      >
                        {post.location}
                      </Link>
                    )}
                  </div>
                </div>
                <PostOptions post={post} userId={user?.id} />
              </div>

              {/* Caption */}
              {post.caption && (
                <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
                  <div className="flex gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">
                        <span className="inline-flex items-center gap-1">
                          <ProfileHoverCard user={{
                            ...post.user,
                            bio: null
                          }}>
                            <Link href={href} className="font-semibold hover:underline">
                              {username}
                            </Link>
                          </ProfileHoverCard>
                          {post.user.verified && <VerifiedBadge className="h-3.5 w-3.5" isDashboardPostHeader={true} />}
                        </span>
                        {' '}
                        <span className="whitespace-pre-line break-words">{post.caption}</span>
                      </div>
                      <Timestamp className="text-xs text-neutral-500 dark:text-neutral-400 mt-1" createdAt={post.createdAt} />
                    </div>
                  </div>
                </div>
              )}

              {/* Comments */}
              {comments.length > 0 && (
                <div className="px-4 py-2">
                  {comments.map((comment) => (
                    <Comment
                      key={`${comment.id}-${comment.createdAt}`}
                      comment={comment}
                      replies={comment.replies}
                      inputRef={inputRef}
                      postUserId={post.user.id}
                      onReply={handleReplyToComment}
                      hasStoryRing={comment.user.hasActiveStory}
                      onAvatarClick={async (e) => {
                        e.preventDefault();
                        if (comment.user.hasActiveStory) {
                          try {
                            const response = await fetch(`/api/user-stories/${comment.user.id}`);
                            const { success, data: stories } = await response.json();
                            
                            if (success && stories && stories.length > 0) {
                              storyModal.setUserStories([{ userId: comment.user.id, stories }]);
                              storyModal.setUserId(comment.user.id);
                              storyModal.setCurrentUserIndex(0);
                              storyModal.onOpen();
                            }
                          } catch (error) {
                            // Silently handle error
                          }
                        } else {
                          router.push(`/dashboard/${comment.user.username}`);
                        }
                      }}
                    />
                  ))}

                  {comments.length >= 10 && hasMore && (
                    <button
                      onClick={fetchMoreComments}
                      disabled={isLoadingComments}
                      className={cn(
                        "text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300",
                        "py-3 w-full text-center",
                        isLoadingComments && "cursor-not-allowed opacity-50"
                      )}
                    >
                      {isLoadingComments ? "Loading..." : "Load more comments"}
                    </button>
                  )}
                </div>
              )}

              {/* Actions and Comment Form */}
              <div className="px-4 py-2 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black">
                <PostActions
                  post={currentPost}
                  userId={user?.id}
                  className="pb-2"
                  inputRef={inputRef}
                  onBookmarkUpdate={handleBookmarkUpdate}
                />
                <CommentForm
                  ref={commentFormRef}
                  postId={id}
                  className="pt-3 mt-2 border-t border-neutral-200 dark:border-neutral-800"
                  inputRef={inputRef}
                />
              </div>
            </div>
          </div>
        ) : (
          // Desktop Layout
          <>
            <div className="relative flex-1 bg-black flex items-center justify-center h-full w-auto min-h-0 max-h-full">
              <div className="relative w-full h-full flex items-center justify-center">
                <MemoizedImage
                  src={post.fileUrl}
                  alt={post.caption || "Post image"}
                  aspectRatio={post.aspectRatio}
                  onDoubleClick={handleImageDoubleClick}
                />
                {showHeartAnimation && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <Heart className="h-28 w-28 text-red-500 fill-red-500 animate-float-heart drop-shadow-lg" />
                  </div>
                )}
              </div>
            </div>

            {/* Content Section */}
            <div className={cn(
              "flex flex-col",
              "w-[350px] lg:w-[450px]",
              "h-full",
              "bg-white dark:bg-black",
              "border-l border-neutral-200 dark:border-neutral-800",
              "overflow-hidden"
            )}>
              {/* Header */}
              <DialogHeader className="flex-shrink-0 p-0 border-b border-neutral-200 dark:border-neutral-800 space-y-0">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div onClick={handleAvatarClick}>
                      <UserAvatar 
                        user={formatUserForAvatar(post.user)}
                        className="w-8 h-8"
                      />
                    </div>
                    
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1 flex-wrap">
                        <Link
                          href={href}
                          className="text-sm font-semibold"
                        >
                          {username}
                        </Link>
                        
                        {post.user.verified && <VerifiedBadge size={14} isDashboardPostHeader={true} />}
                        
                        {post.tags && post.tags.length > 0 && (
                          <>
                            <span className="text-neutral-500 dark:text-neutral-400 text-sm">•</span>
                            <span className="text-sm text-neutral-500 dark:text-neutral-400">with</span>
                            {post.tags.length === 1 ? (
                              <ProfileHoverCard user={{
                                ...post.tags[0].user,
                                bio: null
                              }}>
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
                          </>
                        )}
                        
                        <span className="text-neutral-500 dark:text-neutral-400 text-xs">•</span>
                        <Timestamp createdAt={post.createdAt} className="text-xs" />
                      </div>
                      
                      {post.location && (
                        <Link
                          href={`/dashboard/location/${encodeURIComponent(post.location)}`}
                          className="text-xs text-neutral-500 dark:text-neutral-400 hover:underline mt-1"
                        >
                          {post.location}
                        </Link>
                      )}
                    </div>
                  </div>
                  <PostOptions post={post} userId={user?.id} />
                </div>
              </DialogHeader>

              {/* Scrollable Content */}
              <ScrollArea className="flex-1">
                {/* Caption */}
                {post.caption && (
                  <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
                    <div className="flex gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm">
                          <span className="inline-flex items-center gap-1">
                            <ProfileHoverCard user={{
                              ...post.user,
                              bio: null
                            }}>
                              <Link href={href} className="font-semibold hover:underline">
                                {username}
                              </Link>
                            </ProfileHoverCard>
                            {post.user.verified && <VerifiedBadge className="h-3.5 w-3.5" isDashboardPostHeader={true} />}
                          </span>
                          {' '}
                          <span className="whitespace-pre-line break-words">{post.caption}</span>
                        </div>
                        <Timestamp className="text-xs text-neutral-500 dark:text-neutral-400 mt-1" createdAt={post.createdAt} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Comments */}
                {comments.length > 0 && (
                  <div className="px-4 py-2">
                    {comments.map((comment) => (
                      <Comment
                        key={`${comment.id}-${comment.createdAt}`}
                        comment={comment}
                        replies={comment.replies}
                        inputRef={inputRef}
                        postUserId={post.user.id}
                        onReply={handleReplyToComment}
                        hasStoryRing={comment.user.hasActiveStory}
                        onAvatarClick={async (e) => {
                          e.preventDefault();
                          if (comment.user.hasActiveStory) {
                            try {
                              const response = await fetch(`/api/user-stories/${comment.user.id}`);
                              const { success, data: stories } = await response.json();
                              
                              if (success && stories && stories.length > 0) {
                                storyModal.setUserStories([{ userId: comment.user.id, stories }]);
                                storyModal.setUserId(comment.user.id);
                                storyModal.setCurrentUserIndex(0);
                                storyModal.onOpen();
                              }
                            } catch (error) {
                              // Silently handle error
                            }
                          } else {
                            router.push(`/dashboard/${comment.user.username}`);
                          }
                        }}
                      />
                    ))}

                    {comments.length >= 10 && hasMore && (
                      <button
                        onClick={fetchMoreComments}
                        disabled={isLoadingComments}
                        className={cn(
                          "text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300",
                          "py-3 w-full text-center",
                          isLoadingComments && "cursor-not-allowed opacity-50"
                        )}
                      >
                        {isLoadingComments ? "Loading..." : "Load more comments"}
                      </button>
                    )}
                  </div>
                )}
              </ScrollArea>

              {/* Actions and Comment Form */}
              <div className="flex-shrink-0 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black">
                <div className="px-4 py-2 flex flex-col gap-2">
                  <PostActions
                    post={currentPost}
                    userId={user?.id}
                    className="pb-2"
                    inputRef={inputRef}
                    onBookmarkUpdate={handleBookmarkUpdate}
                  />
                  <CommentForm
                    ref={commentFormRef}
                    postId={id}
                    className="pt-3 mt-2 border-t border-neutral-200 dark:border-neutral-800"
                    inputRef={inputRef}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContentWithoutClose>

      {/* Tagged Users Modal */}
      {post.tags && post.tags.length > 0 && (
        <TaggedUsersModal
          isOpen={showTaggedModal}
          onClose={() => setShowTaggedModal(false)}
          tags={post.tags}
        />
      )}
    </Dialog>
  );
}

export default PostView;
