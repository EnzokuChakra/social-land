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
import { usePathname, useRouter } from "next/navigation";
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
}: {
  followers: FollowerWithExtras[];
  username: string;
  isPrivate?: boolean;
  isFollowing?: boolean;
}) {
  const mount = useMount();
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const isFollowersPage = pathname === `/dashboard/${username}/followers`;

  console.log("[FOLLOWERS_MODAL] Props:", {
    username,
    isPrivate,
    isFollowing,
    followersCount: followers?.length,
    followers: followers?.map(f => ({
      id: f.follower.id,
      username: f.follower.username,
      followerId: f.followerId
    }))
  });

  if (!mount) return null;

  const showFollowers = !isPrivate || isFollowing || session?.user?.username === username;

  return (
    <Dialog
      open={isFollowersPage}
      onOpenChange={(isOpen) => !isOpen && router.back()}
    >
      <DialogContent className="dialogContent max-w-md h-[80vh] flex flex-col bg-white dark:bg-neutral-950">
        <DialogHeader className="border-b border-neutral-200 dark:border-neutral-800 px-4 py-4">
          <DialogTitle className="text-center font-semibold text-base">
            Followers
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-neutral-600">
            {followers?.length || 0} {followers?.length === 1 ? 'person follows' : 'people follow'} {username}
          </DialogDescription>
        </DialogHeader>

        {isPrivate && !showFollowers ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <p className="text-center text-neutral-600 dark:text-neutral-400">
              This account is private. Follow this account to see their followers.
            </p>
          </div>
        ) : followers?.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <p className="text-center text-neutral-600 dark:text-neutral-400">
              {username === session?.user?.username 
                ? "You don't have any followers yet."
                : "This user doesn't have any followers yet."}
            </p>
          </div>
        ) : (
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {followers?.map((follower) => {
                console.log("[FOLLOWERS_MODAL] Rendering follower:", {
                  id: follower.follower.id,
                  username: follower.follower.username,
                  followerId: follower.followerId
                });
                
                return (
                  <div
                    key={`${follower.followerId}-${follower.follower.id}`}
                    className="flex items-center justify-between gap-2 w-full"
                  >
                    <div className="flex items-center gap-2">
                      <Link href={`/dashboard/${follower.follower.username}`}>
                        <UserAvatar user={follower.follower} />
                      </Link>
                      <div className="flex flex-col gap-1">
                        <Link 
                          href={`/dashboard/${follower.follower.username}`}
                          className="font-semibold text-sm hover:underline"
                        >
                          {follower.follower.username}
                        </Link>
                        <p className="text-sm text-gray-500">{follower.follower.name}</p>
                      </div>
                    </div>
                    {session?.user?.id !== follower.follower.id && (
                      <div className="text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white px-4 py-1.5 rounded-lg font-semibold">
                        Following
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
