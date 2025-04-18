"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useInView } from "react-intersection-observer";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Post } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { Loader2, MessageCircle, Heart, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { use } from "react";
import { PostsGrid } from "@/components/PostsGrid";
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

interface LocationResponse {
  posts: PostWithUser[];
  hasMore: boolean;
  page: number;
  total: number;
}

export default function LocationPage({
  params,
}: {
  params: Promise<{ location: string }>;
}) {
  const resolvedParams = use(params);
  const { data: session } = useSession();
  const location = decodeURIComponent(resolvedParams.location);

  // Infinite scroll implementation
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } =
    useInfiniteQuery({
      queryKey: ["location-posts", location],
      queryFn: async ({ pageParam }) => {
        const res = await fetch(
          `/api/posts/location?location=${encodeURIComponent(location)}&page=${pageParam}&limit=24`
        );
        return res.json();
      },
      initialPageParam: 1,
      getNextPageParam: (lastPage: LocationResponse) => {
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
  const totalPosts = data?.pages[0]?.total ?? 0;

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
      <div className="flex flex-col items-center min-h-screen bg-white dark:bg-black pt-8">
        {/* Location Header */}
        <div className="w-full bg-white dark:bg-black border-b border-neutral-200 dark:border-neutral-800">
          <div className="container max-w-5xl py-8">
            <div className="flex flex-col items-center space-y-4">
              <div className="p-4 rounded-full bg-neutral-100 dark:bg-neutral-800">
                <MapPin className="h-8 w-8 text-neutral-600 dark:text-neutral-400" />
              </div>
              <h1 className="text-3xl font-bold text-center">{location}</h1>
              <p className="text-muted-foreground text-lg">
                {totalPosts.toLocaleString()} {totalPosts === 1 ? "post" : "posts"}
              </p>
            </div>
          </div>
        </div>

        {/* Posts Grid */}
        <div className="container max-w-7xl py-8 px-4">
          <div className="grid grid-cols-3 gap-1 md:gap-2 lg:gap-4">
            {allPosts.map((post: PostWithUser, index: number) => (
              <div
                key={post.id}
                ref={index === allPosts.length - 1 ? ref : undefined}
                className="relative aspect-square group cursor-pointer"
              >
                <Link href={`/dashboard/p/${post.id}`}>
                  <Image
                    src={post.fileUrl}
                    alt={post.caption || "Post"}
                    fill
                    className="object-cover rounded-sm"
                    sizes="(max-width: 768px) 33vw, 25vw"
                  />
                  {/* Hover overlay */}
                  <div
                    className={cn(
                      "absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-sm",
                      "flex items-center justify-center gap-6"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Heart className="h-6 w-6 text-white" />
                      <span className="font-semibold text-white">{post._count.likes}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-6 w-6 text-white" />
                      <span className="font-semibold text-white">{post._count.comments}</span>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>

          {/* Loading indicator */}
          {isFetchingNextPage && (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
            </div>
          )}

          {/* No more posts indicator */}
          {!hasNextPage && allPosts.length > 0 && (
            <div className="flex justify-center p-8">
              <p className="text-neutral-400">No more posts</p>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
} 