"use client";

import { PostWithExtras } from "@/lib/definitions";
import Post from "./Post";
import { useEffect, useState, useCallback } from "react";
import { useInView } from "react-intersection-observer";
import { CustomLoader } from "./ui/custom-loader";
import { useSession } from "next-auth/react";
import { getSocket } from "@/lib/socket";

interface PostsProps {
  initialPosts: PostWithExtras[];
}

export default function Posts({ initialPosts }: PostsProps) {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<PostWithExtras[]>(initialPosts);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const { ref, inView } = useInView();
  const socket = getSocket();

  // Handle new post events
  const handleNewPost = useCallback((event: CustomEvent) => {
    const eventData = event.detail;
    const newPost = eventData?.post;
    
    if (!newPost || typeof newPost !== 'object') {
      console.error("[Posts] Invalid post data received:", newPost);
      return;
    }
    
    // Ensure the post has at least the minimum required properties
    if (newPost.id && newPost.user_id && newPost.user) {
      setPosts((prev) => {
        const updatedPosts = [newPost, ...prev];
        return updatedPosts;
      });
    } else {
      console.error("[Posts] Post missing required properties:", {
        hasId: !!newPost.id,
        hasUser_id: !!newPost.user_id,
        hasUser: !!newPost.user
      });
    }
  }, []);

  // Handle comment creation events
  const handleCommentCreated = useCallback((data: { postId: string; comment: any }) => {
    setPosts((prev) => {
      return prev.map((post) => {
        if (post.id === data.postId) {
          return {
            ...post,
            comments: [...(post.comments || []), data.comment]
          };
        }
        return post;
      });
    });
  }, []);

  // Handle post deletion events
  const handlePostDeleted = useCallback((data: { postId: string }) => {
    setPosts((prev) => prev.filter((post) => post.id !== data.postId));
  }, []);

  // Handle custom post deletion events
  const handleCustomPostDeleted = useCallback((event: Event) => {
    const customEvent = event as CustomEvent<{ postId: string }>;
    handlePostDeleted(customEvent.detail);
  }, [handlePostDeleted]);

  // Add effect to log initial posts
  useEffect(() => {
    // Removed logging of initial posts
  }, [initialPosts]);

  useEffect(() => {
    if (socket && session?.user?.id) {
      // Authenticate socket with user ID
      socket.emit('authenticate', { token: session.user.id });
    }
  }, [socket, session?.user?.id]);

  useEffect(() => {
    window.addEventListener('newPost', handleNewPost as EventListener);
    window.addEventListener('postDeleted', handleCustomPostDeleted as EventListener);
    
    if (socket) {
      socket.on('postDeleted', handlePostDeleted);
      socket.on('commentCreate', handleCommentCreated);
    }
    
    return () => {
      window.removeEventListener('newPost', handleNewPost as EventListener);
      window.removeEventListener('postDeleted', handleCustomPostDeleted as EventListener);
      if (socket) {
        socket.off('postDeleted', handlePostDeleted);
        socket.off('commentCreate', handleCommentCreated);
      }
    };
  }, [handleNewPost, handlePostDeleted, handleCustomPostDeleted, handleCommentCreated, socket]);

  useEffect(() => {
    if (inView && hasMore && !loading) {
      loadMorePosts();
    }
  }, [inView, hasMore, loading]);

  const loadMorePosts = async () => {
    try {
      setLoading(true);
      const nextPage = page + 1;
      
      const response = await fetch(`/api/posts/feed?page=${nextPage}&limit=10`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }
      
      const data = await response.json();
      
      setPosts((prev) => {
        const updatedPosts = [...prev, ...data.posts];
        return updatedPosts;
      });
      setHasMore(data.hasMore);
      setPage(nextPage);
    } catch (error) {
      console.error('[POSTS] Error loading more posts:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4" suppressHydrationWarning>
      <div className="flex flex-col gap-4" suppressHydrationWarning>
        {posts.map((post) => {
          // More lenient validation that still protects against invalid data
          if (!post || typeof post !== 'object') {
            console.warn('Invalid post data structure:', post);
            return null;
          }
          return (
            <Post 
              key={`post-${post.id}`} 
              post={post} 
              priority={false}
            />
          );
        })}
      </div>
      
      {/* Loading indicator */}
      {loading && (
        <div className="flex justify-center py-4">
          <CustomLoader size="default" />
        </div>
      )}

      {/* Infinite scroll trigger */}
      {hasMore && !loading && (
        <div ref={ref} className="h-10" />
      )}
    </div>
  );
}
