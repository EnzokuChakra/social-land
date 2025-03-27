"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useInView } from "react-intersection-observer";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Post } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { Loader2, MessageCircle, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import PageLayout from "@/components/PageLayout";

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

  // Infinite scroll implementation
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } =
    useInfiniteQuery({
      queryKey: ["explore-posts"],
      queryFn: async ({ pageParam }) => {
        const res = await fetch(
          `/api/posts/explore?page=${pageParam}&limit=24`
        );
        return res.json();
      },
      initialPageParam: 1,
      getNextPageParam: (lastPage: ExploreResponse) => {
        if (lastPage.hasMore) {
          return lastPage.page + 1;
        }
        return undefined;
      },
    });

  // Intersection observer for infinite scroll
  const { ref, inView } = useInView({
    threshold: 0,
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, fetchNextPage, hasNextPage, isFetchingNextPage]);

  const allPosts = data?.pages.flatMap((page) => page.posts) ?? [];

  if (status === "pending") {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </PageLayout>
    );
  }

  if (status === "error") {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-red-500">Error loading posts</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="container max-w-7xl px-4">
        <div className="grid grid-cols-3 gap-1 md:gap-2 mt-8">
          {allPosts.map((post: PostWithUser, index: number) => (
            <motion.div
              key={post.id}
              ref={index === allPosts.length - 1 ? ref : undefined}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index % 24 * 0.05 }}
              className="relative aspect-square group cursor-pointer"
              onMouseEnter={() => setHoveredPost(post.id)}
              onMouseLeave={() => setHoveredPost(null)}
            >
              <Link href={`/dashboard/p/${post.id}`}>
                <Image
                  src={post.fileUrl}
                  alt="Post"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 33vw, 25vw"
                />
                {/* Hover overlay */}
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
        {isFetchingNextPage && (
          <div className="flex justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
      </div>
    </PageLayout>
  );
} 