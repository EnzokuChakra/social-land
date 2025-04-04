"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogContentWithoutClose,
} from "@/components/ui/dialog";
import {
  FormControl,
  FormField,
  FormItem,
} from "@/components/ui/form";
import useMount from "@/hooks/useMount";
import { updateProfile } from "@/lib/actions";
import { UserWithExtras, UserRole, UserStatus } from "@/lib/definitions";
import { UpdateUser } from "@/lib/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { useRef, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import SubmitButton from "./SubmitButton";
import UserAvatar from "./UserAvatar";
import { Form } from "./ui/form";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, X, MoreHorizontal } from "lucide-react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import { Heart } from "lucide-react";
import React from "react";
import { useStoryModal } from "@/hooks/use-story-modal";
import { useEditProfileModal } from "@/hooks/use-edit-profile-modal";
import ProfilePictureOptionsModal from "./modals/ProfilePictureOptionsModal";

interface Story {
  id: string;
  fileUrl: string;
  createdAt: Date;
  scale?: number;
  user_id: string;
  user: {
    id: string;
    username: string | null;
    name: string | null;
    image: string | null;
    verified: boolean;
    isPrivate: boolean;
    role: UserRole;
    status: UserStatus;
  };
  views?: any[];
  likes?: any[];
}

interface Props {
  user: UserWithExtras;
  children: React.ReactNode;
  stories?: Story[];
  showModal?: boolean;
}

interface ViewerListItemProps {
  user: {
    id: string;
    username: string;
    name: string | null;
    image: string | null;
  };
  hasLiked?: boolean;
}

