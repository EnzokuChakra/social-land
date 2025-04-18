"use client";

import { UserWithExtras } from "@/lib/definitions";
import { useSession } from "next-auth/react";
import Link from "next/link";
import UserAvatar from "./UserAvatar";
import FollowButton from "./FollowButton";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import VerifiedBadge from "./VerifiedBadge";
import { useRouter } from "next/navigation";

interface SuggestionsProps {
  users: UserWithExtras[];
  className?: string;
  hideTitle?: boolean;
}

function Suggestions({ users, className, hideTitle = false }: SuggestionsProps) {
  const { data: session } = useSession();
  const [suggestedUsers, setSuggestedUsers] = useState<UserWithExtras[]>([]);
  const router = useRouter();

  // Update suggested users when the users prop changes
  useEffect(() => {
    if (!users || !session?.user?.id) return;

    // Filter out users who are being followed, have pending requests, or are the current user
    const filteredUsers = users.filter(user => {
      // Skip current user
      if (user.id === session.user.id) return false;

      // Check for any follow relationship
      const hasFollowRelationship = user.followers?.some(follow => 
        follow.followerId === session.user.id && follow.status === "ACCEPTED"
      );

      // Check for any follow request
      const hasFollowRequest = user.followers?.some(follow => 
        follow.followerId === session.user.id && follow.status === "PENDING"
      );

      // Skip if there's any relationship
      if (hasFollowRelationship || hasFollowRequest) return false;

      return true;
    });

    setSuggestedUsers(filteredUsers);
  }, [users, session?.user?.id]);

  if (!session) return null;

  return (
    <div className={cn("flex flex-col", className)}>
      {!hideTitle && suggestedUsers.length > 0 && (
        <div className="flex items-center justify-between px-4 mb-4">
          <p className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">
            Suggested for you
          </p>
          <Link href="/dashboard/people" className="text-xs font-semibold text-neutral-900 dark:text-white hover:opacity-50">
            See All
          </Link>
        </div>
      )}

      {suggestedUsers.length > 0 && (
        <div className="flex flex-col">
          {suggestedUsers.map((user) => {
            // Check if current user has a pending request to this user
            const hasPendingRequest = user.followers?.some(follow => 
              follow.followerId === session.user.id && 
              follow.status === "PENDING"
            ) || false;

            return (
              <div
                key={user.id}
                className="flex items-center justify-between px-4 py-2"
              >
                <Link
                  href={`/dashboard/${user.username}`}
                  className="flex items-center gap-x-3 flex-1 min-w-0"
                >
                  <UserAvatar 
                    user={user} 
                    className="h-8 w-8" 
                  />
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-semibold truncate">
                        {user.username}
                      </p>
                      {user.verified && <VerifiedBadge size={14} />}
                    </div>
                    {user.name && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                        {user.name}
                      </p>
                    )}
                  </div>
                </Link>

                <FollowButton
                  followingId={user.id}
                  isFollowing={false}
                  hasPendingRequest={hasPendingRequest}
                  isPrivate={user.isPrivate || false}
                  isFollowedByUser={false}
                  className="ml-2"
                  onSuccess={(success) => {
                    if (success) {
                      setSuggestedUsers(prevUsers => 
                        prevUsers.filter(prevUser => prevUser.id !== user.id)
                      );
                      router.refresh();
                    }
                  }}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Suggestions; 