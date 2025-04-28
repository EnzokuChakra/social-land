"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import VerifiedBadge from "@/components/VerifiedBadge";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import UserAvatar from "@/components/UserAvatar";

interface ProfileHeaderProps {
  user: {
    id: string;
    username: string;
    name: string | null;
    image: string | null;
    bio: string | null;
    verified: boolean;
    isPrivate: boolean;
  };
  stats: {
    followers: number;
    following: number;
    posts: number;
    reels: number;
  };
  isFollowing?: boolean;
  isCurrentUser?: boolean;
}

export default function ProfileHeader({
  user,
  stats,
  isFollowing = false,
  isCurrentUser = false,
}: ProfileHeaderProps) {
  const { data: session } = useSession();
  const router = useRouter();

  return (
    <Card className="p-6 mb-6">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-none">
          <div className="w-[150px] h-[150px] relative flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-yellow-400 to-fuchsia-600"></div>
            <div className="relative p-[3px]">
              <UserAvatar 
                user={user} 
                className="h-32 w-32 ring-2 ring-background"
                priority={true}
              />
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-4">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{user.username}</h1>
              {user.verified && <VerifiedBadge />}
            </div>

            {!isCurrentUser ? (
              <div className="flex gap-2">
                <Button variant={isFollowing ? "outline" : "default"}>
                  {isFollowing ? "Following" : "Follow"}
                </Button>
                <Button variant="outline">Message</Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <Link href="/dashboard/edit">Edit Profile</Link>
                </Button>
              </div>
            )}
          </div>

          <div className="flex gap-6 mb-4">
            <div>
              <span className="font-semibold">{stats.posts}</span>{" "}
              <span className="text-muted-foreground">posts</span>
            </div>
            <div>
              <span className="font-semibold">{stats.reels}</span>{" "}
              <span className="text-muted-foreground">reels</span>
            </div>
            <div>
              <span className="font-semibold">{stats.followers}</span>{" "}
              <span className="text-muted-foreground">followers</span>
            </div>
            <div>
              <span className="font-semibold">{stats.following}</span>{" "}
              <span className="text-muted-foreground">following</span>
            </div>
          </div>

          <div className="space-y-2">
            {user.name && <p className="font-medium">{user.name}</p>}
            {user.bio && (
              <div className="max-w-full">
                <p className="text-muted-foreground whitespace-pre-wrap break-words">{user.bio}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export function ProfileHeaderSkeleton() {
  return (
    <Card className="p-6 mb-6">
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <Skeleton className="h-20 w-20 md:h-32 md:w-32 rounded-full" />
        <div className="flex-1">
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-4">
            <Skeleton className="h-8 w-40" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
          <div className="flex gap-6 mb-4">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-20" />
          </div>
          <Skeleton className="h-4 w-40 mb-2" />
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
      </div>
    </Card>
  );
} 