"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useStoryModal } from "@/hooks/use-story-modal";
import useMount from "@/hooks/useMount";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { formatDistanceToNow } from "date-fns";
import UserAvatar from "../UserAvatar";
import Link from "next/link";
import Stories from "react-insta-stories";
import { Eye, Heart, MoreHorizontal, X, Trash, Flag, Pause } from "lucide-react";
import { useSession } from "next-auth/react";
import StoryViewersModal from "./StoryViewersModal";
import ReportStoryModal from "./ReportStoryModal";
import { useStoryDeletion } from "@/hooks/use-story-deletion";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getSocket } from "@/lib/socket";
import { Story, StoryView, StoryLike } from "@/lib/definitions";

interface StoryUser {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
}

interface StoryConfig {
  url: string;
  type: 'video' | 'image';
  duration: number;
}

interface StoryViewer {
  id: string;
  user: {
    id: string;
    username: string;
    name: string | null;
    image: string | null;
  };
  createdAt: Date;
  liked: boolean;
}

export default function StoryModal() {
  const storyModal = useStoryModal();
  const mount = useMount();
  const [storiesConfig, setStoriesConfig] = useState<StoryConfig[]>([]);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const isMounted = useRef(true);
  const { data: session } = useSession();
  const [likedStories, setLikedStories] = useState<Set<string>>(new Set());
  const [viewsCount, setViewsCount] = useState(0);
  const [likesCount, setLikesCount] = useState(0);
  const [showViewers, setShowViewers] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isStoriesInitialized, setIsStoriesInitialized] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportStoryData, setReportStoryData] = useState<{id: string; username: string} | null>(null);
  const socket = getSocket();
  const [isPaused, setIsPaused] = useState(false);

  // Add a new ref to track already viewed stories in the current session
  const viewedStoriesInSession = useRef(new Set());
  const lastFetchRef = useRef<number>(0);

  const currentUserStories = storyModal.userStories[storyModal.currentUserIndex];
  const currentStory = currentUserStories?.stories[currentStoryIndex];

  // Add new state for tracking viewed stories
  const [viewedStoryIds, setViewedStoryIds] = useState(new Set<string>());

  // Add function to handle all stories end
  const handleAllStoriesEnd = useCallback(async () => {
    // Get the next user index
    const nextUserIndex = storyModal.currentUserIndex + 1;
    
    // If there are more users with stories
    if (nextUserIndex < storyModal.userStories.length) {
      // Get the next user's stories
      const nextUserStories = storyModal.userStories[nextUserIndex];
      
      // Check if the next user has unviewed stories
      try {
        const response = await fetch(`/api/stories/view?userId=${nextUserStories.userId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && !data.viewed) {
            // If there are unviewed stories, show them
            storyModal.setCurrentUserIndex(nextUserIndex);
            setCurrentStoryIndex(0);
            setIsStoriesInitialized(false);
            return;
          }
        }
      } catch (error) {
        console.error('Error checking story view status:', error);
      }
    }
    
    // If no more users with unviewed stories, close the modal
    storyModal.onClose();
  }, [storyModal]);

  // Track viewers modal state
  const [showViewersModal, setShowViewersModal] = useState(false);

  // Update socket event handling
  useEffect(() => {
    if (!socket || !currentStory || !session?.user?.id || !currentUserStories) {
      return;
    }

    // Record view in database and emit socket event
    const recordView = async () => {
      if (!viewedStoryIds.has(currentStory.id)) {
        try {
          // Get all unviewed story IDs from the current user's stories
          const unviewedStoryIds = (currentUserStories.stories as any[])
            .filter(story => !viewedStoryIds.has(story.id))
            .map(story => story.id);

          if (unviewedStoryIds.length > 0) {
            const response = await fetch('/api/stories/view', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ storyIds: unviewedStoryIds }),
            });

            if (response.ok) {
              // Update local state
              const newViewedStoryIds = new Set(viewedStoryIds);
              unviewedStoryIds.forEach(id => newViewedStoryIds.add(id));
              setViewedStoryIds(newViewedStoryIds);
              setViewsCount(prev => prev + 1);
              
              // Emit socket event for real-time updates
              if (socket) {
                socket.emit('storyView', {
                  userId: currentStory.user.id,
                  storyId: currentStory.id,
                  viewerId: session.user.id
                });
              }

              // Dispatch appropriate event for story ring updates
              if (currentStory.user.id === session.user.id) {
                window.dispatchEvent(new CustomEvent('ownStoriesViewed'));
              } else {
                window.dispatchEvent(new CustomEvent('otherStoriesViewed', {
                  detail: {
                    userId: currentStory.user.id
                  }
                }));
              }

              // Store viewed state in localStorage
              try {
                const storageKey = `story_viewed_${currentStory.user.id}_${session.user.id}`;
                localStorage.setItem(storageKey, 'true');
              } catch (error) {
                console.error('Error storing view state:', error);
              }
            }
          }
        } catch (error) {
          console.error('Error recording story view:', error);
        }
      }
    };

    recordView();

    const handleStoryViewUpdate = async (data: { storyId: string; userId: string; viewerId: string }) => {
      if (data.storyId === currentStory.id) {
        setViewsCount(prev => prev + 1);
        
        // Fetch updated story data
        const updatedResponse = await fetch(`/api/user-stories/${currentStory.user.id}`);
        const updatedData = await updatedResponse.json();
            
        if (updatedData.success && updatedData.data) {
          storyModal.setUserStories(prevStories => {
            const updatedStories = [...prevStories];
            const userIndex = updatedStories.findIndex(s => s.userId === currentStory.user.id);
            if (userIndex !== -1) {
              updatedStories[userIndex] = {
                ...updatedStories[userIndex],
                stories: updatedData.data
              };
            }
            return updatedStories;
          });
        }
      }
    };

    socket.off('storyViewUpdate');
    socket.on('storyViewUpdate', handleStoryViewUpdate);

    return () => {
      socket.off('storyViewUpdate', handleStoryViewUpdate);
    };
  }, [socket, currentStory, session?.user?.id, storyModal, currentUserStories, viewedStoryIds]);

  // Update story metadata (views, likes) when story changes
  useEffect(() => {
    if (!currentStory?.id || !session?.user?.id) return;

    const views = currentStory.views || [];
    const likes = currentStory.likes || [];

    // Only count views from other users
    const filteredViews = views.filter(view => view.user.id !== currentStory.user.id);
    setViewsCount(filteredViews.length);
    setLikesCount(likes.length);
    
    // Update liked stories set
    setLikedStories(prev => {
      const newSet = new Set(prev);
      if (likes.some(like => like.user.id === session.user.id)) {
        newSet.add(currentStory.id);
      } else {
        newSet.delete(currentStory.id);
      }
      return newSet;
    });
  }, [currentStory?.id, currentStory?.views, currentStory?.likes, session?.user?.id]);

  // Initialize stories only once when modal opens
  useEffect(() => {
    if (storyModal.isOpen && !isStoriesInitialized && currentUserStories?.stories) {
      // Sort stories by createdAt in ascending order (oldest first)
      const sortedStories = [...currentUserStories.stories].sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      const config: StoryConfig[] = sortedStories.map((story) => ({
        url: story.fileUrl.startsWith('http') || story.fileUrl.startsWith('//')
          ? story.fileUrl
          : `/uploads/${story.fileUrl.split('/uploads/')[1] || story.fileUrl}`,
        type: story.fileUrl.match(/\.(mp4|webm|ogg)$/i) ? 'video' : 'image',
        duration: 5000
      }));

      setStoriesConfig(config);
      setIsStoriesInitialized(true);
    }
  }, [storyModal.isOpen, currentUserStories?.stories, isStoriesInitialized]);

  // Reset initialization when modal closes
  useEffect(() => {
    if (!storyModal.isOpen) {
      setIsStoriesInitialized(false);
      setStoriesConfig([]);
      setCurrentStoryIndex(0);
      viewedStoriesInSession.current.clear();
    }
  }, [storyModal.isOpen]);

  // Handle like/unlike
  const handleLike = async () => {
    if (!currentStory || !session?.user?.id) return;

    try {
      const response = await fetch('/api/stories/like', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storyId: currentStory.id,
          action: likedStories.has(currentStory.id) ? 'unlike' : 'like'
        }),
      });

      if (response.ok) {
        setLikedStories(prev => {
          const newSet = new Set(prev);
          if (likedStories.has(currentStory.id)) {
            newSet.delete(currentStory.id);
            setLikesCount(prev => prev - 1);
          } else {
            newSet.add(currentStory.id);
            setLikesCount(prev => prev + 1);
          }
          return newSet;
        });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  // Update handleClose to ensure all stories are marked as viewed
  const handleClose = useCallback(() => {
    if (!isMounted.current) return;
    
    if (currentStory && session?.user?.id) {
      // Dispatch appropriate events
      if (currentStory.user.id === session?.user?.id) {
        window.dispatchEvent(new CustomEvent('ownStoriesViewed'));
      } else {
        window.dispatchEvent(new CustomEvent('otherStoriesViewed', {
          detail: {
            userId: currentStory.user.id
          }
        }));
      }
    }
    
    storyModal.onClose();
  }, [currentStory, session?.user?.id, storyModal]);

  // Record story view
  useEffect(() => {
    if (!currentStory?.id || !session?.user?.id || viewedStoryIds.has(currentStory.id)) return;

    const recordView = async () => {
      try {
        const response = await fetch('/api/stories/view', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            storyIds: [currentStory.id]
          }),
        });

        if (response.ok) {
          // Update local state
          const newViewedStoryIds = new Set(viewedStoryIds);
          newViewedStoryIds.add(currentStory.id);
          setViewedStoryIds(newViewedStoryIds);
          setViewsCount(prev => prev + 1);
          
          // Emit socket event for real-time updates
          if (socket) {
            socket.emit('storyView', {
              userId: currentStory.user.id,
              storyId: currentStory.id,
              viewerId: session.user.id
            });
          }

          // Dispatch appropriate event for story ring updates
          if (currentStory.user.id === session.user.id) {
            window.dispatchEvent(new CustomEvent('ownStoriesViewed'));
          } else {
            window.dispatchEvent(new CustomEvent('otherStoriesViewed', {
              detail: {
                userId: currentStory.user.id
              }
            }));
          }

          // Store viewed state in localStorage
          try {
            const storageKey = `story_viewed_${currentStory.user.id}_${session.user.id}`;
            localStorage.setItem(storageKey, 'true');
          } catch (error) {
            console.error('Error storing view state:', error);
          }
        }
      } catch (error) {
        console.error('Error recording story view:', error);
      }
    };

    recordView();
  }, [currentStory?.id, session?.user?.id, socket, viewedStoryIds]);

  // Prepare viewers data for the modal, excluding the story owner
  const viewers = useMemo<StoryViewer[]>(() => {
    if (!currentStory?.id || !currentStory?.user?.id) {
      return [];
    }

    const views = currentStory.views || [];
    
    const filteredViewers = views
      .filter(view => {
        if (!view?.user?.id) {
          return false;
        }
        const isOwner = view.user.id === currentStory.user.id;
        return !isOwner && !!view.user.username;
      })
      .map(view => ({
        id: view.id,
        user: {
          id: view.user.id,
          username: view.user.username || '',
          name: view.user.name,
          image: view.user.image
        },
        createdAt: view.createdAt,
        liked: currentStory.likes?.some(like => like.user.id === view.user.id) || false
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return filteredViewers;
  }, [currentStory?.id, currentStory?.views, currentStory?.likes, currentStory?.user?.id]);

  // Handle story deletion
  const handleDelete = async () => {
    if (!currentStory || !session?.user?.id) return;

    try {
      // Optimistically update the UI
      const currentUserIndex = storyModal.userStories.findIndex(s => s.userId === currentStory.user.id);
      if (currentUserIndex !== -1) {
        storyModal.setUserStories(prevStories => {
          const updatedStories = [...prevStories];
          const userStories = updatedStories[currentUserIndex];
          if (userStories) {
            // Remove the deleted story
            const updatedUserStories = {
              ...userStories,
              stories: userStories.stories.filter(s => s.id !== currentStory.id)
            };
            updatedStories[currentUserIndex] = updatedUserStories;

            // Update storiesConfig to reflect the deletion
            const updatedStoriesConfig = storiesConfig.filter((_, index) => index !== currentUserIndex);
            setStoriesConfig(updatedStoriesConfig);

            // If no more stories, close the modal and update UI
            if (updatedUserStories.stories.length === 0) {
              window.dispatchEvent(new CustomEvent('storyDeleted', {
                detail: {
                  userId: currentStory.user.id,
                  storyId: currentStory.id,
                  remainingStoriesCount: 0
                }
              }));
              storyModal.onClose();
            } else if (currentUserIndex >= updatedUserStories.stories.length) {
              setCurrentStoryIndex(updatedUserStories.stories.length - 1);
            }
          }
          return updatedStories;
        });
      }

      console.log(`[STORY_RING] Deleting story - StoryID: ${currentStory.id}`);
      const response = await fetch(`/api/stories/${currentStory.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        // Revert optimistic update if the API call fails
        const updatedResponse = await fetch(`/api/user-stories/${currentStory.user.id}`);
        const { success, data: updatedData } = await updatedResponse.json();
        
        if (success && updatedData) {
          storyModal.setUserStories(prevStories => {
            const updatedStories = [...prevStories];
            const userIndex = updatedStories.findIndex(s => s.userId === currentStory.user.id);
            if (userIndex !== -1) {
              updatedStories[userIndex] = {
                ...updatedStories[userIndex],
                stories: updatedData
              };
            }
            return updatedStories;
          });

          // Revert storiesConfig
          const config: StoryConfig[] = updatedData.map((story: any) => ({
            url: story.fileUrl.startsWith('http') || story.fileUrl.startsWith('//')
              ? story.fileUrl
              : `/uploads/${story.fileUrl.split('/uploads/')[1] || story.fileUrl}`,
            type: story.fileUrl.match(/\.(mp4|webm|ogg)$/i) ? 'video' : 'image',
            duration: 5000
          }));
          setStoriesConfig(config);
        }
        throw new Error(data.error || 'Failed to delete story');
      }

      // Show success message
      toast.success('Story deleted successfully');
    } catch (error) {
      console.error('[STORY_RING] Error deleting story:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete story');
    }
  };

  // Handle story report
  const handleReport = () => {
    if (!currentStory || !session?.user?.id) return;
    
    // Store story information before closing the modal
    setReportStoryData({
      id: currentStory.id,
      username: currentStory.user.username
    });
    
    // Close dropdown menu
    setIsDropdownOpen(false);
    
    // Close the story modal
    storyModal.onClose();
    
    // Show the report modal
    setShowReportModal(true);
  };

  // Handle opening viewers modal
  const handleViewersClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPaused(true); // Pause the story when opening viewers modal
    setShowViewersModal(true);
  };

  // Handle closing viewers modal
  const handleCloseViewers = () => {
    setShowViewersModal(false);
    setIsPaused(false); // Resume the story when closing viewers modal
  };

  if (!mount) return null;

  return (
    <>
      <Dialog open={storyModal.isOpen} onOpenChange={handleClose}>
        <DialogContent 
          className="max-w-4xl h-[calc(100vh-2rem)] p-0 overflow-hidden bg-black border-none [&>button]:hidden"
          style={{ backgroundColor: '#000000' }}
          aria-describedby="story-modal-description"
        >
          <div id="story-modal-description" className="sr-only">
            Story viewer modal with navigation and interaction controls
          </div>
          {!currentStory ? (
            <div className="h-full w-full flex items-center justify-center bg-black">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
            </div>
          ) : (
            <div className="w-full h-full flex flex-col bg-black" style={{ backgroundColor: '#000000' }}>
              {/* Header */}
              <div className="header flex-none p-4 bg-black flex justify-between items-center z-10">
                <Link 
                  href={`/dashboard/${currentStory.user.username}`}
                  className="flex items-center gap-3"
                  onClick={() => storyModal.onClose()}
                >
                  <UserAvatar 
                    user={currentStory.user}
                    className="h-8 w-8"
                  />
                  <div className="flex flex-col">
                    <span className="text-white font-semibold">{currentStory.user.username}</span>
                    <span className="text-white/70 text-sm">
                      {formatDistanceToNow(new Date(currentStory.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </Link>

                <div className="flex items-center gap-2">
                  <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                    <DropdownMenuTrigger asChild>
                      <button className="p-2 hover:bg-white/10 rounded-full transition">
                        <MoreHorizontal className="h-6 w-6 text-white" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      {currentStory.user.id === session?.user?.id ? (
                        <>
                          <DropdownMenuItem onClick={() => {
                            handleDelete();
                            setIsDropdownOpen(false);
                          }} className="text-red-500">
                            <Trash className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setIsDropdownOpen(false)}>
                            <X className="h-4 w-4 mr-2" />
                            Close
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <>
                          <DropdownMenuItem onClick={handleReport} className="text-red-500">
                            <Flag className="h-4 w-4 mr-2" />
                            Report
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setIsDropdownOpen(false)}>
                            <X className="h-4 w-4 mr-2" />
                            Close
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <button 
                    onClick={() => storyModal.onClose()}
                    className="p-2 hover:bg-white/10 rounded-full transition"
                  >
                    <X className="h-6 w-6 text-white" />
                  </button>
                </div>
              </div>

              {/* Stories Container */}
              <div className="flex-1 relative story-content-area overflow-hidden">
                {isStoriesInitialized && (
                  <Stories
                    stories={storiesConfig}
                    defaultInterval={5000}
                    width="100%"
                    height="100%"
                    isPaused={isPaused}
                    onAllStoriesEnd={handleAllStoriesEnd}
                    onStoryStart={(index: number) => {
                      setCurrentStoryIndex(index);
                    }}
                    storyContainerStyles={{
                      display: 'flex',
                      flexDirection: 'column',
                      background: '#000000',
                      position: 'relative',
                      userSelect: 'none',
                      width: '100%',
                      height: '100%',
                      overflow: 'hidden'
                    }}
                    storyStyles={{
                      width: '100%',
                      height: '100%',
                      maxWidth: '100%',
                      maxHeight: '100%',
                      margin: 'auto',
                      objectFit: 'contain',
                      backgroundColor: '#000000',
                      overflow: 'hidden'
                    }}
                  />
                )}
              </div>

              {/* Footer */}
              <div className="footer flex-none p-4 bg-black/50 backdrop-blur-sm flex items-center justify-between z-10">
                <div>
                  {currentStory?.user?.id === session?.user?.id && (
                    <button
                      onClick={handleViewersClick}
                      className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                    >
                      <Eye className="h-6 w-6 text-white" />
                      <span className="text-white text-sm">{viewsCount}</span>
                    </button>
                  )}
                </div>
                <div>
                  {currentStory?.user?.id !== session?.user?.id && (
                    <button
                      onClick={handleLike}
                      className="hover:opacity-80 transition-opacity"
                    >
                      {likedStories.has(currentStory.id) ? (
                        <Heart className="h-6 w-6 text-red-500 fill-red-500" />
                      ) : (
                        <Heart className="h-6 w-6 text-white" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Viewers Modal */}
      <StoryViewersModal
        isOpen={showViewersModal}
        onClose={handleCloseViewers}
        viewers={viewers}
      />
      
      {reportStoryData && (
        <ReportStoryModal
          isOpen={showReportModal}
          onClose={() => {
            setShowReportModal(false);
            setReportStoryData(null);
          }}
          storyId={reportStoryData.id}
          username={reportStoryData.username}
        />
      )}
    </>
  );
}