"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useStoryModal } from "@/hooks/use-story-modal";
import useMount from "@/hooks/useMount";
import { Dialog, DialogContent, DialogTitle, DialogContentWithoutClose, DialogDescription } from "@/components/ui/dialog";
import { Heart, MoreHorizontal, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSocket } from "@/hooks/use-socket";
import ReportStoryModal from "./ReportStoryModal";
import UserAvatar from "../UserAvatar";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../ui/sheet";
import { formatDistanceToNow } from "date-fns";
import axios from "axios";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface StoryUser {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
}

interface StoryView {
  id: string;
  user: StoryUser;
  createdAt: Date;
}

interface StoryLike {
  id: string;
  user: StoryUser;
  createdAt: Date;
}

interface Story {
  id: string;
  createdAt: Date;
  fileUrl: string;
  scale: number;
  user: StoryUser;
  likes: StoryLike[];
  views: StoryView[];
}

interface UserStoriesState {
  userId: string;
  stories: Story[];
}

interface StoryModalContextType {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  userId: string | null;
  setUserId: (userId: string) => void;
  userStories: UserStoriesState[];
  setUserStories: (stories: UserStoriesState[] | ((prev: UserStoriesState[]) => UserStoriesState[])) => void;
  currentUserIndex: number;
  setCurrentUserIndex: (index: number) => void;
}

interface ViewerListItemProps {
  user: StoryUser;
  hasLiked?: boolean;
}

function ViewerListItem({ user, hasLiked }: ViewerListItemProps) {
  return (
    <div className="flex items-center justify-between">
      <Link 
        href={`/dashboard/${user.username}`}
        className="flex items-center gap-2 hover:opacity-75 transition flex-1"
      >
        <UserAvatar user={user} />
        <div>
          <p className="font-semibold">{user.username}</p>
          <p className="text-sm text-neutral-500">{user.name}</p>
        </div>
      </Link>
      {hasLiked && (
        <Heart className="h-4 w-4 text-red-500 fill-red-500" />
      )}
    </div>
  );
}