function ViewerListItem({ user, hasLiked }: ViewerListItemProps) {
  return (
    <div className="flex items-center justify-between">
      <Link 
        href={`/dashboard/${user.username}`}
        className="flex items-center gap-2 hover:opacity-75 transition flex-1"
      >
        <Avatar className="h-10 w-10">
          <AvatarImage src={user.image || ""} alt={user.username} />
          <AvatarFallback>
            {user.username?.[0]}
          </AvatarFallback>
        </Avatar>
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

function ProfileAvatar({
  user,
  children,
  stories: initialStories = [],
  showModal = false,
}: Props) {
  const { data: session } = useSession();
  const isCurrentUser = session?.user.id === user.id;
  const mount = useMount();
  const storyModal = useStoryModal();
  const editProfileModal = useEditProfileModal();
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const router = useRouter();
  const [showProfileOptions, setShowProfileOptions] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [showViewersList, setShowViewersList] = useState(false);
  const [stories, setStories] = useState(initialStories);
  const [viewedStories, setViewedStories] = useState<Record<string, boolean>>({});

  // Initialize viewed stories from localStorage on mount
  useEffect(() => {
    if (session?.user?.id && user.id) {
      const storageKey = `viewed_stories_${user.id}_${session.user.id}`;
      const storedViewedStories = localStorage.getItem(storageKey);
      
      // Check if there are any stories newer than the last viewed timestamp
      const lastViewedKey = `last_viewed_own_stories_${session.user.id}`;
      const lastViewed = localStorage.getItem(lastViewedKey);
      const lastViewedDate = lastViewed ? new Date(lastViewed) : null;
      
      const hasNewerStories = stories.some(story => {
        const storyDate = new Date(story.createdAt);
        return !lastViewedDate || storyDate > lastViewedDate;
      });
      
      // If there are newer stories, clear the viewed state
      if (hasNewerStories) {
        localStorage.removeItem(storageKey);
        setViewedStories({});
      } else if (storedViewedStories) {
        setViewedStories(JSON.parse(storedViewedStories));
      }
    }
  }, [session?.user?.id, user.id, stories]);

  // Listen for story viewed events
  useEffect(() => {
    const handleStoryViewed = (event: CustomEvent) => {
      if (event.detail.userId === user.id && session?.user?.id) {
        const storageKey = `viewed_stories_${user.id}_${session.user.id}`;
        const viewedStories = event.detail.viewedStories || {};
        
        // If it's the user's own story, update the last viewed timestamp
        if (event.detail.isOwnStory) {
          const lastViewedKey = `last_viewed_own_stories_${session.user.id}`;
          localStorage.setItem(lastViewedKey, new Date().toISOString());
        }
        
        setViewedStories(viewedStories);
        localStorage.setItem(storageKey, JSON.stringify(viewedStories));
      }
    };

    window.addEventListener('storyViewed', handleStoryViewed as EventListener);
    
    return () => {
      window.removeEventListener('storyViewed', handleStoryViewed as EventListener);
    };
  }, [user.id, session?.user?.id, stories]);

  // Listen for story modal close and update view state
  useEffect(() => {
    const handleStoryModalClose = () => {
      if (!session?.user?.id || !user?.id) {
        return;
      }

      const storageKey = `viewed_stories_${user.id}_${session.user.id}`;
      const storedViewedStories = localStorage.getItem(storageKey);
      const viewedStories = storedViewedStories ? JSON.parse(storedViewedStories) : {};
      
      // Update viewed stories based on current stories
      let hasChanges = false;
      stories.forEach(story => {
        if (!story || !story.views) {
          return;
        }

        const isOwnStory = story.user?.id === session.user.id;
        const hasValidView = story.views.some(view => view?.user?.id === session.user.id);

        if (isOwnStory || hasValidView) {
          if (!viewedStories[story.id]) {
            viewedStories[story.id] = true;
            hasChanges = true;
          }
        }
      });
      
      if (hasChanges) {
        setViewedStories(viewedStories);
        localStorage.setItem(storageKey, JSON.stringify(viewedStories));
      }
    };

    window.addEventListener('storyModalClose', handleStoryModalClose);
    
    return () => {
      window.removeEventListener('storyModalClose', handleStoryModalClose);
    };
  }, [stories, session?.user?.id, user?.id]);

  const hasStories = stories.length > 0 && stories.some(story => {
    const storyDate = new Date(story.createdAt);
    const now = new Date();
    const diff = now.getTime() - storyDate.getTime();
    const hours = diff / (1000 * 60 * 60);
    return hours < 24;
  });

  const hasUnviewedStories = hasStories && stories.some(story => {
    if (!story || !story.user) {
      return false;
    }

    const storyDate = new Date(story.createdAt);
    const now = new Date();
    const diff = now.getTime() - storyDate.getTime();
    const hours = diff / (1000 * 60 * 60);
    
    // Only consider stories within the last 24 hours
    if (hours >= 24) {
      return false;
    }
    
    // For own stories, check if there are any new stories since last view
    const isOwnStory = story.user.id === session?.user?.id;
    if (isOwnStory) {
      // Get the last viewed timestamp from localStorage
      const lastViewedKey = `last_viewed_own_stories_${session?.user?.id}`;
      const lastViewed = localStorage.getItem(lastViewedKey);
      const lastViewedDate = lastViewed ? new Date(lastViewed) : null;
      
      // If the story is newer than the last viewed timestamp, it's unviewed
      const isUnviewed = !lastViewedDate || storyDate > lastViewedDate;
      
      // If the story is unviewed, clear any existing viewed state
      if (isUnviewed) {
        const storageKey = `viewed_stories_${story.user.id}_${session?.user?.id}`;
        localStorage.removeItem(storageKey);
      }
      
      return isUnviewed;
    }
    
    // For others' stories, check if this story has been viewed in localStorage
    const storageKey = `viewed_stories_${story.user.id}_${session?.user?.id}`;
    const storedViewedStories = localStorage.getItem(storageKey);
    const viewedStories = storedViewedStories ? JSON.parse(storedViewedStories) : {};
    
    // If the story is not in viewedStories, it's unviewed
    const isUnviewed = !viewedStories[story.id];
    
    return isUnviewed;
  });

  // Update local stories when prop changes
  useEffect(() => {
    setStories(initialStories);
  }, [initialStories]);

  const handleProfileClick = () => {
    if (hasStories) {
      const activeStories = stories.filter(story => {
        if (!story?.fileUrl) return false;
        const storyDate = new Date(story.createdAt);
        const now = new Date();
        const diff = now.getTime() - storyDate.getTime();
        const hours = diff / (1000 * 60 * 60);
        return hours < 24;
      });

      if (activeStories.length === 0) {
        if (isCurrentUser) {
          editProfileModal.onOpen();
        }
        return;
      }

      // If all stories are viewed, show the options modal instead
      if (!hasUnviewedStories) {
        setShowOptionsModal(true);
        return;
      }

      // First fetch the latest story data to ensure we have current views/likes
      const fetchStoryData = async () => {
        try {
          const response = await fetch(`/api/stories?userId=${user.id}`);
          if (!response.ok) throw new Error('Failed to fetch stories');
          
          const data = await response.json();
          if (!data.success) throw new Error(data.error || 'Failed to fetch stories');

          const formattedStories = data.data.map((story: Story) => ({
            id: story.id,
            fileUrl: story.fileUrl,
            createdAt: story.createdAt,
            scale: story.scale || 1,
            views: story.views || [],
            likes: story.likes || [],
            user: {
              id: user.id,
              username: user.username,
              name: user.name,
              image: user.image,
              verified: user.verified,
              isPrivate: user.isPrivate,
              role: user.role,
              status: user.status
            }
          }));

          const allStories = [{
            userId: user.id,
            stories: formattedStories
          }];

          storyModal.setUserStories(allStories);
          storyModal.setCurrentUserIndex(0);
          storyModal.setUserId(user.id);
          storyModal.onOpen();

          // Update viewed stories in localStorage and state
          if (typeof window !== 'undefined' && session?.user?.id) {
            const storageKey = `viewed_stories_${user.id}_${session.user.id}`;
            const newViewedStories = { ...viewedStories };
            formattedStories.forEach((story: Story) => {
              if (story.views?.some(view => view.user.id === session.user.id)) {
                newViewedStories[story.id] = true;
              }
            });
            setViewedStories(newViewedStories);
            localStorage.setItem(storageKey, JSON.stringify(newViewedStories));
          }
        } catch (error) {
          toast.error('Failed to load story');
        }
      };

      fetchStoryData();
    } else if (isCurrentUser) {
      editProfileModal.onOpen();
    }
  };

  if (!mount) return null;

  return (
    <>
      <div 
        className={cn(
          "relative cursor-pointer",
          hasStories && !hasUnviewedStories && "before:absolute before:inset-0 before:rounded-full before:bg-neutral-300 dark:before:bg-neutral-700 before:p-[0.5px] before:w-[calc(100%+4px)] before:h-[calc(100%+4px)] before:-left-0.5 before:-top-0.5",
          hasUnviewedStories && "before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-tr before:from-yellow-400 before:to-fuchsia-600 before:p-[0.5px] before:w-[calc(100%+4px)] before:h-[calc(100%+4px)] before:-left-0.5 before:-top-0.5"
        )}
        onClick={handleProfileClick}
        suppressHydrationWarning
      >
        <div className={cn(
          "relative rounded-full overflow-hidden",
          hasStories && "p-1"
        )}>
          {children}
        </div>
      </div>

      <ProfilePictureOptionsModal
        open={showOptionsModal}
        onOpenChange={setShowOptionsModal}
        hasStory={hasStories}
        userId={user.id}
        isOwnProfile={isCurrentUser}
        onViewStory={() => {
          setShowOptionsModal(false);
          const fetchStoryData = async () => {
            try {
              const response = await fetch(`/api/stories?userId=${user.id}`);
              if (!response.ok) throw new Error('Failed to fetch stories');
              
              const data = await response.json();
              if (!data.success) throw new Error(data.error || 'Failed to fetch stories');

              const formattedStories = data.data.map((story: Story) => ({
                id: story.id,
                fileUrl: story.fileUrl,
                createdAt: story.createdAt,
                scale: story.scale || 1,
                views: story.views || [],
                likes: story.likes || [],
                user: {
                  id: user.id,
                  username: user.username,
                  name: user.name,
                  image: user.image
                }
              }));

              const allStories = [{
                userId: user.id,
                stories: formattedStories
              }];

              storyModal.setUserStories(allStories);
              storyModal.setCurrentUserIndex(0);
              storyModal.setUserId(user.id);
              storyModal.onOpen();
            } catch (error) {
              toast.error('Failed to load story');
            }
          };

          fetchStoryData();
        }}
      />
    </>
  );
}

export default ProfileAvatar;
