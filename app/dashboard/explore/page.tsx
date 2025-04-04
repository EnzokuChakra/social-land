"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useInView } from "react-intersection-observer";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Post } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { MessageCircle, Heart } from "lucide-react";
import { motion } from "framer-motion";
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

  return (
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
            <Link href={`/dashboard/p/${post.id}`} className="relative block w-full h-full">
              <Image
                src={post.fileUrl}
                alt="Post"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 33vw, 25vw"
                priority={index < 4}
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
        <div className="container max-w-7xl px-4 min-h-[200px] flex items-center justify-center">
          <CustomLoader size="default" />
        </div>
      )}
    </div>
  );
} 