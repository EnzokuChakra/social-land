"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useInView } from "react-intersection-observer";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { MessageCircle, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { CustomLoader } from "@/components/ui/custom-loader";
import { getSocket } from "@/lib/socket";

type Post = {
  id: string;
  fileUrl: string;
  user: {
    id: string;
    username: string | null;
    image: string | null;
    verified: boolean;
  };
  _count: {
    likes: number;
    comments: number;
  };
};

export default function ExplorePage() {
  const { data: session } = useSession();
  const { ref, inView } = useInView();
  const queryClient = useQueryClient();
  const router = useRouter();
  const socket = getSocket();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    refetch
  } = useInfiniteQuery({
    queryKey: ["explore-posts"],
    queryFn: async ({ pageParam }) => {
      const response = await fetch(`/api/posts/explore?page=${pageParam}&limit=24`);
      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }
      return response.json();
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.hasMore) {
        return lastPage.page + 1;
      }
      return undefined;
    },
  });

  // Initial data refresh when page is visited
  useEffect(() => {
    // Refetch the data when the page is first visited
    refetch();
  }, [refetch]);

  // Handle privacy changes
  useEffect(() => {
    if (!socket) return;

    const handlePrivacyChange = (data: { userId: string; isPrivate: boolean }) => {
      // Invalidate and refetch the explore posts query
      queryClient.invalidateQueries({ queryKey: ["explore-posts"] });
      // Refresh the router to update the page
      router.refresh();
    };

    socket.on('privacyChanged', handlePrivacyChange);

    return () => {
      socket.off('privacyChanged', handlePrivacyChange);
    };
  }, [socket, queryClient, router]);

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
        <p className="text-red-500">Failed to load posts. Please try again later.</p>
      </div>
    );
  }

  if (allPosts.length === 0) {
    return (
      <div className="container max-w-7xl px-4 min-h-[calc(100vh-80px)] flex items-center justify-center">
        <p className="text-muted-foreground">No posts found</p>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl px-4">
      <div className="grid grid-cols-3 gap-1 md:gap-2 mt-8">
        {allPosts.map((post) => (
          <div
            key={post.id}
            className="relative aspect-square group cursor-pointer bg-black"
          >
            <Link href={`/dashboard/p/${post.id}`} className="relative block w-full h-full">
              <Image
                src={post.fileUrl}
                alt="Post"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 33vw, 25vw"
                priority={true}
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
          </div>
        ))}
      </div>

      {/* Loading indicator */}
      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <CustomLoader size="default" />
        </div>
      )}

      {/* Infinite scroll trigger */}
      {hasNextPage && !isFetchingNextPage && (
        <div ref={ref} className="h-10" />
      )}
    </div>
  );
} 