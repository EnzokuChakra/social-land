"use client";

import { useEffect, useState } from "react";
import { useInView } from "react-intersection-observer";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import ReelCard from "./ReelCard";

interface Reel {
  id: string;
  caption: string | null;
  fileUrl: string;
  thumbnail: string;
  views: number;
  createdAt: string;
  user: {
    id: string;
    username: string;
    image: string | null;
    verified: boolean;
  };
  _count: {
    likes: number;
    comments: number;
  };
  isLiked: boolean;
}

interface ReelsResponse {
  reels: Reel[];
  hasMore: boolean;
  page: number;
}

export default function ReelsFeed() {
  const { ref, inView } = useInView();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } =
    useInfiniteQuery<ReelsResponse>({
      queryKey: ["reels-feed"],
      queryFn: async ({ pageParam }) => {
        const res = await fetch(
          `/api/reels/feed?page=${pageParam}&limit=10`
        );
        return res.json();
      },
      initialPageParam: 1,
      getNextPageParam: (lastPage: ReelsResponse) => {
        if (lastPage.hasMore) {
          return lastPage.page + 1;
        }
        return undefined;
      },
    });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, fetchNextPage, hasNextPage, isFetchingNextPage]);

  const allReels = data?.pages.flatMap((page) => page.reels) ?? [];

  if (status === "pending") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500">Error loading reels</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 pb-20">
      {allReels.map((reel: Reel, index: number) => (
        <div
          key={reel.id}
          ref={index === allReels.length - 1 ? ref : undefined}
          className="w-full max-w-3xl"
        >
          <ReelCard reel={reel} />
        </div>
      ))}
      
      {isFetchingNextPage && (
        <div className="flex justify-center p-4">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}
    </div>
  );
} 