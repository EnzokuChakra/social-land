"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useInView } from "react-intersection-observer";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { post as Post } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { MessageCircle, Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { CustomLoader } from "@/components/ui/custom-loader";

type PostWithUser = Post & {
  user: {
    id: string;
    username: string | null;
    image: string | null;
    verified: boolean;
  };
  likes: { id: string }[];
  savedBy: { id: string }[];
  _count: {
    likes: number;
    comments: number;
  };
};

interface ExploreResponse {
  posts: PostWithUser[];
  hasMore: boolean;
  page: number;
}

export default function ExplorePage() {
  const { data: session } = useSession();
  const [hoveredPost, setHoveredPost] = useState<string | null>(null);
  const loadedImages = useRef<Set<string>>(new Set());

  // Memoize the query function
  const fetchExplorePosts = useCallback(async ({ pageParam }: { pageParam: number }) => {
    const res = await fetch(`/api/posts/explore?page=${pageParam}&limit=24`);
    if (!res.ok) {
      throw new Error('Failed to fetch posts');
    }
    return res.json();
  }, []);

  // Infinite scroll implementation with optimized settings
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } =
    useInfiniteQuery({
      queryKey: ["explore-posts"],
      queryFn: fetchExplorePosts,
      initialPageParam: 1,
      getNextPageParam: (lastPage: ExploreResponse) => {
        if (lastPage.hasMore) {
          return lastPage.page + 1;
        }
        return undefined;
      },
      staleTime: 30 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    });

  // Memoize the intersection observer callback
  const handleInView = useCallback((inView: boolean) => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Intersection observer for infinite scroll
  const { ref, inView } = useInView({
    threshold: 0.1,
    rootMargin: "100px",
    onChange: handleInView
  });

  const handleImageLoad = useCallback((postId: string) => {
    loadedImages.current.add(postId);
  }, []);

  // Memoize the posts array
  const allPosts = useMemo(() => 
    data?.pages.flatMap((page) => page.posts) ?? []
  , [data?.pages]);

  // Memoize the post grid component
  const PostGrid = useMemo(() => (
    <div className="grid grid-cols-3 gap-1 md:gap-2 mt-8">
      {allPosts.map((post: PostWithUser, index: number) => (
        <motion.div
          key={post.id}
          ref={index === allPosts.length - 1 ? ref : undefined}
          initial={{ opacity: 0 }}
          animate={{ opacity: loadedImages.current.has(post.id) ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          className="relative aspect-square group cursor-pointer bg-neutral-100 dark:bg-neutral-900"
          onMouseEnter={() => setHoveredPost(post.id)}
          onMouseLeave={() => setHoveredPost(null)}
        >
          <Link href={`/dashboard/p/${post.id}`} className="relative block w-full h-full">
            <Image
              src={post.fileUrl}
              alt="Post"
              fill
              className={cn(
                "object-cover transition-opacity duration-300",
                loadedImages.current.has(post.id) ? "opacity-100" : "opacity-0"
              )}
              sizes="(max-width: 768px) 33vw, 25vw"
              priority={index < 12}
              loading={index < 12 ? "eager" : "lazy"}
              onLoadingComplete={() => handleImageLoad(post.id)}
            />
            <div
              className={cn(
                "absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity",
                "flex items-center justify-center gap-6 text-white"
              )}
            >
              <div className="flex items-center gap-1">
                <Heart className="h-5 w-5 fill-white" />
                <span className="font-semibold">{post._count.likes}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="h-5 w-5 fill-white" />
                <span className="font-semibold">{post._count.comments}</span>
              </div>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  ), [allPosts, ref, handleImageLoad, hoveredPost]);

  if (status === "pending") {
    return (
      <div className="container max-w-7xl px-4 min-h-[calc(100vh-80px)] flex items-center justify-center">
        <CustomLoader size="default" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="container max-w-7xl px-4 min-h-[calc(100vh-80px)] flex items-center justify-center">
        <p className="text-red-500">Error loading posts</p>
      </div>
    );
  }

  // Check if we have any posts
  if (!allPosts || allPosts.length === 0) {
    return (
      <div className="container max-w-7xl px-4 min-h-[calc(100vh-80px)] flex items-center justify-center">
        <p className="text-muted-foreground">No posts found</p>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl px-4">
      <AnimatePresence mode="wait">
        {PostGrid}
      </AnimatePresence>

      {isFetchingNextPage && (
        <div className="flex justify-center py-8">
          <CustomLoader size="default" />
        </div>
      )}
    </div>
  );
} 