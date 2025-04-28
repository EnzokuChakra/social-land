"use client";

import { StoryWithExtras, User } from "@/lib/definitions";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from "./ui/separator";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "./ui/button";
import StoryRing from "./shared/StoryRing";
import { getSocket } from "@/lib/socket";
import UserAvatar from "@/components/UserAvatar";

type MinimalUser = Pick<User, "id" | "username" | "image" | "name" | "isPrivate" | "isFollowing" | "hasActiveStory" | "verified">;

interface StoryFeedProps {
  userStories?: StoryWithExtras[];
  otherStories?: StoryWithExtras[];
}

export default function StoryFeed({ 
  userStories: initialUserStories = [], 
  otherStories: initialOtherStories = [] 
}: StoryFeedProps) {
  const { data: session, update: updateSession } = useSession();
  const [userStories, setUserStories] = useState(initialUserStories);
  const [otherStories, setOtherStories] = useState(initialOtherStories);
  const [hasViewedOwnStories, setHasViewedOwnStories] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const lastFetchRef = useRef<number>(0);
  const socket = getSocket();
  const [currentUserImage, setCurrentUserImage] = useState<string | null>(session?.user?.image || null);
  const isFetchingRef = useRef(false);
  const oldImageRef = useRef<string | null>(null);
  const imageTimestampRef = useRef<number>(Date.now());

  // Fetch view status on mount
  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchViewStatus = async () => {
      try {
        const response = await fetch('/api/stories/view?operation=own-status');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setHasViewedOwnStories(!data.hasUnviewedStories);
          }
        }
      } catch (error) {
        console.error('[STORY_FEED] Error fetching view status:', error);
      }
    };

    fetchViewStatus();
  }, [session?.user?.id]);

  // Listen for story viewed events
  useEffect(() => {
    const handleStoriesViewed = (event: CustomEvent) => {
      if (event.type === 'ownStoriesViewed') {
        setHasViewedOwnStories(true);
      }
    };

    window.addEventListener('ownStoriesViewed', handleStoriesViewed);
    return () => {
      window.removeEventListener('ownStoriesViewed', handleStoriesViewed);
    };
  }, []);

  // Get current user data with proper hasActiveStory status
  const currentUser: MinimalUser = useMemo(() => {
    return {
      id: session?.user?.id || '',
      username: session?.user?.username || null,
      image: currentUserImage,
      name: session?.user?.name || null,
      isPrivate: false,
      isFollowing: false,
      hasActiveStory: userStories.some(story => {
        const storyDate = new Date(story.createdAt);
        const now = new Date();
        const diff = now.getTime() - storyDate.getTime();
        const hours = diff / (1000 * 60 * 60);
        return hours < 24;
      }),
      verified: session?.user?.verified || false
    };
  }, [session?.user, userStories, currentUserImage]);

  // Fetch current profile picture on mount
  useEffect(() => {
    const fetchCurrentProfile = async () => {
      if (!session?.user?.id) return;
      
      try {
        const response = await fetch('/api/profile');
        if (response.ok) {
          const data = await response.json();
          if (data.image) {
            const baseImageUrl = data.image.split('?')[0];
            setCurrentUserImage(baseImageUrl);
            return;
          }
        }
      } catch (error) {
        // Silently handle error
      }
    };

    fetchCurrentProfile();
  }, [session?.user?.id]);

  // Add profile update handler
  useEffect(() => {
    if (!socket || !session?.user?.id) return;

    const handleProfileUpdate = async (data: { userId: string; image: string | null }) => {
      if (data.userId === session.user.id) {
        oldImageRef.current = currentUserImage;
        
        if (data.image) {
          const baseImageUrl = data.image.split('?')[0];
          setCurrentUserImage(baseImageUrl);
        } else {
          setCurrentUserImage(null);
        }
        
        await updateSession();
      }
    };

    socket.on("profileUpdate", handleProfileUpdate);
    
    return () => {
      socket.off("profileUpdate", handleProfileUpdate);
    };
  }, [socket, session?.user?.id, updateSession, currentUserImage]);

  // Force a re-render when the image changes
  useEffect(() => {
    if (currentUserImage !== oldImageRef.current) {
      setUserStories(prev => [...prev]);
      oldImageRef.current = currentUserImage;
    }
  }, [currentUserImage]);

  // Create a ref to store the latest stories
  const latestStoriesRef = useRef({
    userStories: initialUserStories,
    otherStories: initialOtherStories
  });

  // Update ref when stories change
  useEffect(() => {
    latestStoriesRef.current = {
      userStories,
      otherStories
    };
  }, [userStories, otherStories]);

  // Function to scroll the stories container
  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: 300,
        behavior: 'smooth'
      });
    }
  };

  // Function to scroll left
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: -300,
        behavior: 'smooth'
      });
    }
  };

  // Function to update arrow visibility based on scroll position
  const updateArrows = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10); // 10px threshold
    }
  };

  // Set up scroll event listener
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', updateArrows);
      // Initial check for arrows
      updateArrows();
      
      // Also check after content loads/changes
      const checkArrowsAfterLoad = () => {
        updateArrows();
        const { scrollWidth, clientWidth } = scrollContainer;
        setShowRightArrow(scrollWidth > clientWidth);
      };
      checkArrowsAfterLoad();

      return () => {
        scrollContainer.removeEventListener('scroll', updateArrows);
      };
    }
  }, [userStories, otherStories]);

  // Function to optimistically add a new story
  const addStoryOptimistically = (newStory: StoryWithExtras) => {
    // Update user stories
    setUserStories(prev => [newStory, ...prev]);
    
    // Update current user's hasActiveStory status immediately
    if (session?.user) {
      // Force an immediate re-render
      setUserStories(prev => [newStory, ...prev]);
      
      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('userHasNewStory', {
        detail: { userId: session.user.id }
      }));
    }
  };

  // Listen for story events
  useEffect(() => {
    const handleNewStory = (event: CustomEvent) => {
      if (session?.user?.id && event.detail?.userId === session.user.id) {
        // Force re-render with updated hasActiveStory status
        setUserStories(prev => [...prev]);
      }
    };

    const handleStoryUpload = (event: CustomEvent) => {
      if (event.detail?.story && session?.user?.id === event.detail.story.user_id) {
        // Add the new story to the beginning of userStories immediately
        const newStory = event.detail.story;
        addStoryOptimistically(newStory);
      }
    };

    // Expose addStoryOptimistically globally
    // @ts-ignore
    window.addStoryOptimistically = addStoryOptimistically;

    window.addEventListener('userHasNewStory', handleNewStory as EventListener);
    window.addEventListener('storyUploaded', handleStoryUpload as EventListener);
    
    return () => {
      window.removeEventListener('userHasNewStory', handleNewStory as EventListener);
      window.removeEventListener('storyUploaded', handleStoryUpload as EventListener);
      // @ts-ignore
      delete window.addStoryOptimistically;
    };
  }, [session?.user?.id]);

  // Function to fetch latest stories with debouncing
  const fetchLatestStories = useCallback(async (ignoreCooldown = false) => {
    const now = Date.now();
    if (!ignoreCooldown && now - lastFetchRef.current < 30000) return;
    if (isFetchingRef.current) return;
    
    lastFetchRef.current = now;
    isFetchingRef.current = true;

    try {
      const response = await fetch('/api/stories/feed', {
        cache: 'no-store'
      });
      if (!response.ok) return;
      
      const data = await response.json();
      if (!data.success) return;

      setUserStories(data.userStories);
      setOtherStories(data.otherStories);
    } catch (error) {
      // Silently handle error
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  // Expose the fetch function to parent components
  useEffect(() => {
    // @ts-ignore - Adding to window for debugging
    window.refreshStoryFeed = () => fetchLatestStories(true);
  }, []);

  // Set up polling for real-time updates
  useEffect(() => {
    fetchLatestStories();
    
    const pollInterval = setInterval(() => fetchLatestStories(), 30000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [fetchLatestStories]);

  // Only return null if there's no session user
  if (!session?.user) return null;

  // Group stories by user
  const groupedUserStories = otherStories
    ?.filter(story => story?.user?.id)
    ?.reduce((acc: Record<string, StoryWithExtras[]>, story) => {
      if (!story.user?.id) return acc;
      if (!acc[story.user.id]) {
        acc[story.user.id] = [];
      }
      acc[story.user.id].push(story);
      return acc;
    }, {});

  // Convert grouped stories to array format
  const userStoriesArray = Object.entries(groupedUserStories || {})
    .map(([userId, stories]) => {
      const firstStory = stories[0];
      if (!firstStory?.user) return null;
      
      // Sort stories by view status and creation time
      const sortedStories = stories.sort((a, b) => {
        // First sort by view status (unviewed first)
        const aHasView = a.views.some(view => view.user.id === session.user.id);
        const bHasView = b.views.some(view => view.user.id === session.user.id);
        if (aHasView !== bHasView) {
          return aHasView ? 1 : -1;
        }
        // Then sort by creation time (newest first)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      
      return {
        user: {
          id: userId,
          username: firstStory.user.username,
          image: firstStory.user.image,
          name: firstStory.user.name,
          isPrivate: firstStory.user.isPrivate,
          isFollowing: firstStory.user.isFollowing,
          hasActiveStory: true,
          verified: firstStory.user.verified
        } as MinimalUser,
        stories: sortedStories
      };
    })
    .filter((item): item is { user: MinimalUser; stories: StoryWithExtras[] } => item !== null)
    // Sort the array of users by their most recent story's view status
    .sort((a, b) => {
      const aHasUnviewed = a.stories.some(story => !story.views.some(view => view.user.id === session.user.id));
      const bHasUnviewed = b.stories.some(story => !story.views.some(view => view.user.id === session.user.id));
      if (aHasUnviewed !== bHasUnviewed) {
        return aHasUnviewed ? -1 : 1;
      }
      // If both have unviewed or both have viewed, sort by most recent story
      const aLatestStory = a.stories[0];
      const bLatestStory = b.stories[0];
      return new Date(bLatestStory.createdAt).getTime() - new Date(aLatestStory.createdAt).getTime();
    });

  return (
    <div className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 mb-4">
      <div className="relative">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex space-x-4" ref={scrollContainerRef}>
            {/* Current user's story */}
            <div className="flex flex-col items-center space-y-1">
              <StoryRing
                user={currentUser}
                stories={userStories}
                showUsername
                size="md"
                hasViewedStory={hasViewedOwnStories}
              />
            </div>

            {userStoriesArray.length > 0 && (
              <>
                <Separator orientation="vertical" className="h-16" />
                {userStoriesArray.map(({ user, stories }) => (
                  <StoryRing
                    key={user.id}
                    user={user}
                    stories={stories}
                    showUsername
                    size="md"
                  />
                ))}
              </>
            )}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        
        {/* Left arrow navigation */}
        {showLeftArrow && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 bg-white dark:bg-neutral-950 shadow-lg rounded-full hover:bg-gray-100 dark:hover:bg-neutral-900 z-10"
            onClick={scrollLeft}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}

        {/* Right arrow navigation */}
        {showRightArrow && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 bg-white dark:bg-neutral-950 shadow-lg rounded-full hover:bg-gray-100 dark:hover:bg-neutral-900 z-10"
            onClick={scrollRight}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
} 