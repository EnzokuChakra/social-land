"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserWithExtras } from "@/lib/definitions";
import UserAvatar from "./UserAvatar";
import Link from "next/link";
import FollowButton from "./FollowButton";
import { useSession } from "next-auth/react";

interface SuggestedUsersModalProps {
  users: UserWithExtras[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SuggestedUsersModal({
  users,
  open,
  onOpenChange,
}: SuggestedUsersModalProps) {
  const { data: session } = useSession();

  // Function to check if a user is being followed
  const checkFollowStatus = (user: UserWithExtras) => {
    return {
      isFollowing: user.followers?.some(
        (follow) => follow.followerId === session?.user?.id && follow.status === "ACCEPTED"
      ) || false,
      hasPendingRequest: user.followers?.some(
        (follow) => follow.followerId === session?.user?.id && follow.status === "PENDING"
      ) || false
    };
  };

  if (!session?.user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md h-[80vh] flex flex-col bg-white dark:bg-neutral-950">
        <DialogHeader className="border-b border-neutral-200 dark:border-neutral-800 px-4 py-4">
          <DialogTitle className="text-center font-semibold">Suggested Users</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {users.map((user) => {
              const { isFollowing, hasPendingRequest } = checkFollowStatus(user);
              const isCurrentUser = session.user.id === user.id;

              if (isCurrentUser) return null;

              return (
                <div
                  key={user.id}
                  className="flex items-center justify-between gap-x-3"
                >
                  <Link
                    href={`/dashboard/${user.username}`}
                    className="flex items-center gap-x-3 group flex-1 min-w-0"
                    onClick={() => onOpenChange(false)}
                  >
                    <UserAvatar
                      user={user}
                      className="h-11 w-11 group-hover:opacity-90 transition-opacity"
                    />
                    <div className="flex flex-col flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate group-hover:underline">
                        {user.username}
                      </p>
                      <span className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                        {user.name || ""}
                      </span>
                    </div>
                  </Link>
                  <FollowButton
                    profileId={user.id}
                    isFollowing={isFollowing}
                    hasPendingRequest={hasPendingRequest}
                    isPrivate={user.isPrivate}
                    buttonClassName="text-sm"
                  />
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
} 