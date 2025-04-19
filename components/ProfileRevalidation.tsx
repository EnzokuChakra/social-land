'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSocket } from "@/lib/socket";
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';

export default function ProfileRevalidation({ 
  children, 
  userId 
}: { 
  children: React.ReactNode; 
  userId: string;
}) {
  const router = useRouter();
  const socket = getSocket();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  useEffect(() => {
    // Handler for story deletion events
    const handleStoryDeleted = (event: any) => {
      // Extract data from either custom event or socket event
      const data = event.detail || event;
      const { userId: deletedUserId } = data;
      
      console.log("[PROFILE_PAGE] Story deletion event received:", data);
      
      // Refresh the page if the story belongs to this profile's user
      if (deletedUserId === userId) {
        console.log(`[PROFILE_PAGE] Refreshing profile for user ${userId} after story deletion`);
        router.refresh();
      }
    };

    // Handler for story creation events
    const handleStoryCreated = (event: any) => {
      // Extract data from either custom event or socket event
      const data = event.detail || event;
      const { userId: createdUserId, username } = data;
      
      console.log("[PROFILE_PAGE] Story creation event received:", data);
      
      // Refresh the page if the story belongs to this profile's user
      if (createdUserId === userId) {
        console.log(`[PROFILE_PAGE] Refreshing profile for user ${userId} after story creation`);
        router.refresh();
        
        // Only show toast if viewing someone else's profile
        if (createdUserId !== currentUserId) {
          toast.info(`${username || 'User'} added a new story`);
        }
      }
    };

    // Handler for profile picture updates
    const handleProfileUpdate = (data: any) => {
      const { userId: updatedUserId } = data;
      
      console.log("[PROFILE_PAGE] Profile update event received:", data);
      
      // Refresh the page if the profile belongs to this user
      if (updatedUserId === userId) {
        console.log(`[PROFILE_PAGE] Refreshing profile for user ${userId} after profile update`);
        router.refresh();
      }
    };

    // Listen for DOM events
    window.addEventListener('storyDeleted', handleStoryDeleted);
    window.addEventListener('storyCreated', handleStoryCreated);
    
    // Set up socket listeners
    if (socket) {
      socket.on('storyDeleted', handleStoryDeleted);
      socket.on('storyCreated', handleStoryCreated);
      socket.on('profileUpdate', handleProfileUpdate);
      console.log("[PROFILE_PAGE] Socket listeners registered for story and profile events, profile user:", userId);
    }
    
    return () => {
      // Clean up DOM event listeners
      window.removeEventListener('storyDeleted', handleStoryDeleted);
      window.removeEventListener('storyCreated', handleStoryCreated);
      
      // Clean up socket listeners
      if (socket) {
        socket.off('storyDeleted', handleStoryDeleted);
        socket.off('storyCreated', handleStoryCreated);
        socket.off('profileUpdate', handleProfileUpdate);
      }
    };
  }, [userId, router, socket, currentUserId]);

  return <>{children}</>;
} 