export default function StoryModal() {
  const { data: session } = useSession();
  const storyModal = useStoryModal();
  const mount = useMount();
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [showViewers, setShowViewers] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [showViewersList, setShowViewersList] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [stories, setStories] = useState<Story[]>([]);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchRef = useRef<number>(0);
  const [progress, setProgress] = useState(0);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  const storyTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastProgressRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const isProgressRunning = useRef(false);
  const socket = useSocket();
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [storyToReport, setStoryToReport] = useState<Story | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const closingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentUserStories = storyModal.userStories[storyModal.currentUserIndex];
  const currentStory = currentUserStories?.stories[currentStoryIndex];

  const isStoryOwner = session?.user?.id === currentStory?.user.id;
  const isMasterAdmin = session?.user?.role === "MASTER_ADMIN";
  const isAdmin = session?.user?.role === "ADMIN";
  const canDelete = isStoryOwner || isMasterAdmin || isAdmin;

  // Define findNextUnviewedStory first
  const findNextUnviewedStory = useCallback(() => {
    if (!session?.user?.id) return null;

    // First check remaining stories in current user's stories
    for (let i = currentStoryIndex + 1; i < currentUserStories?.stories.length; i++) {
      const story = currentUserStories.stories[i];
      if (!story.views.some(view => view.user.id === session.user.id)) {
        return { userIndex: storyModal.currentUserIndex, storyIndex: i };
      }
    }

    // Then check other users' stories
    for (let i = storyModal.currentUserIndex + 1; i < storyModal.userStories.length; i++) {
      const userStories = storyModal.userStories[i];
      for (let j = 0; j < userStories.stories.length; j++) {
        const story = userStories.stories[j];
        if (!story.views.some(view => view.user.id === session.user.id)) {
          return { userIndex: i, storyIndex: j };
        }
      }
    }

    return null;
  }, [session?.user?.id, currentStoryIndex, currentUserStories, storyModal.currentUserIndex, storyModal.userStories]);

  // Now define handleStoryEnd which uses findNextUnviewedStory
  const handleStoryEnd = useCallback(() => {
    if (isClosing) return;
    
    // Prevent multiple calls
    if (progressInterval.current === null && storyTimeout.current === null) {
      return;
    }

    // Clear any existing timers
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
    if (storyTimeout.current) {
      clearTimeout(storyTimeout.current);
      storyTimeout.current = null;
    }
    if (closingTimeoutRef.current) {
      clearTimeout(closingTimeoutRef.current);
      closingTimeoutRef.current = null;
    }

    if (currentStoryIndex < currentUserStories?.stories.length - 1) {
      // Move to next story in current user's stories
      setCurrentStoryIndex(prev => prev + 1);
      setProgress(0);
      lastProgressRef.current = 0;
      setIsPaused(false);
    } else {
      // Find next unviewed story
      const nextUnviewed = findNextUnviewedStory();
      
      if (nextUnviewed) {
        // Move to the next unviewed story
        storyModal.setCurrentUserIndex(nextUnviewed.userIndex);
        setCurrentStoryIndex(nextUnviewed.storyIndex);
        setProgress(0);
        lastProgressRef.current = 0;
        setIsPaused(false);
      } else {
        // Set closing state and schedule modal close
        setIsClosing(true);
        closingTimeoutRef.current = setTimeout(() => {
          storyModal.onClose();
        }, 100); // Small delay to ensure state updates complete
      }
    }
  }, [currentStoryIndex, currentUserStories?.stories.length, findNextUnviewedStory, storyModal, isClosing]);

  // Update the useEffect for progress
  useEffect(() => {
    if (!mount || !storyModal.isOpen || isPaused || isClosing) return;

    const startProgress = () => {
      // Prevent multiple progress trackers
      if (isProgressRunning.current) return;
      isProgressRunning.current = true;

      if (progressInterval.current) clearInterval(progressInterval.current);
      if (storyTimeout.current) clearTimeout(storyTimeout.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (closingTimeoutRef.current) clearTimeout(closingTimeoutRef.current);

      const duration = 5000; // 5 seconds per story
      startTimeRef.current = performance.now();

      const animate = (currentTime: number) => {
        if (!startTimeRef.current || isClosing) return;

        const elapsed = currentTime - startTimeRef.current;
        const newProgress = Math.min((elapsed / duration) * 100, 100);

        setProgress(newProgress);
        
        // Enhanced debug logging for progress
        if (Math.floor(newProgress) % 20 === 0) { // Log every 20% progress
          console.log(`[Story Progress] Story ${currentStoryIndex + 1}/${currentUserStories?.stories.length || 0} - ${Math.floor(newProgress)}%`, {
            isPaused,
            isClosing,
            hasStartTime: !!startTimeRef.current,
            currentStoryId: currentStory?.id,
            isProgressRunning: isProgressRunning.current
          });
        }

        if (newProgress < 100) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          // Story is complete
          isProgressRunning.current = false;
          requestAnimationFrame(() => {
            handleStoryEnd();
          });
        }
      };

      // Wait for the story to load before starting the progress
      const image = new Image();
      image.src = currentStory?.fileUrl || '';
      
      image.onload = () => {
        console.log('[Story Progress] Image loaded, starting progress');
        animationFrameRef.current = requestAnimationFrame(animate);

        // Set a timeout for the entire story duration as a fallback
        storyTimeout.current = setTimeout(() => {
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
          }
          isProgressRunning.current = false;
          requestAnimationFrame(() => {
            handleStoryEnd();
          });
        }, duration);
      };

      image.onerror = () => {
        console.log('[Story Progress] Image failed to load, starting progress with delay');
        // If image fails to load, still start the progress after a short delay
        setTimeout(() => {
          animationFrameRef.current = requestAnimationFrame(animate);

          storyTimeout.current = setTimeout(() => {
            if (animationFrameRef.current) {
              cancelAnimationFrame(animationFrameRef.current);
              animationFrameRef.current = null;
            }
            isProgressRunning.current = false;
            requestAnimationFrame(() => {
              handleStoryEnd();
            });
          }, duration);
        }, 1000);
      };
    };

    startProgress();

    return () => {
      console.log('[Story Progress] Cleanup - clearing timers and animation frames');
      isProgressRunning.current = false;
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }
      if (storyTimeout.current) {
        clearTimeout(storyTimeout.current);
        storyTimeout.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (closingTimeoutRef.current) {
        clearTimeout(closingTimeoutRef.current);
        closingTimeoutRef.current = null;
      }
      startTimeRef.current = null;
    };
  }, [mount, storyModal.isOpen, isPaused, handleStoryEnd, currentStory?.fileUrl, isClosing]);

  // Reset closing state when modal opens
  useEffect(() => {
    if (storyModal.isOpen) {
      setIsClosing(false);
    }
  }, [storyModal.isOpen]);

  // Track view when story is opened
  useEffect(() => {
    if (!currentStory || !session?.user?.id) {
      return;
    }

    const isOwnStory = currentStory.user.id === session.user.id;

    // For own stories, just update localStorage and UI without creating a view record
    if (isOwnStory) {
      if (session?.user?.id && currentStory.user.id) {
        const storageKey = `viewed_stories_${currentStory.user.id}_${session.user.id}`;
        const storedViewedStories = localStorage.getItem(storageKey);
        const viewedStories = storedViewedStories ? JSON.parse(storedViewedStories) : {};
        viewedStories[currentStory.id] = true;
        localStorage.setItem(storageKey, JSON.stringify(viewedStories));

        // Dispatch event to update UI
        const event = new CustomEvent('storyViewed', {
          detail: {
            userId: currentStory.user.id,
            storyId: currentStory.id,
            viewerId: session.user.id,
            viewedStories,
            isOwnStory: true
          }
        });
        window.dispatchEvent(event);
      }
      return;
    }

    // Rate limiting for view tracking
    const viewedKey = `story_view_${currentStory.id}`;
    const lastViewTime = parseInt(sessionStorage.getItem(viewedKey) || '0');
    const now = Date.now();
    const VIEW_COOLDOWN = 5000; // 5 second cooldown between view tracking

    if (now - lastViewTime < VIEW_COOLDOWN) {
      return;
    }

    // Only track view when story has been viewed for at least 1 second
    if (progress < 20) {
      return;
    }

    // For others' stories, track view with rate limiting
    const trackView = async () => {
      try {
        sessionStorage.setItem(viewedKey, now.toString());

        const response = await axios.post('/api/stories/view', {
          storyIds: [currentStory.id]
        });

        if (response.data.success) {
          // Emit socket event for real-time updates
          socket?.emit('storyViewUpdate', {
            storyId: currentStory.id,
            userId: session.user.id,
            timestamp: new Date().toISOString()
          });

          // Update localStorage
          if (session?.user?.id && currentStory.user.id) {
            const storageKey = `viewed_stories_${currentStory.user.id}_${session.user.id}`;
            const storedViewedStories = localStorage.getItem(storageKey);
            const viewedStories = storedViewedStories ? JSON.parse(storedViewedStories) : {};
            viewedStories[currentStory.id] = true;
            localStorage.setItem(storageKey, JSON.stringify(viewedStories));

            // Dispatch event to update UI
            const event = new CustomEvent('storyViewed', {
              detail: {
                userId: currentStory.user.id,
                storyId: currentStory.id,
                viewerId: session.user.id,
                viewedStories
              }
            });
            window.dispatchEvent(event);
          }

          // Update local state with the new view
          setStories(prevStories => {
            return prevStories.map(story => {
              if (story.id === currentStory.id) {
                const hasExistingView = story.views?.some(view => view.user.id === session.user.id);
                if (!hasExistingView) {
                  return {
                    ...story,
                    views: [...(story.views || []), {
                      id: `temp-${Date.now()}`,
                      createdAt: new Date(),
                      user: {
                        id: session.user.id,
                        username: session.user.username || '',
                        name: session.user.name || null,
                        image: session.user.image || null
                      }
                    }]
                  };
                }
              }
              return story;
            });
          });

          // Update the userStories in the modal context
          storyModal.setUserStories((prev: UserStoriesState[]) => {
            return prev.map((userStory: UserStoriesState) => {
              if (userStory.userId === currentStory.user.id) {
                return {
                  ...userStory,
                  stories: userStory.stories.map((story: Story) => {
                    if (story.id === currentStory.id) {
                      const hasExistingView = story.views?.some((view: StoryView) => view.user.id === session.user.id);
                      if (!hasExistingView) {
                        const newView: StoryView = {
                          id: Date.now().toString(),
                          user: {
                            id: session.user.id,
                            username: session.user.username || '',
                            name: session.user.name || null,
                            image: session.user.image || null
                          },
                          createdAt: new Date()
                        };
                        return {
                          ...story,
                          views: [...story.views, newView]
                        };
                      }
                    }
                    return story;
                  })
                };
              }
              return userStory;
            });
          });
        }
      } catch (error) {
        setError("Failed to load stories");
      }
    };

    trackView();
  }, [currentStory?.id, session?.user?.id, progress]);

  // Update the progress timer effect
  useEffect(() => {
    if (!currentStory || isPaused || !storyModal.isOpen) {
      return;
    }

    let progressTimer: NodeJS.Timeout | null = null;
    let startDelay: NodeJS.Timeout | null = null;
    const STORY_DURATION = 5000; // 5 seconds per story
    const PROGRESS_INTERVAL = 50; // Update every 50ms for smooth animation

    const startProgress = () => {
      setProgress(0);
      
      startDelay = setTimeout(() => {
        const startTime = Date.now();
        
        progressTimer = setInterval(() => {
          const elapsedTime = Date.now() - startTime;
          const calculatedProgress = (elapsedTime / STORY_DURATION) * 100;
          
          if (calculatedProgress >= 100) {
            if (progressTimer) clearInterval(progressTimer);
            if (startDelay) clearTimeout(startDelay);
            
            // Move to next story immediately
            if (currentStoryIndex < (currentUserStories?.stories.length || 0) - 1) {
              setCurrentStoryIndex(prev => prev + 1);
            } else if (storyModal.currentUserIndex < storyModal.userStories.length - 1) {
              storyModal.setCurrentUserIndex(storyModal.currentUserIndex + 1);
              setCurrentStoryIndex(0);
            } else {
              storyModal.onClose();
            }
          } else {
            setProgress(calculatedProgress);
          }
        }, PROGRESS_INTERVAL);
      }, 100);
    };

    startProgress();

    return () => {
      if (progressTimer) {
        clearInterval(progressTimer);
      }
      if (startDelay) {
        clearTimeout(startDelay);
      }
    };
  }, [
    currentStory?.id,
    isPaused,
    storyModal.isOpen,
    currentStoryIndex,
    currentUserStories?.stories.length,
    storyModal.currentUserIndex,
    storyModal.userStories.length,
    storyModal.onClose
  ]);

  // Handle story transitions
  useEffect(() => {
    if (!currentStory) {
      return;
    }

    const timeout = setTimeout(() => {
      requestAnimationFrame(() => {
        setProgress(0);
      });
    }, 0);

    return () => clearTimeout(timeout);
  }, [currentStory?.id]);

  // Reset all states when modal closes
  useEffect(() => {
    if (!storyModal.isOpen) {
      setStories([]);
      setCurrentStoryIndex(0);
      setProgress(0);
      setIsLiked(false);
      setShowViewers(false);
      setShowViewersList(false);
      setIsPaused(false);
      setError(null);
      setIsLoading(false);
      lastFetchRef.current = 0;
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
      if (storyTimeout.current) {
        clearTimeout(storyTimeout.current);
      }

      // Emit story modal close event
      const event = new CustomEvent('storyModalClose');
      window.dispatchEvent(event);
    }
  }, [storyModal.isOpen]);

  // Update the initial fetch and polling effect
  useEffect(() => {
    if (!mount || !storyModal.isOpen || !storyModal.userId) return;
    
    setIsLoading(true); // Show loading state while fetching
    
    // Initial fetch
    const initialFetch = async () => {
      try {
        const response = await fetch(`/api/stories?userId=${storyModal.userId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch stories');
        }
        
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || "Failed to load stories");
        }

        // Sort stories by createdAt in ascending order (oldest first)
        const newStories = data.data.sort((a: Story, b: Story) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        setStories(newStories);
        
        // Update userStories in modal context
        if (storyModal.userStories.length > 0) {
          const updatedUserStories = [...storyModal.userStories];
          updatedUserStories[storyModal.currentUserIndex] = {
            ...updatedUserStories[storyModal.currentUserIndex],
            stories: newStories
          };
          storyModal.setUserStories(updatedUserStories);
        }
      } catch (error) {
        setError("Failed to load stories");
      } finally {
        setIsLoading(false);
      }
    };

    initialFetch();

    // Set up polling with a longer interval
    const storyUpdateInterval = setInterval(fetchStories, 15000); // Poll every 15 seconds
    
    return () => {
      clearInterval(storyUpdateInterval);
    };
  }, [mount, storyModal.isOpen, storyModal.userId]);

  // Socket.io effect for real-time likes
  useEffect(() => {
    if (!socket || !currentStory) return;

    const handleLikeUpdate = (data: { storyId: string; userId: string; action: 'like' | 'unlike'; timestamp: string }) => {
      if (data.storyId === currentStory.id) {
        setStories((prevStories) => {
          return prevStories.map((story) => {
            if (story.id === data.storyId) {
              if (data.action === 'like') {
                // Add like if not already present
                const hasExistingLike = story.likes.some((like: StoryLike) => like.user.id === data.userId);
                if (!hasExistingLike) {
                  return {
                    ...story,
                    likes: [...story.likes, {
                      id: `temp-${Date.now()}`,
                      createdAt: new Date(data.timestamp),
                      user: {
                        id: data.userId,
                        username: '', // Will be updated on next fetch
                        name: null,
                        image: null
                      }
                    }]
                  };
                }
              } else {
                // Remove like
                return {
                  ...story,
                  likes: story.likes.filter((like: StoryLike) => like.user.id !== data.userId)
                };
              }
            }
            return story;
          });
        });
      }
    };

    socket.on('storyLikeUpdate', handleLikeUpdate);
    
    return () => {
      socket.off('storyLikeUpdate', handleLikeUpdate);
    };
  }, [socket, currentStory?.id, currentStory?.user?.id]);

  // Optimistic update for likes with socket emission
  const handleLike = async () => {
    if (!currentStory || !session?.user?.id || !socket) return;

    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);

    // Store the previous state for rollback
    const previousStories = [...stories];

    // Optimistically update the stories array
    setStories((prevStories) => {
      return prevStories.map((story) => {
        if (story.id === currentStory.id) {
          const updatedLikes = newIsLiked
            ? [...story.likes, {
                id: `temp-${Date.now()}`,
                createdAt: new Date(),
                user: {
                  id: session.user!.id,
                  username: session.user!.username || '',
                  name: session.user!.name || null,
                  image: session.user!.image || null
                }
              }]
            : story.likes.filter((like) => like.user.id !== session.user!.id);

          return {
            ...story,
            likes: updatedLikes
          };
        }
        return story;
      });
    });

    try {
      const response = await axios.post('/api/stories/like', {
        storyId: currentStory.id,
        action: newIsLiked ? 'like' : 'unlike'
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to update like');
      }

      // Update the story with the server response data if provided
      if (response.data.data) {
        setStories((prevStories) => {
          return prevStories.map((story) => {
            if (story.id === currentStory.id) {
              return {
                ...story,
                likes: newIsLiked 
                  ? [...story.likes.filter(like => like.id !== `temp-${Date.now()}`), response.data.data]
                  : story.likes.filter((like) => like.user.id !== session.user!.id)
              };
            }
            return story;
          });
        });
      }

      // Emit socket event for real-time updates
      socket.emit('storyLikeUpdate', {
        storyId: currentStory.id,
        userId: session.user.id,
        action: newIsLiked ? 'like' : 'unlike'
      });
    } catch (error: any) {
      // Revert optimistic update
      setIsLiked(!newIsLiked);
      setStories(previousStories);
      
      // Show specific error message based on the error type
      if (error.response?.status === 404) {
        toast.error('Story not found or expired');
        progressToNextStory();
      } else if (error.response?.status === 401) {
        toast.error('You must be logged in to like stories');
      } else {
        toast.error(error.response?.data?.error || 'Failed to update like');
      }
    }
  };

  // Update the sortedViewers calculation
  const sortedViewers = currentStory ? [...currentStory.views]
    .filter((view: StoryView) => view.user.id !== currentStory.user.id) // Exclude story owner from views
    .sort((a: StoryView, b: StoryView) => {
      const aLiked = currentStory.likes.some((like: StoryLike) => like.user.id === a.user.id);
      const bLiked = currentStory.likes.some((like: StoryLike) => like.user.id === b.user.id);
      if (aLiked && !bLiked) return -1;
      if (!aLiked && bLiked) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }) : [];

  const handleDeleteStory = async () => {
    try {
      const response = await fetch(`/api/stories/${currentStory?.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete story');
      
      // Update the stories state by removing the deleted story
      const updatedStories = currentUserStories.stories.filter(
        story => story.id !== currentStory?.id
      );

      // If this was the last story for the current user
      if (updatedStories.length === 0) {
        // Clear the lastViewedKey for own stories
        if (currentStory?.user.id === session?.user?.id) {
          const lastViewedKey = `last_viewed_own_stories_${session.user.id}`;
          localStorage.removeItem(lastViewedKey);
        }

        // Remove the current user from userStories
        const updatedUserStories = storyModal.userStories.filter(
          (_, index) => index !== storyModal.currentUserIndex
        );
        
        // If there are no more users with stories, close the modal and refresh
        if (updatedUserStories.length === 0) {
          storyModal.onClose();
          // Force refresh the page to update the UI
          window.location.reload();
          return;
        }
        
        // Update the stories state
        storyModal.setUserStories(updatedUserStories);
        
        // If we were viewing the last user's stories, move to the previous user
        if (storyModal.currentUserIndex >= updatedUserStories.length) {
          storyModal.setCurrentUserIndex(updatedUserStories.length - 1);
          setCurrentStoryIndex(0);
        }
      } else {
        // Update the current user's stories
        const updatedUserStories = [...storyModal.userStories];
        updatedUserStories[storyModal.currentUserIndex] = {
          ...currentUserStories,
          stories: updatedStories
        };
        storyModal.setUserStories(updatedUserStories);
      }

      // If this was the last story in the current user's stories, move to the previous story
      if (currentStoryIndex >= updatedStories.length) {
        setCurrentStoryIndex(Math.max(0, updatedStories.length - 1));
      }
    } catch (error) {
      toast.error('Failed to delete story');
    }
  };

  const handleReportStory = () => {
    setStoryToReport(currentStory);
    storyModal.onClose(); // Close the story modal first
    // Use setTimeout to ensure the story modal is closed before opening the report modal
    setTimeout(() => {
      setIsReportModalOpen(true);
    }, 100);
  };

  // Function to progress to next story
  const progressToNextStory = useCallback(() => {
    if (!currentUserStories?.stories) return;

    if (currentStoryIndex < currentUserStories.stories.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1);
      setProgress(0);
    } else if (storyModal.currentUserIndex < storyModal.userStories.length - 1) {
      storyModal.setCurrentUserIndex(storyModal.currentUserIndex + 1);
      setCurrentStoryIndex(0);
      setProgress(0);
    } else {
      // If we've reached the last story of the last user, close the modal
      storyModal.onClose();
    }
  }, [currentStoryIndex, currentUserStories?.stories?.length, storyModal]);

  // Add a new effect to track when all stories have been viewed
  useEffect(() => {
    if (!storyModal.isOpen || !currentUserStories?.stories) return;

    // Check if we're on the last story of the last user
    const isLastStory = currentStoryIndex === currentUserStories.stories.length - 1;
    const isLastUser = storyModal.currentUserIndex === storyModal.userStories.length - 1;

    // Emit storyViewed event when a story is viewed
    if (currentStory && session?.user?.id) {
      const isOwnStory = currentStory.user.id === session.user.id;
      const storageKey = `viewed_stories_${currentStory.user.id}_${session.user.id}`;
      const storedViewedStories = localStorage.getItem(storageKey);
      const viewedStories = storedViewedStories ? JSON.parse(storedViewedStories) : {};
      
      // Mark the current story as viewed
      viewedStories[currentStory.id] = true;
      localStorage.setItem(storageKey, JSON.stringify(viewedStories));

      // Emit the storyViewed event
      const event = new CustomEvent('storyViewed', {
        detail: {
          userId: currentStory.user.id,
          viewedStories,
          isOwnStory
        }
      });
      window.dispatchEvent(event);
    }

    if (isLastStory && isLastUser) {
      // Set a timeout to close the modal after the last story is viewed
      const timeout = setTimeout(() => {
        storyModal.onClose();
      }, 5000); // Close after 5 seconds of viewing the last story

      return () => clearTimeout(timeout);
    }
  }, [currentStoryIndex, storyModal.currentUserIndex, currentUserStories?.stories?.length, storyModal.isOpen, storyModal.onClose]);

  // Handle story click for navigation
  const handleStoryClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;

    // If clicked on the left half, go to previous story
    if (x < width / 2) {
      if (currentStoryIndex > 0) {
        setCurrentStoryIndex(currentStoryIndex - 1);
        setProgress(0);
      } else if (storyModal.currentUserIndex > 0) {
        // Move to the last story of the previous user
        storyModal.setCurrentUserIndex(storyModal.currentUserIndex - 1);
        setCurrentStoryIndex(storyModal.userStories[storyModal.currentUserIndex - 1].stories.length - 1);
        setProgress(0);
      }
    } else {
      // If clicked on the right half, go to next story
      progressToNextStory();
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        if (currentStoryIndex > 0) {
          setCurrentStoryIndex(currentStoryIndex - 1);
          setProgress(0);
        } else if (storyModal.currentUserIndex > 0) {
          // Move to the last story of the previous user
          storyModal.setCurrentUserIndex(storyModal.currentUserIndex - 1);
          setCurrentStoryIndex(storyModal.userStories[storyModal.currentUserIndex - 1].stories.length - 1);
          setProgress(0);
        }
      } else if (e.key === 'ArrowRight') {
        progressToNextStory();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStoryIndex, storyModal.currentUserIndex, currentUserStories, progressToNextStory]);

  // Handle socket events for view updates
  useEffect(() => {
    if (!socket || !currentStory) return;

    const handleViewUpdate = (data: { storyId: string; userId: string; timestamp: string }) => {
      if (data.storyId === currentStory.id) {
        setStories(prevStories => {
          return prevStories.map(story => {
            if (story.id === data.storyId) {
              // Add view if not already present
              const hasExistingView = story.views.some(view => view.user.id === data.userId);
              if (!hasExistingView) {
                return {
                  ...story,
                  views: [...story.views, {
                    id: `temp-${Date.now()}`,
                    createdAt: new Date(data.timestamp),
                    user: {
                      id: data.userId,
                      username: '', // Will be updated on next fetch
                      name: null,
                      image: null
                    }
                  }]
                };
              }
            }
            return story;
          });
        });
      }
    };

    socket.on('storyViewUpdate', handleViewUpdate);
    return () => {
      socket.off('storyViewUpdate', handleViewUpdate);
    };
  }, [socket, currentStory?.id]);

  // Update isLiked when currentStory changes
  useEffect(() => {
    if (currentStory && session?.user?.id) {
      setIsLiked(currentStory.likes.some((like: StoryLike) => like.user.id === session.user.id));
    }
  }, [currentStory, session?.user?.id]);

  // Update the fetchStories function to be less aggressive and preserve story state
  const fetchStories = async () => {
    if (!storyModal.userId || showViewersList) return;
    
    // Prevent fetching too frequently
    const now = Date.now();
    if (now - lastFetchRef.current < 15000) return; // Back to 15s to prevent frequent refreshes
    lastFetchRef.current = now;

    try {
      const response = await fetch(`/api/stories?userId=${storyModal.userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch stories');
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to load stories");
      }

      // Sort stories by createdAt in ascending order (oldest first)
      const newStories = data.data.sort((a: Story, b: Story) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      // Update stories while preserving current story state
      setStories((prevStories) => {
        if (currentStory) {
          return newStories.map((story: Story) => 
            story.id === currentStory.id ? currentStory : story
          );
        }
        return newStories;
      });

      // Update userStories in modal context
      if (storyModal.userStories.length > 0) {
        const updatedUserStories = [...storyModal.userStories];
        updatedUserStories[storyModal.currentUserIndex] = {
          ...updatedUserStories[storyModal.currentUserIndex],
          stories: newStories
        };
        storyModal.setUserStories(updatedUserStories);
      }
    } catch (error) {
      setError("Failed to load stories");
    }
  };

  // Add effect to log when report modal state changes
  useEffect(() => {
    // Removed console.log
  }, [isReportModalOpen]);

  // Add effect to log when story modal state changes
  useEffect(() => {
    // Removed console.log
  }, [storyModal.isOpen]);

  // Add effect to reset storyToReport when report modal closes
  useEffect(() => {
    if (!isReportModalOpen) {
      setStoryToReport(null);
    }
  }, [isReportModalOpen]);

  if (!mount) return null;

  return (
    <>
      <Dialog open={storyModal.isOpen} onOpenChange={storyModal.onClose}>
        <DialogContent 
          className="max-w-4xl h-[calc(100vh-2rem)] p-0 overflow-hidden bg-neutral-900 border-none"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">
            {currentUserStories?.stories[currentStoryIndex]?.user.username}'s Story
          </DialogTitle>
          <DialogDescription className="sr-only">
            Story viewer showing {currentUserStories?.stories[currentStoryIndex]?.user.username}'s content. 
            Use left and right arrow keys to navigate between stories.
          </DialogDescription>
          {isLoading ? (
            <div className="h-full w-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
            </div>
          ) : error ? (
            <div className="h-full w-full flex items-center justify-center text-white">
              <p>{error}</p>
            </div>
          ) : !currentStory ? (
            <div className="h-full w-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
            </div>
          ) : (
            <div className="relative h-full w-full flex items-center justify-center">
              {/* Story image with click handler */}
              <div
                style={{
                  backgroundImage: `url(${currentStory.fileUrl})`,
                  transform: `scale(${currentStory.scale || 1})`,
                }}
                className={cn(
                  "absolute inset-0 bg-center bg-no-repeat bg-contain",
                  session?.user?.id !== currentStory.user.id && "cursor-pointer"
                )}
                onClick={session?.user?.id !== currentStory.user.id ? handleStoryClick : undefined}
              />

              {/* Progress bar */}
              <div className="absolute top-4 left-4 right-4 flex gap-1">
                {currentUserStories.stories.map((_, index) => (
                  <div
                    key={index}
                    className="h-0.5 bg-white/50 flex-1 rounded-full overflow-hidden"
                  >
                    <div
                      className={cn(
                        "h-full bg-white transition-all duration-100 ease-linear",
                        index === currentStoryIndex && "transition-all duration-100 ease-linear",
                        index < currentStoryIndex && "w-full",
                        index > currentStoryIndex && "w-0"
                      )}
                      style={{
                        width: index === currentStoryIndex ? `${progress}%` : 
                               index < currentStoryIndex ? '100%' : '0%'
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Navigation buttons */}
              {(currentStoryIndex > 0 || storyModal.currentUserIndex > 0) && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-white"
                  onClick={() => {
                    if (currentStoryIndex > 0) {
                      setCurrentStoryIndex(prev => prev - 1);
                    } else {
                      storyModal.setCurrentUserIndex(storyModal.currentUserIndex - 1);
                    }
                  }}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
              )}
              {(currentStoryIndex < currentUserStories.stories.length - 1 || 
                storyModal.currentUserIndex < storyModal.userStories.length - 1) && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-white"
                  onClick={() => {
                    if (currentStoryIndex < currentUserStories.stories.length - 1) {
                      setCurrentStoryIndex(prev => prev + 1);
                    } else {
                      storyModal.setCurrentUserIndex(storyModal.currentUserIndex + 1);
                    }
                  }}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              )}

              {/* User info and options */}
              <div className="absolute top-8 left-4 right-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserAvatar user={currentStory.user} className="h-8 w-8" />
                  <div className="flex items-center gap-2">
                    <Link 
                      href={`/dashboard/${currentStory.user.username}`}
                      className="text-white font-semibold hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        storyModal.onClose();
                      }}
                    >
                      {currentStory.user.username}
                    </Link>
                    <span className="text-white/70 text-sm">
                      • {formatDistanceToNow(new Date(currentStory.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-white hover:text-white"
                      >
                        <MoreHorizontal className="h-6 w-6" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      {canDelete ? (
                        <DropdownMenuItem
                          className="text-red-500 cursor-pointer"
                          onClick={handleDeleteStory}
                        >
                          Delete story
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={handleReportStory}
                        >
                          Report
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={storyModal.onClose}
                      >
                        Cancel
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-white hover:text-white"
                    onClick={storyModal.onClose}
                  >
                    <X className="h-6 w-6" />
                  </Button>
                </div>
              </div>

              {/* Views list */}
              {session?.user?.id === currentStory.user.id && (
                <>
                  <div className="absolute bottom-4 left-4">
                    <Button
                      variant="ghost"
                      onClick={() => setShowViewersList(!showViewersList)}
                      className="text-white text-sm flex items-center gap-2 hover:text-white"
                    >
                      <span>{sortedViewers.length} {sortedViewers.length === 1 ? 'view' : 'views'}</span>
                      {sortedViewers.length > 0 && (
                        <div className="flex -space-x-2">
                          {sortedViewers.slice(0, 3).map((view: StoryView) => (
                            <UserAvatar
                              key={view.id}
                              user={view.user}
                              className="h-6 w-6 border-2 border-black"
                            />
                          ))}
                        </div>
                      )}
                    </Button>

                    {showViewersList && (
                      <>
                        <div 
                          className="fixed inset-0 z-40"
                          onClick={() => setShowViewersList(false)}
                        />
                        <div className="absolute left-0 bottom-full mb-2 w-72 bg-black/90 rounded-lg overflow-hidden border border-neutral-700 z-50">
                          <div className="p-4 border-b border-neutral-700">
                            <h4 className="font-semibold text-white">Story views · {sortedViewers.length}</h4>
                          </div>
                          <ScrollArea className="h-[300px]">
                            <div className="p-4 space-y-4">
                              {sortedViewers.map((viewer) => (
                                <ViewerListItem 
                                  key={viewer.id} 
                                  user={viewer.user} 
                                  hasLiked={currentStory?.likes?.some(like => like.user.id === viewer.user.id)}
                                />
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}

              {/* Like button - Only show for non-owners */}
              {session?.user?.id !== currentStory?.user.id && (
                <Button
                  onClick={handleLike}
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "absolute bottom-4 right-4 text-white hover:text-white transition-colors",
                    isLiked && "text-red-500 hover:text-red-600"
                  )}
                >
                  <Heart
                    className={cn(
                      "w-8 h-8",
                      isLiked && "fill-red-500 text-red-500"
                    )}
                  />
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {storyToReport && (
        <ReportStoryModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          storyId={storyToReport.id}
          username={storyToReport.user.username}
        />
      )}
    </>
  );
} 