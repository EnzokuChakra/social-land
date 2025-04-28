"use client";

import { UserWithExtras } from "@/lib/definitions";
import FollowersModal from "./FollowersModal";
import FollowingModal from "./FollowingModal";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useStats } from "@/lib/hooks/use-stats";
import { CustomLoader } from "@/components/ui/custom-loader";
import type { ProfileStats } from "@/lib/hooks/use-stats";
import { UseQueryResult } from "@tanstack/react-query";
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from "@/lib/socket";

interface Props {
  profile: UserWithExtras;
  isCurrentUser: boolean;
  isFollowing: boolean;
}

export default function ProfileStats({ profile, isCurrentUser, isFollowing }: Props) {
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const { data: stats, isLoading } = useStats(profile.username || null) as UseQueryResult<ProfileStats | null, Error>;
  const queryClient = useQueryClient();
  const invalidationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Ensure username is not null
  const username = profile.username || '';

  // Helper function to debounce query invalidations
  const debouncedInvalidateQueries = (keys: string[][]) => {
    if (invalidationTimeoutRef.current) {
      clearTimeout(invalidationTimeoutRef.current);
    }
    
    invalidationTimeoutRef.current = setTimeout(() => {
      keys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      invalidationTimeoutRef.current = null;
    }, 500);
  };

  // Listen for follow status changes
  useEffect(() => {
    const handleFollowStatusChange = (event: CustomEvent) => {
      if (event.detail?.followingId === profile.id) {
        // Group invalidations and debounce them
        debouncedInvalidateQueries([
          ['profileStats', username],
          ['followStatus', profile.id],
          ['followers'],
          ['posts', profile.id]
        ]);
      }
    };

    const handleFollowRequestAccepted = (data: { followingId: string }) => {
      if (data.followingId === profile.id) {
        // Group invalidations and debounce them
        debouncedInvalidateQueries([
          ['profileStats', username],
          ['followStatus', profile.id],
          ['followers']
        ]);
      }
    };

    window.addEventListener('followStatusChanged', handleFollowStatusChange as EventListener);
    
    const socket = getSocket();
    if (socket) {
      socket.on('followRequestAccepted', handleFollowRequestAccepted);
    }
    
    return () => {
      window.removeEventListener('followStatusChanged', handleFollowStatusChange as EventListener);
      if (socket) {
        socket.off('followRequestAccepted', handleFollowRequestAccepted);
      }
      if (invalidationTimeoutRef.current) {
        clearTimeout(invalidationTimeoutRef.current);
      }
    };
  }, [profile.id, username, queryClient]);

  useEffect(() => {
    // Component mounted/updated
  }, [username, stats, isLoading, isCurrentUser, isFollowing]);

  const handleModalClose = () => {
    setShowFollowersModal(false);
    setShowFollowingModal(false);
  };

  const StatItem = ({ count, label, onClick, isButton = false }: { 
    count: number, 
    label: string, 
    onClick?: () => void,
    isButton?: boolean 
  }) => {
    const Component = isButton ? 'button' : 'div';
    return (
      <Component
        onClick={onClick}
        className={cn(
          "flex flex-col md:flex-row items-center md:items-center gap-0 md:gap-1 transition-all",
          isButton && "hover:opacity-75 active:scale-95 cursor-pointer"
        )}
      >
        {isLoading ? (
          <div className="h-6 w-12 flex items-center justify-center">
            <CustomLoader size="sm" />
          </div>
        ) : (
          <span className="font-semibold text-lg md:text-base" suppressHydrationWarning>
            {count}
          </span>
        )}
        <span className="text-neutral-500 dark:text-neutral-400 text-[11px] md:text-sm tracking-wide">
          {label}
        </span>
      </Component>
    );
  };

  return (
    <>
      <div className="flex items-center justify-around w-full md:justify-start md:gap-x-10 text-sm border-y md:border-y-0 border-neutral-200 dark:border-neutral-800 py-3 md:py-0" suppressHydrationWarning>
        <StatItem 
          count={stats?.posts || 0} 
          label="posts" 
        />
        
        {(isCurrentUser || isFollowing || !profile.isPrivate) ? (
          <StatItem 
            count={stats?.followers || 0} 
            label={(stats?.followers || 0) === 1 ? "follower" : "followers"}
            onClick={() => setShowFollowersModal(true)}
            isButton={true}
          />
        ) : (
          <StatItem 
            count={stats?.followers || 0} 
            label={(stats?.followers || 0) === 1 ? "follower" : "followers"}
          />
        )}
        
        {(isCurrentUser || isFollowing || !profile.isPrivate) ? (
          <StatItem 
            count={stats?.following || 0} 
            label="following"
            onClick={() => setShowFollowingModal(true)}
            isButton={true}
          />
        ) : (
          <StatItem 
            count={stats?.following || 0} 
            label="following"
          />
        )}
      </div>

      {showFollowersModal && (
        <FollowersModal
          followers={profile.followers}
          username={username}
          isPrivate={profile.isPrivate}
          isFollowing={isFollowing}
          onClose={() => {
            setShowFollowersModal(false);
            handleModalClose();
          }}
        />
      )}

      {showFollowingModal && (
        <FollowingModal
          following={profile.following}
          username={username}
          isPrivate={profile.isPrivate}
          isFollowing={isFollowing}
          onClose={() => {
            setShowFollowingModal(false);
            handleModalClose();
          }}
        />
      )}
    </>
  );
} 