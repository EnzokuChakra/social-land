"use client";

import { Story, StoryWithExtras, User } from "@/lib/definitions";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import StoryBubble from "./StoryBubble";
import { Separator } from "./ui/separator";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import axios from "axios";
import { useStoryModal } from "@/hooks/use-story-modal";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "./ui/button";

type MinimalUser = Pick<User, "id" | "username" | "image" | "name">;

interface StoryFeedProps {
  userStories?: StoryWithExtras[];
  otherStories?: StoryWithExtras[];
}

interface UserStoriesState {
  userId: string;
  stories: StoryWithExtras[];
}

export default function StoryFeed({ userStories: initialUserStories = [], otherStories: initialOtherStories = [] }: StoryFeedProps) {
  const [userStories, setUserStories] = useState(initialUserStories);
  const [otherStories, setOtherStories] = useState(initialOtherStories);
  const storyModal = useStoryModal();
  const { data: session } = useSession();
  const [currentUser, setCurrentUser] = useState<MinimalUser | null>(null);
  const lastFetchRef = useRef<number>(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

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

  // Function to fetch latest stories
  const fetchLatestStories = async () => {
    // Prevent fetching too frequently
    const now = Date.now();
    if (now - lastFetchRef.current < 30000) return; // Increase minimum interval to 30 seconds
    lastFetchRef.current = now;

    try {
      const response = await fetch('/api/stories/feed', {
        cache: 'no-store'
      });
      if (!response.ok) return;
      
      const data = await response.json();
      if (!data.success) return;

      // Update current user data if it has changed
      if (data.currentUser && JSON.stringify(currentUser) !== JSON.stringify(data.currentUser)) {
        setCurrentUser(data.currentUser);
      }

      // Only update state if there are actual changes
      setUserStories(prevStories => {
        const newStories = data.userStories;
        return JSON.stringify(prevStories) === JSON.stringify(newStories) ? prevStories : newStories;
      });

      setOtherStories(prevStories => {
        const newStories = data.otherStories;
        return JSON.stringify(prevStories) === JSON.stringify(newStories) ? prevStories : newStories;
      });
    } catch (error) {
      // Remove console.error
    }
  };

  // Set up polling for real-time updates
  useEffect(() => {
    // Initial state
    setUserStories(initialUserStories);
    setOtherStories(initialOtherStories);

    let pollInterval: NodeJS.Timeout | null = null;

    // Only set up polling if story modal is closed and component is mounted
    if (!storyModal.isOpen) {
      // Initial fetch
      fetchLatestStories();
      
      // Poll every 30 seconds
      pollInterval = setInterval(fetchLatestStories, 30000);
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    };
  }, [initialUserStories, initialOtherStories, storyModal.isOpen]);

  const hasActiveStory = userStories?.some(
    (story) => {
      const storyDate = new Date(story.createdAt);
      const now = new Date();
      const diff = now.getTime() - storyDate.getTime();
      const hours = diff / (1000 * 60 * 60);
      return hours < 24;
    }
  );

  // Only return null if there's no session user
  if (!session?.user) return null;

  // Use the fresh user data if available, otherwise fall back to session data
  const displayUser: MinimalUser = currentUser || {
    id: session.user.id,
    username: session.user.username || null,
    image: session.user.image || null,
    name: session.user.name || null
  };

  // Remove duplicate users from otherStories, keeping only the most recent story per user
  const uniqueUserStories = otherStories
    ?.filter(story => story?.user?.id) // Filter out stories with invalid user data
    ?.reduce((acc: StoryWithExtras[], story) => {
      if (!story.user?.id) return acc; // Additional safety check
      
      const existingStoryIndex = acc.findIndex(s => s.user.id === story.user.id);
      if (existingStoryIndex === -1) {
        acc.push(story);
      } else {
        // If this story is more recent than the existing one, replace it
        const existingStory = acc[existingStoryIndex];
        if (new Date(story.createdAt) > new Date(existingStory.createdAt)) {
          acc[existingStoryIndex] = story;
        }
      }
      return acc;
    }, [])
    // Sort stories by timestamp (newest first) and unviewed status
    ?.sort((a, b) => {
      // First, check if stories are viewed
      const aIsViewed = a.views?.some(view => view.user.id === session?.user?.id);
      const bIsViewed = b.views?.some(view => view.user.id === session?.user?.id);
      
      // If one is viewed and the other isn't, prioritize the unviewed one
      if (aIsViewed !== bIsViewed) {
        return aIsViewed ? 1 : -1;
      }
      
      // If both are viewed or both are unviewed, sort by timestamp
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }) || [];

  // Sort user's own stories by timestamp (newest first)
  const sortedUserStories = userStories
    ?.filter(story => {
      const storyDate = new Date(story.createdAt);
      const now = new Date();
      const diff = now.getTime() - storyDate.getTime();
      const hours = diff / (1000 * 60 * 60);
      return hours < 24;
    })
    ?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) || [];

  // Function to handle story bubble click
  const handleStoryClick = async (userId: string) => {
    if (!session?.user?.id || !userId) return;

    // Get all active stories for the clicked user
    const clickedUserStories = userId === session.user.id 
      ? sortedUserStories
      : uniqueUserStories.filter(story => story.user.id === userId);

    // If no active stories, don't open modal
    if (clickedUserStories.length === 0) return;

    // Transform the stories into the correct format
    const allStories = [
      // Current user's stories or clicked user's stories
      ...(clickedUserStories.length > 0 ? [{
        userId: userId,
        stories: clickedUserStories
      }] : []),
      // Other users' active stories (excluding the clicked user)
      ...uniqueUserStories
        .filter(story => story.user.id !== userId)
        .reduce((acc: UserStoriesState[], story) => {
          const existingUserIndex = acc.findIndex(item => item.userId === story.user.id);
          if (existingUserIndex === -1) {
            acc.push({ userId: story.user.id, stories: [story] });
          } else {
            acc[existingUserIndex].stories.push(story);
          }
          return acc;
        }, [])
    ];

    // Find the index of the clicked user in the combined array
    const userIndex = allStories.findIndex(s => s.userId === userId);
    if (userIndex === -1) return;

    // Sort stories by createdAt in descending order (newest first)
    allStories[userIndex].stories.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Open the story modal with the correct data
    storyModal.setUserStories(allStories as any);
    storyModal.setCurrentUserIndex(userIndex);
    storyModal.setUserId(userId);
    storyModal.onOpen();
  };

  return (
    <div className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 mb-4" suppressHydrationWarning>
      <div className="relative">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex space-x-4" ref={scrollContainerRef} suppressHydrationWarning>
            {/* Always show the user's story bubble with fresh data */}
            {session?.user?.id && (
              <div onClick={() => handleStoryClick(session.user.id)}>
                <StoryBubble
                  user={displayUser}
                  hasStory={Boolean(hasActiveStory)}
                  isOwn={true}
                  viewed={Boolean(sortedUserStories.length > 0 && sortedUserStories[0].views?.some(view => {
                    if (view?.user?.id !== session?.user?.id) return false;
                    const viewDate = new Date(view.createdAt);
                    const storyDate = new Date(sortedUserStories[0].createdAt);
                    return viewDate >= storyDate;
                  }) || (typeof window !== 'undefined' && session?.user?.id && (() => {
                    const storageKey = `viewed_stories_${session.user.id}_${session.user.id}`;
                    const storedViewedStories = localStorage.getItem(storageKey);
                    if (!storedViewedStories) return false;
                    try {
                      const viewedStories = JSON.parse(storedViewedStories);
                      return sortedUserStories.length > 0 && viewedStories[sortedUserStories[0].id] === true;
                    } catch (error) {
                      return false;
                    }
                  })()))}
                />
              </div>
            )}

            {uniqueUserStories?.length > 0 && (
              <>
                <Separator orientation="vertical" className="h-16" />
                {uniqueUserStories.map((story) => {
                  if (!story?.user?.id) return null;
                  
                  const storyUser: MinimalUser = {
                    id: story.user.id,
                    username: story.user.username || null,
                    image: story.user.image || null,
                    name: story.user.name || null
                  };
                  
                  return (
                    <div key={story.id} onClick={() => handleStoryClick(story.user.id)} suppressHydrationWarning>
                      <StoryBubble
                        user={storyUser}
                        hasStory={true}
                        isOwn={false}
                        viewed={story.views?.some(view => {
                          if (view?.user?.id !== session?.user?.id) return false;
                          const viewDate = new Date(view.createdAt);
                          const storyDate = new Date(story.createdAt);
                          return viewDate >= storyDate;
                        })}
                      />
                    </div>
                  );
                })}
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