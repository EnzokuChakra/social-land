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

  console.log("[FOLLOWERS_MODAL] Props:", {
    username,
    isPrivate,
    isFollowing,
    followersCount: followers?.length,
    followers: followers?.map(f => ({
      id: f.id,
      username: f.username,
      followerId: f.followerId
    }))
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

  const filteredFollowers = followers.filter(user => 
    user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 bg-white dark:bg-neutral-900">
        <DialogHeader className="border-b border-neutral-200 dark:border-neutral-800">
          <DialogTitle className="text-center font-semibold text-lg py-2">
            Followers
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search"
              className="pl-8 bg-muted/60"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <ScrollArea className="h-96 overflow-y-auto">
          {filteredFollowers.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              {searchQuery ? "No results found" : `${username} has no followers yet`}
            </div>
          ) : (
            <div className="flex flex-col">
              {filteredFollowers.map((user) => (
                <div 
                  key={user.id} 
                  className="flex items-center justify-between p-4 hover:bg-muted/40 transition"
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
                      <span className="text-sm font-semibold">{user.username}</span>
                      {user.name && (
                        <span className="text-sm text-muted-foreground">{user.name}</span>
                      )}
                    </div>
                  </Link>
                  {session?.user?.username !== user.username && (
                    <FollowButton
                      followingId={user.id}
                      isFollowing={user.status === "ACCEPTED"}
                      hasPendingRequest={user.status === "PENDING"}
                      isPrivate={user.isPrivate}
                      isFollowedByUser={false}
                      className="h-9"
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
