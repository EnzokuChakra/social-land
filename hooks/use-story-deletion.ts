import { useEffect } from 'react';
import { getSocket } from "@/lib/socket";
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface UseStoryDeletionProps {
  storyId?: string;
  isViewingStory: boolean;
  onStoryDeleted?: () => void;
}

export const useStoryDeletion = ({ 
  storyId,
  isViewingStory,
  onStoryDeleted 
}: UseStoryDeletionProps) => {
  const socket = getSocket();
  const router = useRouter();

  useEffect(() => {
    if (!socket) return;

    const handleStoryDeleted = (data: { storyId: string }) => {
      // If we're viewing the story that was deleted
      if (storyId && data.storyId === storyId && isViewingStory) {
        // Show toast message
        toast.error("Story not available anymore", {
          position: "bottom-center",
          duration: 3000,
        });

        // Call the callback if provided
        if (onStoryDeleted) {
          onStoryDeleted();
        }
      }
    };

    // Listen for story deletion events
    socket.on('storyDeleted', handleStoryDeleted);

    // Cleanup when unmounting
    return () => {
      socket.off('storyDeleted', handleStoryDeleted);
    };
  }, [socket, storyId, isViewingStory, onStoryDeleted, router]);

  return null;
}; 