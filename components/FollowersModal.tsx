"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import useMount from "@/hooks/useMount";
import { FollowerWithExtras } from "@/lib/definitions";
import { ScrollArea } from "./ui/scroll-area";
import { useSession } from "next-auth/react";
import UserAvatar from "./UserAvatar";
import FollowButton from "./FollowButton";
import Link from "next/link";
import { Search } from "lucide-react";
import { useState } from "react";
import { Input } from "./ui/input";
import { useQuery, useQueryClient } from '@tanstack/react-query';

async function fetchFollowers(username: string): Promise<FollowerWithExtras[]> {
  const response = await fetch(`/api/users/followers?username=${username}`);
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
  const mount = useMount();
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  // Use the followers query
  const { data: currentFollowers = followers } = useQuery<FollowerWithExtras[]>({
    queryKey: ['followers', username],
    queryFn: () => fetchFollowers(username),
    initialData: followers,
    staleTime: 60000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  if (!mount) return null;

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

  // Filter followers based on search query
  const filteredFollowers = currentFollowers.filter(user => 
    user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort followers: current user first, then most recent followers
  const sortedFollowers = [...filteredFollowers].sort((a, b) => {
    // Current user first
    if (a.username === session?.user?.username) return -1;
    if (b.username === session?.user?.username) return 1;
    
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
        </DialogHeader>

        <div className="p-4 border-b border-neutral-800">
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

        <ScrollArea className="max-h-[60vh]">
          {sortedFollowers.length === 0 ? (
            <div className="p-4 text-center text-neutral-400">
              {searchQuery ? "No results found" : `${username} has no followers yet`}
            </div>
          ) : (
            <div className="flex flex-col">
              {sortedFollowers.map((user) => (
                <div 
                  key={user.uniqueId} 
                  className="flex items-center justify-between p-4 hover:bg-neutral-900 transition"
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
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
