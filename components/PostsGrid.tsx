"use client";

import { PostWithExtras } from "@/lib/definitions";
import { HeartIcon, MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";

export function PostsGrid({ posts: initialPosts }: { posts: PostWithExtras[] | undefined }) {
  const [posts, setPosts] = useState<PostWithExtras[] | undefined>(initialPosts);
  const [isMounted, setIsMounted] = useState(false);
  const [hoveredPostId, setHoveredPostId] = useState<string | null>(null);

  // Update posts when initialPosts changes
  useEffect(() => {
    setPosts(initialPosts);
  }, [initialPosts]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Listen for post deletion events
  useEffect(() => {
    const handlePostDelete = (event: CustomEvent<{ postId: string }>) => {
      setPosts((prevPosts) => {
        if (!prevPosts) return prevPosts;
        return prevPosts.filter(post => post.id !== event.detail.postId);
      });
    };

    // Add event listener
    window.addEventListener('post-deleted', handlePostDelete as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener('post-deleted', handlePostDelete as EventListener);
    };
  }, []);

  if (!isMounted) {
    return null;
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center space-y-3 max-w-3xl lg:max-w-4xl mx-auto pb-20">
        <p className="font-semibold text-sm text-neutral-400">No more posts.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-0.5 md:gap-1 lg:gap-2 mt-8">
      {posts.map((post, index) => (
        <Link
          href={`/dashboard/p/${post.id}`}
          key={post.id}
          className="relative aspect-square group"
          onMouseEnter={() => setHoveredPostId(post.id)}
          onMouseLeave={() => setHoveredPostId(null)}
        >
          <Image
            src={post.fileUrl}
            alt={`Post ${index + 1}`}
            fill
            priority={index === 0}
            sizes="(max-width: 768px) 33vw, 25vw"
            className="object-cover"
          />

          <div className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${hoveredPostId === post.id ? 'opacity-100' : 'opacity-0'}`}>
            <div className="absolute inset-0 flex items-center justify-center gap-6">
              <div className="flex items-center gap-2 font-bold text-white">
                <HeartIcon className="w-6 h-6 fill-white text-white" />
                <p className="text-base">{post.likes?.length || 0}</p>
              </div>
              <div className="flex items-center gap-2 font-bold text-white">
                <MessageCircle className="w-6 h-6 fill-transparent text-white" />
                <p className="text-base">{post.comments?.length || 0}</p>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default PostsGrid;
