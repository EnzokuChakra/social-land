"use client";

import { PostWithExtras } from "@/lib/definitions";
import { HeartIcon, MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";

export function PostsGrid({ posts: initialPosts }: { posts: PostWithExtras[] | undefined }) {
  const [posts, setPosts] = useState<PostWithExtras[] | undefined>(initialPosts);
  const [isMounted, setIsMounted] = useState(false);

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
      console.log('Post deleted event received:', event.detail.postId);
      setPosts((prevPosts) => {
        if (!prevPosts) return prevPosts;
        const newPosts = prevPosts.filter(post => post.id !== event.detail.postId);
        console.log('Posts after filter:', newPosts.length);
        return newPosts;
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

  if (!posts?.length) {
    return (
      <div className="flex flex-col items-center justify-center space-y-3 max-w-3xl lg:max-w-4xl mx-auto pb-20">
        <p className="font-semibold text-sm text-neutral-400">No posts to display.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-0.5 md:gap-1 lg:gap-2">
      {posts.map((post, index) => (
        <Link
          href={`/dashboard/p/${post.id}`}
          key={post.id}
          className="relative aspect-square group"
        >
          <Image
            src={post.fileUrl}
            alt={`Post ${index + 1}`}
            fill
            priority={index === 0}
            sizes="(max-width: 768px) 33vw, 25vw"
            className="object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/images/placeholder.png';
            }}
          />

          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200">
            <div className="absolute inset-0 hidden group-hover:flex items-center justify-center gap-4">
              <div className="flex items-center gap-1 font-bold text-white">
                <HeartIcon className="w-5 h-5 fill-white text-white" />
                <p className="text-sm md:text-base">{post.likes.length}</p>
              </div>
              <div className="flex items-center gap-1 font-bold text-white">
                <MessageCircle className="w-5 h-5 fill-transparent text-white" />
                <p className="text-sm md:text-base">{post.comments.length}</p>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default PostsGrid;
