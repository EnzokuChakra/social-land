"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useStoryModal } from "@/hooks/use-story-modal";
import { Dialog, DialogContent, DialogTitle, DialogContentWithoutClose } from "@/components/ui/dialog";
import { useSession } from "next-auth/react";
import { Heart, MoreHorizontal, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
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
import useMount from "@/hooks/useMount";
import { useSocket } from "../../hooks/use-socket";

interface StoryUser {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
}

interface StoryView {
  id: string;
  createdAt: Date;
  user: StoryUser;
}

interface StoryLike {
  id: string;
  createdAt: Date;
  user: StoryUser;
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
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [showViewers, setShowViewers] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [showViewersList, setShowViewersList] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [stories, setStories] = useState<Story[]>([]);
  const router = useRouter();
  const mount = useMount();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchRef = useRef<number>(0);
  const [progress, setProgress] = useState(0);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  const storyTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastProgressRef = useRef<number>(0);
  const socket = useSocket();

  const currentUserStories = storyModal.userStories[storyModal.currentUserIndex];
  const currentStory = currentUserStories?.stories[currentStoryIndex];

  // Function to progress to next story
  const progressToNextStory = useCallback(() => {
    if (!currentUserStories) return;

    // If there are more stories from the current user
    if (currentStoryIndex < currentUserStories.stories.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1);
      setProgress(0);
    } else {
      // If we're at the last story of the current user
      if (storyModal.currentUserIndex < storyModal.userStories.length - 1) {
        // Move to the first story of the next user
        storyModal.setCurrentUserIndex(storyModal.currentUserIndex + 1);
        setCurrentStoryIndex(0);
        setProgress(0);
      } else {
        // If we're at the last story of the last user, close the modal
        storyModal.onClose();
      }
    }
  }, [currentUserStories, currentStoryIndex, storyModal.currentUserIndex, storyModal.userStories.length, storyModal.onClose]);

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

  // Progress timer effect
  useEffect(() => {
    if (!currentStory || isPaused) return;

    let interval: NodeJS.Timeout;
    let startTime = Date.now();

    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / 10000) * 100, 100);
      
      if (newProgress >= 100) {
        clearInterval(interval);
        progressToNextStory();
      } else {
        setProgress(newProgress);
      }
    };

    // Initial progress update
    updateProgress();

    // Set up interval for smooth progress updates
    interval = setInterval(updateProgress, 50);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [currentStory?.id, isPaused, progressToNextStory]);

  // Update isLiked when currentStory changes
  useEffect(() => {
    if (currentStory && session?.user?.id) {
      setIsLiked(currentStory.likes.some((like: StoryLike) => like.user.id === session.user.id));
    }
  }, [currentStory, session?.user?.id]);

  // Function to fetch stories
  const fetchStories = async () => {
    if (!storyModal.userId || showViewersList) return;
    
    // Prevent fetching too frequently
    const now = Date.now();
    if (now - lastFetchRef.current < 15000) return;
    lastFetchRef.current = now;

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/stories?userId=${storyModal.userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch stories');
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to load stories");
      }

      setStories((prevStories: Story[]) => {
        // Only update if there are actual changes
        const newStories = data.data;
        // Sort stories by createdAt in ascending order (oldest first)
        newStories.sort((a: Story, b: Story) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        // If the current story exists in both arrays, preserve its state
        const currentStoryId = currentStory?.id;
        if (currentStoryId) {
          const currentStoryInPrev = prevStories.find((s: Story) => s.id === currentStoryId);
          const currentStoryInNew = newStories.find((s: Story) => s.id === currentStoryId);
          if (currentStoryInPrev && currentStoryInNew) {
            // Preserve the current story's state
            const updatedNewStories = newStories.map((story: Story) => 
              story.id === currentStoryId ? currentStoryInPrev : story
            );
            return JSON.stringify(prevStories) === JSON.stringify(updatedNewStories) 
              ? prevStories 
              : updatedNewStories;
          }
        }

        return JSON.stringify(prevStories) === JSON.stringify(newStories) 
          ? prevStories 
          : newStories;
      });
    } catch (error) {
      console.error("Error fetching stories:", error);
      setError(error instanceof Error ? error.message : "Failed to load stories");
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch and setup polling
  useEffect(() => {
    if (!mount) return;
    
    let pollInterval: NodeJS.Timeout | null = null;
    let pollTimeout: NodeJS.Timeout | null = null;
    
    if (storyModal.isOpen) {
      // Initial fetch
      fetchStories();

      // Only set up polling if viewers list is not open
      if (!showViewersList) {
        // Debounced polling function
        const debouncedPoll = () => {
          if (pollTimeout) clearTimeout(pollTimeout);
          pollTimeout = setTimeout(() => {
            fetchStories();
            pollInterval = setTimeout(debouncedPoll, 15000);
          }, 1000); // 1 second debounce
        };

        pollInterval = setTimeout(debouncedPoll, 15000);
      }
    } else {
      // Reset state when modal closes
      setStories([]);
      setCurrentStoryIndex(0);
      setError(null);
      setShowViewersList(false);
      lastFetchRef.current = 0;
    }

    // Cleanup function
    return () => {
      if (pollInterval) {
        clearTimeout(pollInterval);
        pollInterval = null;
      }
      if (pollTimeout) {
        clearTimeout(pollTimeout);
        pollTimeout = null;
      }
    };
  }, [storyModal.isOpen, storyModal.userId, mount, showViewersList]);

  // Socket.io effect for real-time likes
  useEffect(() => {
    if (!socket || !currentStory) return;

    const handleLikeUpdate = (data: { storyId: string; userId: string; action: 'like' | 'unlike' }) => {
      if (data.storyId === currentStory.id && data.userId !== session?.user?.id) {
        setStories((prevStories) => {
          return prevStories.map((story) => {
            if (story.id === data.storyId) {
              if (data.action === 'like') {
                // Add like if not already present
                const alreadyLiked = story.likes.some((like) => like.user.id === data.userId);
                if (!alreadyLiked) {
                  return {
                    ...story,
                    likes: [...story.likes, {
                      id: `temp-${Date.now()}`,
                      createdAt: new Date(),
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
                  likes: story.likes.filter((like) => like.user.id !== data.userId)
                };
              }
            }
            return story;
          });
        });
      }
    };

    socket.on('likeUpdate', handleLikeUpdate);
    return () => {
      socket.off('likeUpdate', handleLikeUpdate);
    };
  }, [socket, currentStory?.id, session?.user?.id]);

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
      socket.emit('likeUpdate', {
        storyId: currentStory.id,
        userId: session.user.id,
        action: newIsLiked ? 'like' : 'unlike'
      });
    } catch (error: any) {
      console.error('Error updating like:', error);
      
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

  // Function to add view with debouncing and retry logic
  const addView = useCallback(async (storyId: string) => {
    if (!storyId || !session?.user?.id) return;
    
    const maxRetries = 3;
    const timeoutDuration = 10000; // 10 seconds
    let retryCount = 0;

    const attemptAddView = async (): Promise<void> => {
      try {
        setError(null);
        const response = await axios.post('/api/stories/view', {
          storyId: storyId
        }, {
          timeout: timeoutDuration,
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.data.success) {
          throw new Error(response.data.error || 'Failed to add view');
        }

        // Update stories state with new view
        setStories((prevStories) => {
          return prevStories.map((story) => {
            if (story.id === storyId) {
              // Check if view already exists
              const viewExists = story.views.some(view => view.user.id === session?.user?.id);
              if (viewExists) return story;

              // Add new view
              return {
                ...story,
                views: [...story.views, {
                  id: response.data.data.id,
                  createdAt: new Date(),
                  user: {
                    id: session.user!.id,
                    username: session.user!.username || '',
                    name: session.user!.name || null,
                    image: session.user!.image || null
                  }
                }]
              };
            }
            return story;
          });
        });
      } catch (error: any) {
        console.error('Error adding view:', error);
        
        // If it's a timeout error and we haven't exceeded max retries
        if (error.code === 'ECONNABORTED' && retryCount < maxRetries) {
          retryCount++;
          console.log(`Retrying view addition (attempt ${retryCount}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
          return attemptAddView();
        }

        // Handle specific error cases
        if (error.response?.status === 404) {
          // Story not found/expired, progress to next story
          progressToNextStory();
        } else if (error.response?.status === 500) {
          console.error('Critical error adding view:', error.response?.data?.error);
          toast.error('Failed to record view');
        }
        // For network errors or timeouts after retries, log but don't disrupt user experience
        else if (error.code === 'ECONNABORTED') {
          console.error('View tracking timed out after retries');
          toast.error('Failed to record view due to timeout');
        }
      }
    };

    await attemptAddView();
  }, [session?.user?.id, progressToNextStory]);

  // Effect to handle story view with debouncing
  useEffect(() => {
    if (!currentStory || !session?.user?.id || isPaused) return;

    let timeoutId: NodeJS.Timeout;
    const debounceTime = 2000; // 2 second debounce to prevent rapid requests

    const debouncedAddView = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        addView(currentStory.id);
      }, debounceTime);
    };

    debouncedAddView();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [currentStory?.id, session?.user?.id, isPaused, addView]);

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
        // Remove the current user from userStories
        const updatedUserStories = storyModal.userStories.filter(
          (_, index) => index !== storyModal.currentUserIndex
        );
        storyModal.setUserStories(updatedUserStories);
        
        // If there are no more users with stories, close the modal
        if (updatedUserStories.length === 0) {
          storyModal.onClose();
          return;
        }
        
        // Move to the next user's stories
        if (storyModal.currentUserIndex >= updatedUserStories.length) {
          storyModal.setCurrentUserIndex(updatedUserStories.length - 1);
        }
        setCurrentStoryIndex(0);
      } else {
        // Update the current user's stories
        const updatedUserStories = [...storyModal.userStories];
        updatedUserStories[storyModal.currentUserIndex] = {
          ...currentUserStories,
          stories: updatedStories
        };
        storyModal.setUserStories(updatedUserStories);
        
        // If we're at the last story, move to the previous one
        if (currentStoryIndex >= updatedStories.length) {
          setCurrentStoryIndex(updatedStories.length - 1);
        }
      }
      
      toast.success('Story deleted successfully');
    } catch (error) {
      toast.error('Failed to delete story');
    }
  };

  const handleReportStory = async () => {
    toast.success('Story reported');
  };

  const sortedViewers = currentStory ? [...currentStory.views].sort((a: StoryView, b: StoryView) => {
    const aLiked = currentStory.likes.some((like: StoryLike) => like.user.id === a.user.id);
    const bLiked = currentStory.likes.some((like: StoryLike) => like.user.id === b.user.id);
    if (aLiked && !bLiked) return -1;
    if (!aLiked && bLiked) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }) : [];

  if (!mount) return null;

  return (
    <>
      <Dialog open={storyModal.isOpen} onOpenChange={storyModal.onClose}>
        <DialogContentWithoutClose 
          className="max-w-4xl p-0 h-[calc(100vh-2rem)] overflow-hidden bg-black"
          aria-describedby="story-modal-description"
        >
          <DialogTitle className="sr-only">Story Viewer</DialogTitle>
          <div id="story-modal-description" className="sr-only">
            View and interact with stories from {currentStory?.user.username}
          </div>
          {isLoading ? (
            <div className="h-full w-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
            </div>
          ) : error ? (
            <div className="h-full w-full flex items-center justify-center text-white">
              <p>{error}</p>
            </div>
          ) : !currentStory ? (
            <div className="h-full w-full flex items-center justify-center text-white">
              <p>No stories available</p>
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
                  <span className="text-white font-semibold">
                    {currentStory.user.username}
                  </span>
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
                      {session?.user?.id === currentStory.user.id ? (
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
                      <span>{currentStory.views.length} views</span>
                      {currentStory.views.length > 0 && (
                        <div className="flex -space-x-2">
                          {currentStory.views.slice(0, 3).map((view: StoryView) => (
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
                      <div className="absolute left-0 bottom-full mb-2 w-72 bg-black/90 rounded-lg overflow-hidden border border-neutral-700">
                        <div className="p-4 border-b border-neutral-700">
                          <h4 className="font-semibold text-white">Story views · {currentStory.views.length}</h4>
                        </div>
                        <ScrollArea className="h-[300px]">
                          <div className="p-4 space-y-4">
                            {sortedViewers.map((view: StoryView) => (
                              <ViewerListItem
                                key={view.id}
                                user={view.user}
                                hasLiked={currentStory.likes.some((like: StoryLike) => like.user.id === view.user.id)}
                              />
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Like button */}
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
            </div>
          )}
        </DialogContentWithoutClose>
      </Dialog>
    </>
  );
} 