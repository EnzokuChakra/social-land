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
      id: f.following.id,
      username: f.following.username,
      followingId: f.followingId
    }))
  });

  if (!mount) return null;

  const showFollowing = !isPrivate || isFollowing || session?.user?.username === username;

  return (
    <Dialog
      open={isFollowingPage}
      onOpenChange={(isOpen) => !isOpen && router.back()}
    >
      <DialogContent className="dialogContent max-w-md h-[80vh] flex flex-col bg-white dark:bg-neutral-950">
        <DialogHeader className="border-b border-neutral-200 dark:border-neutral-800 px-4 py-4">
          <DialogTitle className="text-center font-semibold text-base">
            Following
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-neutral-600">
            {following?.length || 0} {following?.length === 1 ? 'person followed by' : 'people followed by'} {username}
          </DialogDescription>
        </DialogHeader>

        {isPrivate && !showFollowing ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <p className="text-center text-neutral-600 dark:text-neutral-400">
              This account is private. Follow this account to see who they follow.
            </p>
          </div>
        ) : following?.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <p className="text-center text-neutral-600 dark:text-neutral-400">
              {username === session?.user?.username 
                ? "You are not following anyone yet."
                : "This user is not following anyone yet."}
            </p>
          </div>
        ) : (
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {following?.map((follow) => {
                console.log("[FOLLOWING_MODAL] Rendering following:", {
                  id: follow.following.id,
                  username: follow.following.username,
                  followingId: follow.followingId,
                  isFollowing: follow.isFollowing,
                  hasPendingRequest: follow.hasPendingRequest
                });

                return (
                  <div
                    key={`${follow.followingId}-${follow.following.id}`}
                    className="flex items-center justify-between gap-2 w-full"
                  >
                    <div className="flex items-center gap-2">
                      <Link href={`/dashboard/${follow.following.username}`}>
                        <UserAvatar user={follow.following} />
                      </Link>
                      <div className="flex flex-col gap-1">
                        <Link 
                          href={`/dashboard/${follow.following.username}`}
                          className="font-semibold text-sm hover:underline"
                        >
                          {follow.following.username}
                        </Link>
                        <p className="text-sm text-gray-500">{follow.following.name}</p>
                      </div>
                    </div>
                    {session?.user?.id !== follow.following.id && (
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
