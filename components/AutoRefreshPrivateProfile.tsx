'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { getSocket } from '@/lib/socket';
import { useFollowStatus } from '@/lib/hooks/use-follow-status';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Component that automatically refreshes the UI when a private profile becomes
 * accessible after a follow request is accepted.
 */
export function AutoRefreshPrivateProfile({ username, userId }: { username: string; userId: string }) {
  const router = useRouter();
  const { data: session } = useSession();
  const socket = getSocket();
  const queryClient = useQueryClient();
  const [shouldRefresh, setShouldRefresh] = useState(false);
  const { data: followStatus } = useFollowStatus(userId);
  
  // Check follow status using the hook
  useEffect(() => {
    if (followStatus?.isFollowing && shouldRefresh) {
      console.log("[AutoRefresh] Follow status changed to following, refreshing page");
      // Reset the flag
      setShouldRefresh(false);
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['followStatus', userId] });
      queryClient.invalidateQueries({ queryKey: ['profileStats', username] });
      queryClient.invalidateQueries({ queryKey: ['followers'] });
      queryClient.invalidateQueries({ queryKey: ['posts', userId] });
      
      // Force a complete page refresh
      setTimeout(() => {
        console.log("[AutoRefresh] Forcing complete page reload");
        window.location.reload();
      }, 300);
    }
  }, [followStatus, shouldRefresh, userId, username, queryClient, router]);

  // Listen for follow request accepted events
  useEffect(() => {
    if (!session?.user?.id) return;
    
    const handleFollowRequestAccepted = (data: any) => {
      console.log("[AutoRefresh] Received followRequestAccepted event:", data);
      
      // If current user is the follower and viewing the profile that accepted the request
      if (session.user.id === data.followerId && userId === data.followingId) {
        console.log("[AutoRefresh] Setting shouldRefresh flag");
        setShouldRefresh(true);
      }
    };
    
    if (socket) {
      socket.on('followRequestAccepted', handleFollowRequestAccepted);
    }
    
    // Browser event
    const handleBrowserEvent = (event: CustomEvent) => {
      console.log("[AutoRefresh] Received browser followRequestAccepted event:", event.detail);
      if (session.user.id === event.detail.followerId && userId === event.detail.followingId) {
        console.log("[AutoRefresh] Setting shouldRefresh flag from browser event");
        setShouldRefresh(true);
      }
    };
    
    window.addEventListener('followRequestAccepted', handleBrowserEvent as unknown as EventListener);
    
    return () => {
      if (socket) {
        socket.off('followRequestAccepted', handleFollowRequestAccepted);
      }
      window.removeEventListener('followRequestAccepted', handleBrowserEvent as unknown as EventListener);
    };
  }, [session, userId, socket]);

  // No visible UI
  return null;
} 