"use client";

import { cn } from "@/lib/utils";
import { User, Story } from "@/lib/definitions";
import { useSession } from "next-auth/react";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { getSocket } from "@/lib/socket";
import { useStoryModal } from "@/hooks/use-story-modal";
import UserAvatar from "../UserAvatar";

type MinimalUser = Pick<User, "id" | "username" | "image" | "name" | "isPrivate" | "isFollowing" | "hasActiveStory" | "verified">;

interface StoryRingProps {
  user: MinimalUser;
  stories?: Story[];
  size?: "sm" | "md" | "lg";
  showUsername?: boolean;
  isProfilePage?: boolean;
  className?: string;
  onAvatarClick?: (e: React.MouseEvent) => void;
  hasViewedStory?: boolean;
}

declare global {
  interface WindowEventMap {
    'ownStoriesViewed': CustomEvent<{ userId: string }>;
    'otherStoriesViewed': CustomEvent<{ userId: string }>;
    'storyDeleted': CustomEvent<{ userId: string }>;
    'storyUploaded': CustomEvent<{ userId: string }>;
    'userHasNewStory': CustomEvent<{ userId: string }>;
  }
}

export default function StoryRing({
  user,
  stories: initialStories = [],
  size = "md",
  showUsername = false,
  isProfilePage = false,
  className,
  onAvatarClick,
  hasViewedStory: propHasViewedStory,
}: StoryRingProps) {
  const { data: session } = useSession();
  const [stories, setStories] = useState(initialStories);
  const [hasUnviewedStories, setHasUnviewedStories] = useState(false);
  const socket = getSocket();
  const storyModal = useStoryModal();
  const [viewedStoriesMap, setViewedStoriesMap] = useState<Record<string, boolean>>({});
  const lastFetchRef = useRef<number>(0);
  const isNewlyUploadedRef = useRef(false);
  const [profileImage, setProfileImage] = useState<string | null>(user.image);
  const imageTimestampRef = useRef<number>(Date.now());
  const imageCheckAttemptsRef = useRef<number>(0);
  const [hasViewedStory, setHasViewedStory] = useState(false);
  
  // Check if current user is the story owner
  const isCurrentUser = useMemo(() => session?.user?.id === user.id, [session?.user?.id, user.id]);

  // Add profile update handler
  useEffect(() => {
    if (!socket || !user?.id) return;

    const handleProfileUpdate = (data: { userId: string; image: string | null }) => {
      if (data.userId === user.id) {
        // Only update the image if it's not the current user
        if (!isCurrentUser) {
          const timestamp = Date.now();
          const newImage = data.image ? `${data.image}?t=${timestamp}&v=${timestamp}` : null;
          setProfileImage(newImage);
          imageTimestampRef.current = timestamp;
          imageCheckAttemptsRef.current = 0;
          // Force a re-render by updating the stories state
          setStories(prev => [...prev]);
        }
      }
    };

    socket.on("profileUpdate", handleProfileUpdate);
    
    return () => {
      socket.off("profileUpdate", handleProfileUpdate);
    };
  }, [socket, user?.id, isCurrentUser]);

  // Update profileImage when user.image changes
  useEffect(() => {
    const updateProfileImage = () => {
      if (user.image !== profileImage) {
        // Use the image directly without cache busting
        setProfileImage(user.image);
      }
    };

    updateProfileImage();
  }, [user.image]);

  // Check if there are valid stories (less than 24 hours old)
  const hasStories = useMemo(() => {
    return stories.length > 0 && stories.some(story => {
      const storyDate = new Date(story.createdAt);
      const now = new Date();
      const diff = now.getTime() - storyDate.getTime();
      const hours = diff / (1000 * 60 * 60);
      return hours < 24;
    });
  }, [stories]);

  // Determine if story ring should be shown
  const shouldShowStoryRing = useMemo(() => {
    if (!user?.hasActiveStory) return false;
    
    return isCurrentUser || 
           (!user.isPrivate && hasStories) || 
           (user.isPrivate && user.isFollowing && hasStories);
  }, [user, isCurrentUser, hasStories]);

  // Initialize view state from server
  useEffect(() => {
    if (!session?.user?.id || !user.id) return;

    const fetchViewState = async () => {
      try {
        if (isCurrentUser) {
          const response = await fetch('/api/stories/view?operation=own-status');
          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              setHasUnviewedStories(data.hasUnviewedStories);
              setHasViewedStory(!data.hasUnviewedStories);
            }
          }
        } else {
          const response = await fetch(`/api/stories/view?userId=${user.id}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              setHasUnviewedStories(!data.viewed);
              setHasViewedStory(data.viewed);
            }
          }
        }
      } catch (error) {
        console.error('[STORY_RING] Error fetching view state:', error);
      }
    };

    fetchViewState();

    // Set up an interval to periodically check view status
    const interval = setInterval(fetchViewState, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [session?.user?.id, user.id, isCurrentUser]);

  // Handle story events
  useEffect(() => {
    if (!socket) return;

    const handleStoryViewed = (data: { userId: string }) => {
      if (data.userId === user.id) {
        setHasViewedStory(true);
        setHasUnviewedStories(false);
      }
    };

    const handleStoryUploaded = (data: { userId: string }) => {
      if (data.userId === user.id) {
        setHasViewedStory(false);
        setHasUnviewedStories(true);
      }
    };

    socket.on('storyViewed', handleStoryViewed);
    socket.on('storyUploaded', handleStoryUploaded);

    return () => {
      socket.off('storyViewed', handleStoryViewed);
      socket.off('storyUploaded', handleStoryUploaded);
    };
  }, [socket, user.id]);

  // Handle story click with debouncing
  const handleStoryClick = useCallback(async (e: React.MouseEvent) => {
    if (onAvatarClick) {
      onAvatarClick(e);
      return;
    }

    if (!hasStories || !session?.user?.id) return;

    // Debounce check
    const now = Date.now();
    if (now - lastFetchRef.current < 300) return;
    lastFetchRef.current = now;

    try {
      const response = await fetch(`/api/user-stories/${user.id}`);
      if (!response.ok) throw new Error('Failed to fetch stories');
      
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch stories');

      setStories(data.data);
      setHasViewedStory(true);
      setHasUnviewedStories(false);

      // Open story modal
      storyModal.setUserId(user.id);
      storyModal.setUserStories([{
        userId: user.id,
        stories: data.data
      }]);
      storyModal.setCurrentUserIndex(0);
      storyModal.onOpen();
    } catch (error) {
      console.error('[STORY_RING] Error opening story:', error);
    }
  }, [hasStories, session?.user?.id, user.id, onAvatarClick, storyModal]);

  // Size mappings
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-14 w-14",
    lg: "h-24 w-24"
  };

  // Add logging for state changes
  useEffect(() => {
    if (isCurrentUser) {
      // Removed console.log
    }
  }, [hasUnviewedStories, stories, viewedStoriesMap, user.id, user.username, isCurrentUser]);

  // Initialize viewed state from localStorage
  useEffect(() => {
    if (user?.id) {
      const fetchViewStatus = async () => {
        try {
          const storageKey = `viewed_story_${user.id}`;
          const lastViewed = localStorage.getItem(storageKey);
          const hasNewStory = stories.some(story => {
            const storyDate = new Date(story.createdAt);
            const lastViewedDate = lastViewed ? new Date(lastViewed) : null;
            return !lastViewedDate || storyDate > lastViewedDate;
          });
          setHasViewedStory(!hasNewStory);
        } catch (error) {
          console.error('Error checking story view status:', error);
        }
      };

      fetchViewStatus();
    }
  }, [user?.id, stories]);

  // Handle story events with improved state management
  useEffect(() => {
    let isMounted = true;

    const handleStoryViewed = (event: CustomEvent<{ userId: string }>) => {
      if (!isMounted || !session?.user?.id) return;
      
      if (event.detail?.userId === user.id || (!event.detail && isCurrentUser)) {
        // Once stories are viewed, mark them as viewed and prevent reverting
        if (event.type === 'ownStoriesViewed' || event.type === 'otherStoriesViewed') {
          if (isCurrentUser) {
            isNewlyUploadedRef.current = false;
            setHasUnviewedStories(false);
            setHasViewedStory(true);
          } else {
            const updatedMap = { ...viewedStoriesMap };
            stories.forEach(story => {
              updatedMap[story.id] = true;
            });
            setViewedStoriesMap(updatedMap);
            setHasUnviewedStories(false);
            setHasViewedStory(true);
          }
        }
      }
    };

    const handleStoryDeleted = (event: any) => {
      if (!isMounted) return;
      
      const storyData = event.detail || event;
      if (storyData.userId === user.id) {
        // Remove the deleted story
        setStories(prev => prev.filter(story => story.id !== storyData.storyId));
        
        // Check if this was the last story
        const remainingStories = stories.filter(story => story.id !== storyData.storyId);
        if (remainingStories.length === 0 && 'hasActiveStory' in user) {
          // Update the user's hasActiveStory property
          const updatedUser = { ...user, hasActiveStory: false };
          Object.assign(user, updatedUser);
          
          // Dispatch event to update other components
          window.dispatchEvent(new CustomEvent('storyDeleted', {
            detail: {
              userId: user.id,
              remainingStoriesCount: 0
            }
          }));
        }
      }
    };

    const handleStoryUploaded = (event: CustomEvent) => {
      if (!isMounted) return;
      
      if (event.detail?.story && event.detail.story.user_id === user.id) {
        // Optimistically update the UI
        setStories(prev => [event.detail.story, ...prev]);
        setHasUnviewedStories(true);
        isNewlyUploadedRef.current = true;
        setHasViewedStory(false);
        
        // Clear the viewed state from localStorage
        if (user.id) {
          const storageKey = `viewed_story_${user.id}`;
          localStorage.removeItem(storageKey);
        }
        
        // Update the user's hasActiveStory property
        if ('hasActiveStory' in user) {
          const updatedUser = { ...user, hasActiveStory: true };
          Object.assign(user, updatedUser);
        }

        // Dispatch event to update other components
        window.dispatchEvent(new CustomEvent('userHasNewStory', {
          detail: { userId: user.id }
        }));
      }
    };

    const handleNewStory = (event: CustomEvent<{ userId: string }>) => {
      if (!isMounted || !session?.user?.id) return;
      // Removed console.log
      
      if (event.detail?.userId === user.id) {
        setHasUnviewedStories(true);
        const now = Date.now();
        if (now - lastFetchRef.current < 300) return;
        lastFetchRef.current = now;
      }
    };

    // Socket event handlers
    const handleSocketStoryView = (data: any) => {
      if (!isMounted) return;
      // Removed console.log
      
      if (data.userId === user.id) {
        const now = Date.now();
        if (now - lastFetchRef.current < 300) return;
        lastFetchRef.current = now;
      }
    };

    window.addEventListener('ownStoriesViewed', handleStoryViewed);
    window.addEventListener('otherStoriesViewed', handleStoryViewed);
    window.addEventListener('storyDeleted', handleStoryDeleted);
    window.addEventListener('storyUploaded', handleStoryUploaded);
    window.addEventListener('userHasNewStory', handleNewStory);

    if (socket) {
      socket.on('storyDeleted', handleStoryDeleted);
      socket.on('storyViewUpdate', handleSocketStoryView);
    }

    return () => {
      isMounted = false;
      window.removeEventListener('ownStoriesViewed', handleStoryViewed);
      window.removeEventListener('otherStoriesViewed', handleStoryViewed);
      window.removeEventListener('storyDeleted', handleStoryDeleted);
      window.removeEventListener('storyUploaded', handleStoryUploaded);
      window.removeEventListener('userHasNewStory', handleNewStory);
      
      if (socket) {
        socket.off('storyDeleted', handleStoryDeleted);
        socket.off('storyViewUpdate', handleSocketStoryView);
      }
    };
  }, [session?.user?.id, user.id, socket, isCurrentUser, stories, viewedStoriesMap, hasUnviewedStories, user.username]);

  // Fetch initial view status with state preservation
  useEffect(() => {
    if (!shouldShowStoryRing) return;
    // Removed console.log

    // If we have a newly uploaded story, keep hasUnviewedStories as true
    if (isNewlyUploadedRef.current) {
      setHasUnviewedStories(true);
      return;
    }

    // Otherwise fetch the current view status
    const now = Date.now();
    if (now - lastFetchRef.current < 300) return;
    lastFetchRef.current = now;
  }, [shouldShowStoryRing, isNewlyUploadedRef.current]);

  const showRing = user?.hasActiveStory && 
    (!user.isPrivate || user.isFollowing);

  return (
    <div className="flex flex-col items-center space-y-1">
      <button
        onClick={handleStoryClick}
        className={`rounded-full ${size === 'sm' ? 'h-[62px] w-[62px]' : 'h-[72px] w-[72px]'} flex items-center justify-center p-[2px] ${showRing ? (propHasViewedStory || hasViewedStory ? 'bg-gray-400 dark:bg-gray-400' : 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500') : 'bg-transparent'}`}
      >
        <div className="rounded-full bg-white dark:bg-black p-[2px] h-full w-full flex items-center justify-center">
          <UserAvatar
            user={user}
            className={size === 'sm' ? 'h-14 w-14' : 'h-16 w-16'}
            priority={true}
          />
        </div>
      </button>
      {showUsername && (
        <span className="text-xs truncate max-w-[64px]">
          {user.id === session?.user?.id ? 'Your story' : user.username}
        </span>
      )}
    </div>
  );
} 