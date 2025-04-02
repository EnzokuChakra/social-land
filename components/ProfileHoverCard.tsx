"use client";

import { useState, useEffect } from "react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { UserCheck } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { User, UserWithExtras } from "@/lib/definitions";
import FollowButton from "./FollowButton";
import { cn } from "@/lib/utils";
import VerifiedBadge from "./VerifiedBadge";
import Image from "next/image";
import UserAvatar from "./UserAvatar";
import { useRouter } from "next/navigation";

interface Props {
  user: User | UserWithExtras;
  children: React.ReactNode;
  align?: "start" | "center" | "end";
}

interface ProfileStats {
  stats: {
    followers: number;
    following: number;
    posts: number;
    reels: number;
  };
}

export default function ProfileHoverCard({ user, children, align = "center" }: Props) {
  const { data: session } = useSession();
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [userExtras, setUserExtras] = useState({
    isFollowing: false,
    hasPendingRequest: false,
    isPrivate: user.isPrivate || false,
  });
  const router = useRouter();

  useEffect(() => {
    if (user.username) {
      const timeoutId = setTimeout(() => {
        fetchStats();
      }, 300); // 300ms debounce

      return () => clearTimeout(timeoutId);
    }
  }, [user.username]);

  useEffect(() => {
    const fetchFollowStatus = async () => {
      try {
        const response = await fetch(`/api/users/follow/status?userId=${user.id}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          }
        });
        const data = await response.json();
        
        setUserExtras(prev => ({
          ...prev,
          isFollowing: data.status === "ACCEPTED",
          hasPendingRequest: data.status === "PENDING",
        }));
      } catch (error) {
        console.error("[PROFILE_HOVER_CARD] Error fetching follow status:", {
          error,
          errorMessage: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString()
        });
      }
    };

    if (session?.user?.id && user.id) {
      fetchFollowStatus();
    }
  }, [session?.user?.id, user.id]);

  const fetchStats = async () => {
    try {
      setError(false);
      const response = await fetch(`/api/profile/${user.username}/stats`);
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("[PROFILE_HOVER_CARD] Error fetching profile stats:", {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
      setError(true);
      toast.error("Failed to fetch profile stats");
    }
  };

  // Helper function to check if user has UserWithExtras properties
  const isUserWithExtras = (user: any): user is UserWithExtras => {
    return 'followers' in user && 'following' in user;
  };

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent
        align={align}
        className="w-80 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950"
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Link href={`/dashboard/${user.username}`}>
              <UserAvatar
                user={user}
                className="h-16 w-16 border"
                priority={true}
              />
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-1">
                <Link href={`/dashboard/${user.username}`}>
                  <p className="text-sm font-semibold hover:underline">
                    {user.username}
                  </p>
                </Link>
                {user.verified && (
                  <VerifiedBadge className="h-3.5 w-3.5" />
                )}
              </div>
              {user.name && (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {user.name}
                </p>
              )}
            </div>
            {session?.user?.id !== user.id && (
              <div className="flex items-center">
                <FollowButton
                  followingId={user.id}
                  isFollowing={userExtras.isFollowing}
                  hasPendingRequest={userExtras.hasPendingRequest}
                  isPrivate={userExtras.isPrivate}
                  className="text-xs h-8"
                  onSuccess={(success) => {
                    if (success) {
                      setUserExtras(prev => ({
                        ...prev,
                        isFollowing: !prev.isFollowing,
                        hasPendingRequest: false
                      }));
                    }
                  }}
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 text-sm">
            <p className="font-semibold">{stats?.stats.posts || 0} posts</p>
            <button 
              onClick={() => router.push(`/dashboard/${user.username}/followers`)}
              className="font-semibold hover:opacity-70 transition"
            >
              {stats?.stats.followers || 0} {stats?.stats.followers === 1 ? 'follower' : 'followers'}
            </button>
            <button 
              onClick={() => router.push(`/dashboard/${user.username}/following`)}
              className="font-semibold hover:opacity-70 transition"
            >
              {stats?.stats.following || 0} following
            </button>
          </div>

          {user.bio && (
            <p className="text-sm line-clamp-2">{user.bio}</p>
          )}

          {userExtras.isPrivate && !userExtras.isFollowing && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              This account is private
            </p>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
} 