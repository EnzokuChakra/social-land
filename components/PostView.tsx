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
import { PostWithExtras, CommentWithExtras, SavedPost, User, CommentLike, SavedPostWithExtras } from "@/lib/definitions";
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
import { useSocket } from "@/hooks/use-socket";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { getSocket } from "@/lib/socket";

const MemoizedImage = memo(({ src, alt, aspectRatio, onDoubleClick }: { 
  src: string;
  alt: string;
  aspectRatio: number;
  onDoubleClick?: () => void;
}) => (
  <Image
    src={src}
    alt={alt}
    className={cn(
      "w-full h-auto",
      aspectRatio === 1 ? "object-cover" : "object-contain"
    )}
    width={1200}
    height={1200}
    priority
    quality={100}
    onDoubleClick={onDoubleClick}
  />
));
MemoizedImage.displayName = "MemoizedImage";

const MemoizedDesktopImage = memo(({ src, alt, aspectRatio }: {
  src: string;
  alt: string;
  aspectRatio: number;
}) => (
  <div className={cn(
    "relative flex-1 bg-black flex items-center justify-center",
    "h-full w-auto",
    "min-h-0",
    "max-h-full"
  )}>
    <div className="relative w-full h-full flex items-center justify-center">
      <Image
        src={src}
        alt={alt}
        className={cn(
          "max-h-full w-auto",
          aspectRatio === 1 ? "object-cover" : "object-contain"
        )}
        width={1200}
        height={1200}
        priority
        quality={100}
      />
    </div>
  </div>
));
MemoizedDesktopImage.displayName = "MemoizedDesktopImage";

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
  const [showDoubleClickHint, setShowDoubleClickHint] = useState(false);
  const [viewedStories, setViewedStories] = useState<Record<string, boolean>>({});
  const [stories, setStories] = useState<any[]>([]);
  
  // Add shouldShowStoryRing logic
  const shouldShowStoryRing = useMemo(() => {
    const isCurrentUser = session?.user?.id === post.user.id;
    const isFollowing = post.user.isFollowing;
    return isCurrentUser || (!post.user.isPrivate && post.user.hasActiveStory) || (post.user.isPrivate && isFollowing && post.user.hasActiveStory);
  }, [session?.user?.id, post.user.id, post.user.isPrivate, post.user.hasActiveStory, post.user.isFollowing]);

  // Initialize currentPost with expanded likes data
  const [currentPost, setCurrentPost] = useState<PostWithExtras>(() => ({
    ...post,
    likes: post.likes.map(like => ({
      ...like,
      user: {
        ...like.user,
        isFollowing: like.user.isFollowing || false,
        hasPendingRequest: like.user.hasPendingRequest || false,
        isPrivate: like.user.isPrivate || false
      }
    })),
    savedBy: post.savedBy || [],
    comments: post.comments || [],
    tags: post.tags || []
  }));

  // Initialize viewed stories from localStorage on mount
  useEffect(() => {
    if (session?.user?.id && post.user.id) {
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
    }
  }, [session?.user?.id, post.user.id]);

  // Fetch stories when component mounts
  useEffect(() => {
    const fetchStories = async () => {
      if (post.user.hasActiveStory) {
        try {
          const response = await fetch(`/api/user-stories/${post.user.id}`);
          const { success, data } = await response.json();
          if (success && data) {
            setStories(data);
          }
        } catch (error) {
          console.error("Error fetching stories:", error);
        }
      }
    };

    fetchStories();
  }, [post.user.id, post.user.hasActiveStory]);

  // Listen for story viewed events
  useEffect(() => {
    const handleStoryViewed = (event: CustomEvent) => {
      if (event.detail.userId === post.user.id && session?.user?.id) {
        const storageKey = `viewed_stories_${post.user.id}_${session.user.id}`;
        const viewedStories = event.detail.viewedStories || {};
        
        // If it's the user's own story, update the last viewed timestamp
        if (event.detail.isOwnStory) {
          const lastViewedKey = `last_viewed_own_stories_${session.user.id}`;
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
  }, [post.user.id, session?.user?.id]);

  // Check if there are unviewed stories
  const hasUnviewedStories = useMemo(() => {
    if (!post.user.hasActiveStory) return false;
    
    const isCurrentUser = session?.user?.id === post.user.id;
    const storageKey = `viewed_stories_${post.user.id}_${session?.user?.id}`;
    
    if (typeof window === 'undefined') return false;
    
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
        console.error("Error parsing viewed stories:", error);
        return true;
      }
    }
  }, [post.user.hasActiveStory, post.user.id, session?.user?.id, stories, viewedStories]);

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
        // Small delay to ensure proper focus restoration in CEF
        setTimeout(() => {
          previousFocusRef.current?.focus();
        }, 0);
      }
    };
  }, []);

  // Handle modal close
  const handleModalClose = useCallback((open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Force focus back to the previous element in CEF
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        setTimeout(() => {
          previousFocusRef.current?.focus();
          router.back();
        }, 0);
      } else {
        router.back();
      }
    }
  }, [router]);

  useEffect(() => {
    setIsOpen(true);
  }, [id]);

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

  // Update currentPost when post prop changes
  useEffect(() => {
    setCurrentPost(prevPost => ({
      ...prevPost,
      ...post,
      likes: post.likes.map(like => ({
        ...like,
        user: {
          ...like.user,
          isFollowing: like.user.isFollowing || false,
          hasPendingRequest: like.user.hasPendingRequest || false,
          isPrivate: like.user.isPrivate || false
        }
      })),
      savedBy: post.savedBy || prevPost.savedBy,
      comments: post.comments || prevPost.comments,
      tags: post.tags || prevPost.tags
    }));
  }, [post]);

  // Socket handler for likes updates
  useEffect(() => {
    if (!socket) return;

    const handleLikeUpdate = (data: any) => {
      setCurrentPost(prevPost => {
        const existingLikes = new Map(prevPost.likes.map(like => [like.user.id, like]));
        
        let updatedLikes = [...prevPost.likes];
        if (data.action === "unlike") {
          updatedLikes = updatedLikes.filter(like => like.user_id !== data.user_id);
        } else {
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

  // Real-time updates polling
  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;
    
    if (isPostModal && mount) {
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
      intervalId = setInterval(refreshPostData, 15000);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isPostModal, mount, id]);

  // Show double-click hint when post is first opened and not liked
  useEffect(() => {
    if (user?.id && !currentPost.likes.some(like => like.user_id === user.id)) {
      setShowDoubleClickHint(true);
      const timer = setTimeout(() => {
        setShowDoubleClickHint(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [user?.id, currentPost.likes]);

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
        // Silently handle error
      }
    } else {
      router.push(href);
    }
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
    if (!user?.id) return;
    
    // Prevent multiple rapid double-clicks
    const now = Date.now();
    if (now - lastDoubleTapTime < 1000) {
      return;
    }
    setLastDoubleTapTime(now);
    
    // Always show heart animation on double-click
    setShowHeartAnimation(true);
    setTimeout(() => setShowHeartAnimation(false), 1000);
    
    // Check if post is already liked by the user
    const isAlreadyLiked = currentPost.likes.some(like => like.user_id === user.id);
    if (isAlreadyLiked) {
      return;
    }

    try {
      // Find the like button and click it
      const likeButton = document.querySelector(`button[data-post-id="${currentPost.id}"]`);
      if (likeButton && !likeButton.hasAttribute('disabled')) {
        (likeButton as HTMLButtonElement).click();
      }
    } catch (error) {
      // Silently handle error
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

  if (!mount) return null;

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
          "bg-white dark:bg-neutral-950",
          "overflow-y-auto md:overflow-hidden"
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
                <div className="absolute inset-0 flex items-center justify-center">
                  <Heart className="h-24 w-24 text-red-500 fill-red-500 animate-float-heart" />
                </div>
              )}
              {showDoubleClickHint && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative">
                      <Heart className="h-16 w-16 text-white/80 animate-pulse" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-20 w-20 rounded-full bg-white/10 animate-ping" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Content Section */}
            <div className="flex flex-col w-full bg-white dark:bg-black">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-3">
                  <div
                    onClick={handleAvatarClick}
                    className={cn(
                      "relative cursor-pointer",
                      shouldShowStoryRing && hasUnviewedStories && "before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-tr before:from-yellow-400 before:to-fuchsia-600 before:p-[2px] before:w-[calc(100%+4px)] before:h-[calc(100%+4px)] before:-left-[2px] before:-top-[2px]",
                      shouldShowStoryRing && !hasUnviewedStories && "before:absolute before:inset-0 before:rounded-full before:bg-neutral-300 dark:before:bg-neutral-700 before:p-[2px] before:w-[calc(100%+4px)] before:h-[calc(100%+4px)] before:-left-[2px] before:-top-[2px]"
                    )}
                  >
                    <div className={cn(
                      "relative rounded-full overflow-hidden w-[32px] h-[32px]",
                      shouldShowStoryRing && "p-[2px] bg-white dark:bg-black"
                    )}>
                      <UserAvatar 
                        user={post.user}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  <div className="text-sm flex-grow min-w-0">
                    <div className="flex items-center gap-1">
                      <ProfileHoverCard user={post.user}>
                        <Link href={href} className="font-semibold hover:underline truncate">
                          {username}
                        </Link>
                      </ProfileHoverCard>
                      {post.user.verified && <VerifiedBadge className="h-3.5 w-3.5" />}
                      {post.tags && post.tags.length > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="text-[13px] text-neutral-500 dark:text-neutral-400">with</span>
                          {post.tags.length === 1 ? (
                            <ProfileHoverCard user={post.tags[0].user}>
                              <Link
                                href={`/dashboard/${post.tags[0].user.username}`}
                                className="font-semibold hover:underline text-[13px] inline-flex items-center gap-1"
                              >
                                {post.tags[0].user.username}
                                {post.tags[0].user.verified && <VerifiedBadge className="h-3.5 w-3.5" />}
                              </Link>
                            </ProfileHoverCard>
                          ) : (
                            <button
                              onClick={() => setShowTaggedModal(true)}
                              className="font-semibold hover:underline text-[13px]"
                            >
                              {post.tags.length} others
                            </button>
                          )}
                        </span>
                      )}
                    </div>
                    {post.location && (
                      <Link
                        href={`/dashboard/location/${encodeURIComponent(post.location)}`}
                        className="text-xs text-neutral-500 dark:text-neutral-400 hover:underline block mt-0.5"
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
                          <ProfileHoverCard user={post.user}>
                            <Link href={href} className="font-semibold hover:underline">
                              {username}
                            </Link>
                          </ProfileHoverCard>
                          {post.user.verified && <VerifiedBadge className="h-3.5 w-3.5" />}
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
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Heart className="h-24 w-24 text-red-500 fill-red-500 animate-float-heart" />
                  </div>
                )}
                {showDoubleClickHint && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="relative">
                        <Heart className="h-16 w-16 text-white/80 animate-pulse" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="h-20 w-20 rounded-full bg-white/10 animate-ping" />
                        </div>
                      </div>
                    </div>
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
                    <div
                      onClick={handleAvatarClick}
                      className={cn(
                        "relative cursor-pointer",
                        shouldShowStoryRing && hasUnviewedStories && "before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-tr before:from-yellow-400 before:to-fuchsia-600 before:p-[2px] before:w-[calc(100%+4px)] before:h-[calc(100%+4px)] before:-left-[2px] before:-top-[2px]",
                        shouldShowStoryRing && !hasUnviewedStories && "before:absolute before:inset-0 before:rounded-full before:bg-neutral-300 dark:before:bg-neutral-700 before:p-[2px] before:w-[calc(100%+4px)] before:h-[calc(100%+4px)] before:-left-[2px] before:-top-[2px]"
                      )}
                    >
                      <div className={cn(
                        "relative rounded-full overflow-hidden w-[32px] h-[32px]",
                        shouldShowStoryRing && "p-[2px] bg-white dark:bg-black"
                      )}>
                        <UserAvatar 
                          user={post.user}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    <div className="text-sm flex-grow min-w-0">
                      <div className="flex items-center gap-1">
                        <ProfileHoverCard user={post.user}>
                          <Link href={href} className="font-semibold hover:underline truncate">
                            {username}
                          </Link>
                        </ProfileHoverCard>
                        {post.user.verified && <VerifiedBadge className="h-3.5 w-3.5" />}
                        {post.tags && post.tags.length > 0 && (
                          <span className="flex items-center gap-1">
                            <span className="text-[13px] text-neutral-500 dark:text-neutral-400">with</span>
                            {post.tags.length === 1 ? (
                              <ProfileHoverCard user={post.tags[0].user}>
                                <Link
                                  href={`/dashboard/${post.tags[0].user.username}`}
                                  className="font-semibold hover:underline text-[13px] inline-flex items-center gap-1"
                                >
                                  {post.tags[0].user.username}
                                  {post.tags[0].user.verified && <VerifiedBadge className="h-3.5 w-3.5" />}
                                </Link>
                              </ProfileHoverCard>
                            ) : (
                              <button
                                onClick={() => setShowTaggedModal(true)}
                                className="font-semibold hover:underline text-[13px]"
                              >
                                {post.tags.length} others
                              </button>
                            )}
                          </span>
                        )}
                      </div>
                      {post.location && (
                        <Link
                          href={`/dashboard/location/${encodeURIComponent(post.location)}`}
                          className="text-xs text-neutral-500 dark:text-neutral-400 hover:underline block mt-0.5"
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
                            <ProfileHoverCard user={post.user}>
                              <Link href={href} className="font-semibold hover:underline">
                                {username}
                              </Link>
                            </ProfileHoverCard>
                            {post.user.verified && <VerifiedBadge className="h-3.5 w-3.5" />}
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
