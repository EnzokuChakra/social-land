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

interface Props {
  user: {
    id: string;
    username: string | null;
    name: string | null;
    image: string | null;
    bio: string | null;
    isPrivate?: boolean;
  };
  children: React.ReactNode;
  align?: "center" | "start" | "end";
}

export default function ProfileHoverCard({ user, children, align = "center" }: Props) {
  const { data: session } = useSession();
  const router = useRouter();
  const { data: stats, isLoading: isLoadingStats } = useStats(user.username);
  const { data: followStatus, isLoading: isLoadingFollow } = useFollowStatus(user.id);

  // Don't show hover card for current user
  if (session?.user?.id === user.id) {
    return <>{children}</>;
  }

  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        align={align}
        className="w-80 dark:bg-black"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {user.image && (
                <img
                  src={user.image}
                  alt={user.username || ""}
                  className="rounded-full h-10 w-10"
                />
              )}
              <div>
                <p className="text-sm font-semibold">{user.username}</p>
                {user.name && (
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    {user.name}
                  </p>
                )}
              </div>
            </div>

            {session?.user?.id !== user.id && (
              <div className="flex items-center">
                {isLoadingFollow ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <FollowButton
                    followingId={user.id}
                    isFollowing={followStatus?.isFollowing || false}
                    hasPendingRequest={followStatus?.hasPendingRequest || false}
                    isPrivate={user.isPrivate || false}
                    className="text-xs h-8"
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
                <p className="font-semibold">{stats?.posts || 0} posts</p>
                <button 
                  onClick={() => router.push(`/dashboard/${user.username}/followers`)}
                  className="font-semibold hover:opacity-70 transition"
                >
                  {stats?.followers || 0} {stats?.followers === 1 ? 'follower' : 'followers'}
                </button>
                <button 
                  onClick={() => router.push(`/dashboard/${user.username}/following`)}
                  className="font-semibold hover:opacity-70 transition"
                >
                  {stats?.following || 0} following
                </button>
              </>
            )}
          </div>

          {user.bio && (
            <p className="text-sm line-clamp-2">{user.bio}</p>
          )}

          {(user.isPrivate && !followStatus?.isFollowing) && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              This account is private
            </p>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
} 