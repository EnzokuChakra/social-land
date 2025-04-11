"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useStoryModal } from "@/hooks/use-story-modal";
import useMount from "@/hooks/useMount";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Heart, MoreHorizontal, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSocket } from "@/hooks/use-socket";
import ReportStoryModal from "./ReportStoryModal";
import UserAvatar from "../UserAvatar";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import axios from "axios";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Stories from "react-insta-stories";

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
  const [showViewersList, setShowViewersList] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [stories, setStories] = useState<Story[]>([]);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socket = useSocket();
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [storyToReport, setStoryToReport] = useState<Story | null>(null);
  const [storiesConfig, setStoriesConfig] = useState<any[]>([]);

  const currentUserStories = storyModal.userStories[storyModal.currentUserIndex];
  const currentStory = currentUserStories?.stories[0];

  const isStoryOwner = session?.user?.id === currentStory?.user.id;
  const isMasterAdmin = session?.user?.role === "MASTER_ADMIN";
  const isAdmin = session?.user?.role === "ADMIN";
  const canDelete = isStoryOwner || isMasterAdmin || isAdmin;

  // Calculate sorted viewers
  const sortedViewers = currentStory ? [...currentStory.views]
    .filter((view: StoryView) => view.user.id !== currentStory.user.id) // Exclude story owner from views
    .sort((a: StoryView, b: StoryView) => {
      const aLiked = currentStory.likes.some((like: StoryLike) => like.user.id === a.user.id);
      const bLiked = currentStory.likes.some((like: StoryLike) => like.user.id === b.user.id);
      if (aLiked && !bLiked) return -1;
      if (!aLiked && bLiked) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }) : [];

  // Update the useEffect for stories configuration
  useEffect(() => {
    if (!currentUserStories?.stories) return;

    const config = currentUserStories.stories.map((story) => ({
      url: story.fileUrl.startsWith('http') ? story.fileUrl : `https://social-land.ro${story.fileUrl.startsWith('/') ? story.fileUrl : `/${story.fileUrl}`}`,
      type: story.fileUrl.match(/\.(mp4|webm|ogg)$/i) ? 'video' : 'image',
      duration: 5000,
    }));

    setStoriesConfig(config);
  }, [currentUserStories?.stories]);

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

    // For others' stories, track view
    const trackView = async () => {
      try {
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
        }
      } catch (error) {
        setError("Failed to track story view");
      }
    };

    trackView();
  }, [currentStory?.id, session?.user?.id, socket]);

  // Handle like functionality
  const handleLike = async () => {
    if (!currentStory || !session?.user?.id || !socket) return;

    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);

    try {
      const response = await axios.post('/api/stories/like', {
        storyId: currentStory.id,
        action: newIsLiked ? 'like' : 'unlike'
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to update like');
      }

      // Emit socket event for real-time updates
      socket.emit('storyLikeUpdate', {
        storyId: currentStory.id,
        userId: session.user.id,
        action: newIsLiked ? 'like' : 'unlike'
      });
    } catch (error: any) {
      setIsLiked(!newIsLiked);
      
      if (error.response?.status === 404) {
        toast.error('Story not found or expired');
      } else if (error.response?.status === 401) {
        toast.error('You must be logged in to like stories');
      } else {
        toast.error(error.response?.data?.error || 'Failed to update like');
      }
    }
  };

  // Handle delete story
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
      } else {
        // Update the current user's stories
        const updatedUserStories = [...storyModal.userStories];
        updatedUserStories[storyModal.currentUserIndex] = {
          ...currentUserStories,
          stories: updatedStories
        };
        storyModal.setUserStories(updatedUserStories);
      }
    } catch (error) {
      toast.error('Failed to delete story');
    }
  };

  // Handle report story
  const handleReportStory = () => {
    setStoryToReport(currentStory);
    storyModal.onClose(); // Close the story modal first
    // Use setTimeout to ensure the story modal is closed before opening the report modal
    setTimeout(() => {
      setIsReportModalOpen(true);
    }, 100);
  };

  // Update isLiked when currentStory changes
  useEffect(() => {
    if (currentStory && session?.user?.id) {
      setIsLiked(currentStory.likes.some((like: StoryLike) => like.user.id === session.user.id));
    }
  }, [currentStory, session?.user?.id]);

  if (!mount) return null;

  return (
    <>
      <Dialog open={storyModal.isOpen} onOpenChange={storyModal.onClose}>
        <DialogContent 
          className="max-w-4xl h-[calc(100vh-2rem)] p-0 overflow-hidden bg-neutral-900 border-none"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">
            {currentUserStories?.stories[0]?.user.username}'s Story
          </DialogTitle>
          <DialogDescription className="sr-only">
            Story viewer showing {currentUserStories?.stories[0]?.user.username}'s content.
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
              {/* Story viewer with react-insta-stories */}
              {storiesConfig.length > 0 && (
                <div className="w-full h-full pointer-events-none">
                  <Stories
                    stories={storiesConfig}
                    defaultInterval={5000}
                    width="100%"
                    height="100%"
                    onAllStoriesEnd={() => {
                      storyModal.onClose();
                    }}
                    renderers={[
                      {
                        renderer: (props) => {
                          const { story } = props;
                          const mediaUrl = story?.url ? (story.url.startsWith('http') ? story.url : `https://social-land.ro${story.url.startsWith('/') ? story.url : `/${story.url}`}`) : '';
                          if (!mediaUrl) return null;
                          
                          return (
                            <div className="w-full h-full flex items-center justify-center">
                              {story.type === 'image' ? (
                                <img
                                  src={mediaUrl}
                                  alt="Story"
                                  className="max-h-full max-w-full object-contain"
                                  style={{ transform: `scale(${currentStory?.scale || 1})` }}
                                />
                              ) : (
                                <video
                                  src={mediaUrl}
                                  controls
                                  className="max-h-full max-w-full"
                                  style={{ transform: `scale(${currentStory?.scale || 1})` }}
                                />
                              )}
                            </div>
                          );
                        },
                        tester: (story: any) => {
                          return {
                            condition: story.type === 'image' || story.type === 'video',
                            priority: 1
                          };
                        },
                      },
                    ]}
                  />
                </div>
              )}

              {/* User info and options */}
              <div className="absolute top-8 left-4 right-4 flex items-center justify-between z-10 pointer-events-auto">
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
                  <div className="absolute bottom-4 left-4 z-10 pointer-events-auto">
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
                    "absolute bottom-4 right-4 text-white hover:text-white transition-colors z-10 pointer-events-auto",
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