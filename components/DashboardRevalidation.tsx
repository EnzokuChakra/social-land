'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

export default function DashboardRevalidation({ 
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
      
      // Always refresh the dashboard on story deletion
      router.refresh();
      
      // Show a toast message if it was someone else's story
      if (data.userId && data.userId !== currentUserId) {
        toast.info("A story was removed from your feed");
      }
    };

    // Handler for story creation events
    const handleStoryCreated = (event: any) => {
      // Extract data from either custom event or socket event
      const data = event.detail || event;
      
      // Only refresh if it wasn't created by the current user (they already see their changes)
      if (data.userId !== currentUserId) {
        router.refresh();
        
        // Show notification for new story
        if (data.username) {
          toast.info(`${data.username} added a new story`);
        } else {
          toast.info("New story added to your feed");
        }
      }
    };

    // Listen for DOM events
    window.addEventListener('storyDeleted', handleStoryDeleted);
    window.addEventListener('storyCreated', handleStoryCreated);
    
    // Set up socket listeners
    if (socket) {
      socket.on('storyDeleted', handleStoryDeleted);
      socket.on('storyCreated', handleStoryCreated);
    }
    
    return () => {
      // Clean up DOM event listeners
      window.removeEventListener('storyDeleted', handleStoryDeleted);
      window.removeEventListener('storyCreated', handleStoryCreated);
      
      // Clean up socket listeners
      if (socket) {
        socket.off('storyDeleted', handleStoryDeleted);
        socket.off('storyCreated', handleStoryCreated);
      }
    };
  }, [router, socket, userId, currentUserId]);

  return <>{children}</>;
} 