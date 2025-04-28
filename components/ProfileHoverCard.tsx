"use client";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useStats } from "@/lib/hooks/use-stats";
import { useFollowStatus } from "@/lib/hooks/use-follow-status";
import { Skeleton } from "./ui/skeleton";
import FollowButton from "./FollowButton";
import Link from "next/link";
import { useState } from "react";
import VerifiedBadge from "./VerifiedBadge";
import UserAvatar from "./UserAvatar";

interface ProfileStats {
  posts: number;
  followers: number;
  following: number;
  reels: number;
}

interface Props {
  user: {
    id: string;
    username: string | null;
    name: string | null;
    image: string | null;
    bio: string | null;
    isPrivate?: boolean;
    verified?: boolean;
  };
  children: React.ReactNode;
  align?: "center" | "start" | "end";
}

export default function ProfileHoverCard({ user, children, align = "center" }: Props) {
  const { data: session } = useSession();
  const router = useRouter();
  const { data: stats, isLoading: isLoadingStats } = useStats(user.username);
  const { data: followStatus, isLoading: isLoadingFollow } = useFollowStatus(user.id);
  const [hideButton, setHideButton] = useState(false);

  // Don't show hover card for current user
  if (session?.user?.id === user.id) {
    return <>{children}</>;
  }

  const profileStats = stats as ProfileStats | null;
  const shouldShowButton = !followStatus?.isFollowing && !hideButton && !followStatus?.hasPendingRequest;

  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        align={align}
        className="w-80 dark:bg-black"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Link 
              href={`/dashboard/${user.username}`}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <UserAvatar user={user} className="h-10 w-10" />
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-sm font-semibold">{user.username}</p>
                  {user.verified && <VerifiedBadge className="h-4 w-4" isDashboardPostHeader={true} />}
                </div>
                {user.name && (
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    {user.name}
                  </p>
                )}
              </div>
            </Link>

            {session?.user?.id !== user.id && shouldShowButton && (
              <div className="flex items-center">
                {isLoadingFollow ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <FollowButton
                    followingId={user.id}
                    isFollowing={false}
                    hasPendingRequest={false}
                    isPrivate={user.isPrivate || false}
                    className="text-xs h-8"
                    onSuccess={() => setHideButton(true)}
                  />
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 text-sm">
            {isLoadingStats ? (
              <>
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
              </>
            ) : (
              <>
                <p className="font-semibold">{profileStats?.posts ?? 0} posts</p>
                <p className="font-semibold">
                  {profileStats?.followers ?? 0} {profileStats?.followers === 1 ? 'follower' : 'followers'}
                </p>
                <p className="font-semibold">
                  {profileStats?.following ?? 0} following
                </p>
              </>
            )}
          </div>

          {user.bio && (
            <p className="text-sm line-clamp-2">{user.bio}</p>
          )}

          {user.isPrivate && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              This account is private
            </p>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
} 