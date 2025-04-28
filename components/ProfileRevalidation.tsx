'use client';

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getSocket } from "@/lib/socket";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useQueryClient } from '@tanstack/react-query';
import { invalidateProfileStats } from '@/lib/hooks/use-stats';

export default function ProfileRevalidation({ 
  children, 
  username 
}: { 
  children: React.ReactNode; 
  username: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const socket = getSocket();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const queryClient = useQueryClient();

  useEffect(() => {
    // Handler for post creation events
    const handlePostCreated = (event: CustomEvent<{ userId: string; username: string }> | { detail: { userId: string; username: string } }) => {
      // Extract data from either custom event or socket event
      const data = event.detail;
      
      // Update if the post was created by the current user or if we're on their profile
      if (data.userId === currentUserId || data.username === username) {
        console.log("[PROFILE_REVALIDATION] Post created, invalidating stats");
        // Invalidate the stats query
        invalidateProfileStats(username);
      }
    };

    // Handler for post deletion events
    const handlePostDeleted = (event: CustomEvent<{ userId: string; username: string }> | { detail: { userId: string; username: string } }) => {
      // Extract data from either custom event or socket event
      const data = event.detail;
      
      // Only update if the post was deleted by the current user
      if (data.userId === currentUserId) {
        console.log("[PROFILE_REVALIDATION] Post deleted, invalidating stats");
        // Invalidate the stats query
        invalidateProfileStats(username);
      }
    };

    // Handler for follow request acceptance events
    const handleFollowRequestAccepted = (event: CustomEvent<{ followingId: string; followerId: string }> | { detail: { followingId: string; followerId: string } }) => {
      // Extract data from either custom event or socket event
      const data = event.detail || event;
      console.log("[PROFILE_REVALIDATION] Follow request accepted:", data);
      
      // If current user is the follower and viewing the user who accepted the request
      const isFollower = currentUserId === data.followerId;
      const isViewingProfileThatAccepted = username === data.followingId;
      
      if (isFollower && isViewingProfileThatAccepted) {
        console.log("[PROFILE_REVALIDATION] Follow request accepted for current profile, refreshing page");
        // Invalidate all relevant queries
        queryClient.invalidateQueries({ queryKey: ['followStatus', data.followingId] });
        queryClient.invalidateQueries({ queryKey: ['profileStats', username] });
        queryClient.invalidateQueries({ queryKey: ['followers'] });
        queryClient.invalidateQueries({ queryKey: ['posts', data.followingId] });
        
        // Force a complete page refresh to show the private profile content
        console.log("[PROFILE_REVALIDATION] Forcing complete page reload");
        setTimeout(() => {
          window.location.reload();
        }, 300);
      }
    };

    // Listen for DOM events
    window.addEventListener('postCreated', handlePostCreated as EventListener);
    window.addEventListener('postDeleted', handlePostDeleted as EventListener);
    window.addEventListener('followRequestAccepted', handleFollowRequestAccepted as unknown as EventListener);
    
    // Set up socket listeners
    if (socket) {
      socket.on('postCreated', handlePostCreated);
      socket.on('postDeleted', handlePostDeleted);
      socket.on('followRequestAccepted', handleFollowRequestAccepted);
    }
    
    return () => {
      // Clean up DOM event listeners
      window.removeEventListener('postCreated', handlePostCreated as EventListener);
      window.removeEventListener('postDeleted', handlePostDeleted as EventListener);
      window.removeEventListener('followRequestAccepted', handleFollowRequestAccepted as unknown as EventListener);
      
      // Clean up socket listeners
      if (socket) {
        socket.off('postCreated', handlePostCreated);
        socket.off('postDeleted', handlePostDeleted);
        socket.off('followRequestAccepted', handleFollowRequestAccepted);
      }
    };
  }, [router, pathname, socket, username, currentUserId, queryClient]);

  return <>{children}</>;
} 