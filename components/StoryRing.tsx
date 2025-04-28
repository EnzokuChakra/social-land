import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { getSocket } from "@/lib/socket";
import { useStoryModal } from '@/hooks/use-story-modal';
import UserAvatar from './UserAvatar';
import { UserAvatarUser, Story } from '@/lib/definitions';

interface StoryRingProps {
  user: UserAvatarUser;
  stories?: Story[];
  size?: "sm" | "md" | "lg";
  showUsername?: boolean;
  isProfilePage?: boolean;
  className?: string;
  onAvatarClick?: (e: React.MouseEvent) => void;
}

export default function StoryRing({
  user,
  stories: initialStories = [],
  size = "md",
  showUsername = false,
  isProfilePage = false,
  className,
  onAvatarClick,
}: StoryRingProps) {
  const { data: session } = useSession();
  const [stories, setStories] = useState(initialStories);
  const [hasUnviewedStories, setHasUnviewedStories] = useState(false);
  const socket = getSocket();
  const storyModal = useStoryModal();
  const lastFetchRef = useRef<number>(0);
  const imageTimestampRef = useRef<number>(Date.now());
  const imageCheckAttemptsRef = useRef<number>(0);
  const [hasViewedStory, setHasViewedStory] = useState(false);
  const isNewlyUploadedRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);

  // Check if current user is the story owner
  const isCurrentUser = useMemo(() => session?.user?.id === user.id, [session?.user?.id, user.id]);

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

    const handleStoryUploaded = (event: CustomEvent) => {
      if (!isMountedRef.current) return;
      
      if (event.detail?.story && event.detail.story.user_id === user.id) {
        // Optimistically update the UI
        setStories(prev => [event.detail.story, ...prev]);
        
        // Only mark as unviewed if this is the current user's story
        if (isCurrentUser) {
          setHasUnviewedStories(true);
          isNewlyUploadedRef.current = true;
          setHasViewedStory(false);
        } else {
          // For other users' stories, maintain the current viewed state
          const hasViewedAnyStories = stories.some(story => 
            story.views?.some(view => view.user_id === session?.user?.id)
          );
          setHasUnviewedStories(!hasViewedAnyStories);
          setHasViewedStory(hasViewedAnyStories);
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

    socket.on('storyViewed', handleStoryViewed);
    socket.on('storyUploaded', handleStoryUploaded);

    return () => {
      socket.off('storyViewed', handleStoryViewed);
      socket.off('storyUploaded', handleStoryUploaded);
    };
  }, [socket, user.id, stories, session?.user?.id]);

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

  // Check if current user has viewed all stories
  const hasViewedAllStories = useMemo(() => {
    if (!session?.user?.id || !hasStories) return false;
    
    return stories.every(story => {
      return story.views?.some(view => view.user_id === session.user.id);
    });
  }, [stories, session?.user?.id, hasStories]);

  // Determine if story ring should be shown
  const shouldShowStoryRing = useMemo(() => {
    if (!user?.hasActiveStory) return false;
    
    return isCurrentUser || 
           (!user.isPrivate && hasStories) || 
           (user.isPrivate && user.isFollowing && hasStories);
  }, [user, isCurrentUser, hasStories]);

  // Handle story click
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

  const showRing = user?.hasActiveStory && 
    (!user.isPrivate || user.isFollowing);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return (
    <div className="flex flex-col items-center space-y-1">
      <button
        onClick={handleStoryClick}
        className={`rounded-full ${size === 'sm' ? 'h-[62px] w-[62px]' : 'h-[72px] w-[72px]'} flex items-center justify-center p-[2px] ${showRing ? (hasViewedAllStories ? 'bg-gray-400 dark:bg-gray-400' : 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500') : 'bg-transparent'}`}
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