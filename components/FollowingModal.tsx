"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import useMount from "@/hooks/useMount";
import { FollowingWithExtras } from "@/lib/definitions";
import { usePathname, useRouter } from "next/navigation";
import { ScrollArea } from "./ui/scroll-area";
import UserListItem from "./UserListItem";
import { useSession } from "next-auth/react";
import UserAvatar from "./UserAvatar";
import FollowButton from "./FollowButton";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function FollowingModal({
  following,
  username,
  isPrivate,
  isFollowing
}: {
  following: FollowingWithExtras[];
  username: string;
  isPrivate?: boolean;
  isFollowing?: boolean;
}) {
  const { data: session } = useSession();
  const mount = useMount();
  const pathname = usePathname();
  const router = useRouter();
  const isFollowingPage = pathname === `/dashboard/${username}/following`;

  console.log("[FOLLOWING_MODAL] Props:", {
    username,
    isPrivate,
    isFollowing,
    followingCount: following?.length,
    following: following?.map(f => ({
      id: f.id,
      username: f.username,
      followingId: f.followingId
    }))
  });

  if (!mount) return null;

  const showFollowing = !isPrivate || isFollowing || session?.user?.username === username;

  if (!showFollowing) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold">This account is private</h2>
          <p className="text-sm text-muted-foreground">Follow this user to see who they follow</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex items-center justify-center">
      <Dialog open={isFollowingPage} onOpenChange={() => router.back()}>
        <DialogContent className="max-w-[400px] p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="text-lg font-semibold">Following</DialogTitle>
            <DialogDescription>
              People followed by {username}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px]">
            {following.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                {username} is not following anyone yet
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {following.map((user) => (
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
    </div>
  );
}
