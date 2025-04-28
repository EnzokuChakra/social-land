"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import useMount from "@/hooks/useMount";
import { FollowerWithExtras } from "@/lib/definitions";
import { ScrollArea } from "./ui/scroll-area";
import { useSession } from "next-auth/react";
import UserAvatar from "./UserAvatar";
import FollowButton from "./FollowButton";
import Link from "next/link";
import { Search } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "./ui/input";
import { useInfiniteQuery } from '@tanstack/react-query';

type FollowersResponse = {
  followers: FollowerWithExtras[];
  nextCursor: string | null;
  hasMore: boolean;
};

async function fetchFollowers(username: string, cursor?: string | null): Promise<FollowersResponse> {
  const url = new URL('/api/users/followers', window.location.origin);
  url.searchParams.set('username', username);
  if (cursor) {
    url.searchParams.set('cursor', cursor);
  }
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error('Failed to fetch followers');
  }
  return response.json();
}

export default function FollowersModal({
  followers,
  username,
  isPrivate,
  isFollowing,
  onClose
}: {
  followers: FollowerWithExtras[];
  username: string;
  isPrivate?: boolean;
  isFollowing?: boolean;
  onClose: () => void;
}) {
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Use infinite query for pagination
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    refetch,
    isLoading
  } = useInfiniteQuery({
    queryKey: ['followers', username],
    queryFn: async ({ pageParam }) => {
      return fetchFollowers(username, pageParam as string | null);
    },
    initialData: {
      pages: [{
        followers,
        nextCursor: null,
        hasMore: false
      }],
      pageParams: [null]
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 60000, // Cache for 1 minute
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });

  // Handle scroll to load more
  const handleScroll = useCallback(() => {
    if (!scrollAreaRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current;
    if (scrollHeight - scrollTop <= clientHeight * 1.5 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Add scroll event listener
  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (scrollArea) {
      scrollArea.addEventListener('scroll', handleScroll);
      return () => scrollArea.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  const showFollowers = !isPrivate || isFollowing || session?.user?.username === username;

  if (!showFollowers) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold">This account is private</h2>
          <p className="text-sm text-muted-foreground">Follow this user to see their followers</p>
        </div>
      </div>
    );
  }

  // Get all followers from all pages
  const allFollowers = data?.pages.flatMap(page => page.followers) || [];

  // Filter followers based on search query
  const filteredFollowers = allFollowers.filter(user => 
    user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort followers: current user first, then following users, then follow back users
  const sortedFollowers = [...filteredFollowers].sort((a, b) => {
    // Current user first
    if (a.username === session?.user?.username) return -1;
    if (b.username === session?.user?.username) return 1;
    
    // Then sort by following status
    const aIsFollowing = a.status === "ACCEPTED";
    const bIsFollowing = b.status === "ACCEPTED";
    if (aIsFollowing && !bIsFollowing) return -1;
    if (!aIsFollowing && bIsFollowing) return 1;
    
    // Then sort by most recent followers (newest first)
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 bg-black">
        <DialogHeader className="border-b border-neutral-800">
          <DialogTitle className="text-center font-semibold text-lg py-2 text-white">
            Followers
          </DialogTitle>
          <DialogDescription className="sr-only">
            List of users who follow {username}
          </DialogDescription>
        </DialogHeader>

        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-neutral-400" />
            <Input
              placeholder="Search"
              className="pl-8 bg-neutral-900 text-white placeholder:text-neutral-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <ScrollArea ref={scrollAreaRef} className="max-h-[60vh]">
          {isLoading ? (
            <div className="p-4 text-center text-neutral-400">
              Loading...
            </div>
          ) : sortedFollowers.length === 0 ? (
            <div className="p-4 text-center text-neutral-400">
              {searchQuery ? "No results found" : `${username} has no followers yet`}
            </div>
          ) : (
            <div className="flex flex-col border-t border-neutral-800">
              {sortedFollowers.map((user) => (
                <div 
                  key={user.uniqueId} 
                  className="flex items-center justify-between p-4 hover:bg-neutral-900 transition border-b border-neutral-800"
                >
                  <Link
                    href={`/dashboard/${user.username}`}
                    className="flex items-center gap-3"
                  >
                    <UserAvatar
                      user={user}
                      className="h-11 w-11"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-white">{user.username}</span>
                      {user.name && (
                        <span className="text-sm text-neutral-400">{user.name}</span>
                      )}
                    </div>
                  </Link>
                  {session?.user?.username !== user.username && (
                    <FollowButton
                      followingId={user.id}
                      isFollowing={user.status === "ACCEPTED"}
                      hasPendingRequest={user.status === "PENDING"}
                      isPrivate={user.isPrivate}
                      className="h-9 min-w-[104px]"
                      variant="profile"
                    />
                  )}
                </div>
              ))}
              {isFetchingNextPage && (
                <div className="p-4 text-center text-neutral-400">
                  Loading more followers...
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
