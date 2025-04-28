"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { AvatarProps } from "@radix-ui/react-avatar";
import type { User } from "next-auth";
import { UserWithExtras } from "@/lib/definitions";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useImage } from "@/lib/hooks/use-image";

type UserAvatarUser = {
  id: string;
  username: string | null;
  name: string | null;
  image: string | null;
  bio?: string | null;
  hasActiveStory?: boolean;
  isPrivate?: boolean;
  isFollowing?: boolean;
  verified?: boolean;
};

interface Props extends Omit<AvatarProps, 'className'> {
  user: UserAvatarUser | User | UserWithExtras | null;
  priority?: boolean;
  showStoryRing?: boolean;
  hasUnviewedStories?: boolean;
  className?: string;
}

export default function UserAvatar({ user, priority = false, className, showStoryRing = false, hasUnviewedStories = false, ...avatarProps }: Props) {
  const [isMounted, setIsMounted] = useState(false);
  const { data: session } = useSession();
  const { imageUrl, blurDataURL } = useImage(user?.image || null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Determine if story ring should be shown
  const shouldShowStoryRing = useMemo(() => {
    if (!showStoryRing || !user) return false;
    
    const hasActiveStory = 'hasActiveStory' in user && user.hasActiveStory;
    if (!hasActiveStory) return false;
    
    const isCurrentUser = session?.user?.id === user.id;
    const isPrivate = 'isPrivate' in user && user.isPrivate;
    const isFollowing = 'isFollowing' in user && user.isFollowing;
    
    // Show ring if:
    // 1. It's the current user, or
    // 2. Profile is public and has active stories, or
    // 3. Profile is private, but user is following them and they have active stories
    const shouldShow = isCurrentUser || (!isPrivate && hasActiveStory) || (isPrivate && isFollowing && hasActiveStory);
    
    return shouldShow;
  }, [user, session?.user?.id, showStoryRing, hasUnviewedStories]);

  // Listen for story deleted events to update UI immediately
  useEffect(() => {
    const handleStoryDeleted = (event: CustomEvent) => {
      if (user && 'id' in user && user.id === event.detail.userId) {
        if (event.detail.remainingStoriesCount === 0 && 'hasActiveStory' in user) {
          const updatedUser = { ...user, hasActiveStory: false };
          Object.assign(user, updatedUser);
        }
      }
    };

    window.addEventListener('storyDeleted', handleStoryDeleted as unknown as EventListener);
    return () => {
      window.removeEventListener('storyDeleted', handleStoryDeleted as unknown as EventListener);
    };
  }, [user]);

  const altText = user ? `${user.name || user.username || 'User'}'s profile picture` : 'User profile picture';

  if (!isMounted) {
    return null;
  }

  return (
    <Avatar className={cn(className)} {...avatarProps}>
      <div className={cn(
        "relative aspect-square h-full w-full",
        shouldShowStoryRing && hasUnviewedStories && "p-[2px] bg-gradient-to-tr from-yellow-400 to-fuchsia-600 rounded-full",
        shouldShowStoryRing && !hasUnviewedStories && "p-[2px] bg-gray-400 dark:bg-gray-400 rounded-full"
      )}>
        <div className="relative rounded-full overflow-hidden h-full w-full">
          <Image
            src={imageUrl}
            alt={altText}
            referrerPolicy="no-referrer"
            priority={priority}
            fill
            sizes="(max-width: 768px) 77px, 150px"
            className="object-cover"
            unoptimized={true}
            loading="eager"
            placeholder="blur"
            blurDataURL={blurDataURL}
            onError={(e) => {
              e.currentTarget.src = "/images/profile_placeholder.webp";
            }}
          />
        </div>
      </div>
    </Avatar>
  );
}
