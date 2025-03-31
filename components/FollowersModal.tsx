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
import UserListItem from "./UserListItem";
import { useSession } from "next-auth/react";
import UserAvatar from "./UserAvatar";
import FollowButton from "./FollowButton";
import Link from "next/link";
import { cn } from "@/lib/utils";

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

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-[400px] p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="text-lg font-semibold">Followers</DialogTitle>
          <DialogDescription>
            People following {username}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[400px]">
          {followers.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              {username} has no followers yet
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {followers.map((user) => (
                <div key={user.id} className="flex items-center justify-between">
                  <Link
                    href={`/dashboard/${user.username}`}
                    className="flex items-center gap-3 hover:opacity-75 transition"
                  >
                    <UserAvatar
                      user={user}
                      className="h-8 w-8"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">{user.username}</span>
                      {user.name && (
                        <span className="text-xs text-muted-foreground">{user.name}</span>
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
