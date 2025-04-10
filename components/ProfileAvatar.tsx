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
      
      console.log("[ProfileAvatar] Initializing viewed stories:", {
        storageKey,
        storedViewedStories,
        stories: stories.map(s => ({ id: s.id, createdAt: s.createdAt }))
      });

      if (storedViewedStories) {
        try {
          const parsedViewedStories = JSON.parse(storedViewedStories);
          console.log("[ProfileAvatar] Setting viewed stories from localStorage:", parsedViewedStories);
          setViewedStories(parsedViewedStories);
        } catch (error) {
          console.error("Error parsing viewed stories:", error);
          setViewedStories({});
        }
      }
    }
  }, [session?.user?.id, user.id, stories]);

  // Listen for story viewed events
  useEffect(() => {
    const handleStoryViewed = (event: CustomEvent) => {
      if (event.detail.userId === user.id && session?.user?.id) {
        const storageKey = `viewed_stories_${user.id}_${session.user.id}`;
        const viewedStories = event.detail.viewedStories || {};
        
        console.log("[ProfileAvatar] Story viewed event:", {
          userId: event.detail.userId,
          storyId: event.detail.storyId,
          viewerId: event.detail.viewerId,
          viewedStories,
          isOwnStory: event.detail.isOwnStory
        });
        
        // If it's the user's own story, update the last viewed timestamp
        if (event.detail.isOwnStory) {
          const lastViewedKey = `last_viewed_own_stories_${session.user.id}`;
          localStorage.setItem(lastViewedKey, new Date().toISOString());
        }
        
        // Make sure to update the state with the new viewed stories
        setViewedStories(prevStories => {
          const newStories = { ...prevStories, ...viewedStories };
          console.log("[ProfileAvatar] Updating viewed stories:", {
            prevStories,
            newStories
          });
          localStorage.setItem(storageKey, JSON.stringify(newStories));
          return newStories;
        });
        
        // Force a re-render to update the story ring color
        setTimeout(() => {
          setViewedStories(prevStories => ({...prevStories}));
        }, 100);
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
      
      console.log("[ProfileAvatar] Story modal close:", {
        storageKey,
        storedViewedStories,
        viewedStories,
        stories: stories.map(s => ({ id: s.id, createdAt: s.createdAt }))
      });
      
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
        console.log("[ProfileAvatar] Updating viewed stories on modal close:", {
          viewedStories
        });
        
        // Update the state with the new viewed stories
        setViewedStories(prevStories => {
          const newStories = { ...prevStories, ...viewedStories };
          localStorage.setItem(storageKey, JSON.stringify(newStories));
          return newStories;
        });
        
        // Force a re-render to update the story ring color
        setTimeout(() => {
          setViewedStories(prevStories => ({...prevStories}));
        }, 100);
      }
    };

    window.addEventListener('storyModalClose', handleStoryModalClose);
    
    return () => {
      window.removeEventListener('storyModalClose', handleStoryModalClose);
    };
  }, [stories, session?.user?.id, user?.id]);

  // Update viewed stories state when component mounts
  useEffect(() => {
    if (session?.user?.id && user.id && stories.length > 0) {
      const storageKey = `viewed_stories_${user.id}_${session.user.id}`;
      const storedViewedStories = localStorage.getItem(storageKey);
      
      if (storedViewedStories) {
        try {
          const parsedViewedStories = JSON.parse(storedViewedStories);
          
          // Check if all stories are marked as viewed
          const allStoriesViewed = stories.every(story => parsedViewedStories[story.id] === true);
          
          if (allStoriesViewed) {
            console.log("[ProfileAvatar] All stories are viewed, updating state");
            setViewedStories(parsedViewedStories);
          }
        } catch (error) {
          console.error("Error parsing viewed stories:", error);
        }
      }
    }
  }, [session?.user?.id, user.id, stories]);

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
    
    // For others' stories, check if this story has been viewed in localStorage
    if (typeof window !== 'undefined' && session?.user?.id) {
      const storageKey = `viewed_stories_${story.user.id}_${session.user.id}`;
      const storedViewedStories = localStorage.getItem(storageKey);
      
      // If there's no stored data, assume the story is unviewed
      if (!storedViewedStories) {
        console.log("[ProfileAvatar] No stored viewed stories for:", {
          storyId: story.id,
          storageKey
        });
        return true;
      }
      
      try {
        const viewedStories = JSON.parse(storedViewedStories);
        
        // Check if the story has been viewed
        const hasBeenViewed = viewedStories[story.id] === true;
        
        console.log("[ProfileAvatar] Checking story:", {
          storyId: story.id,
          storageKey,
          viewedStories,
          hasBeenViewed
        });
        
        // If the story has been viewed, it's not unviewed
        if (hasBeenViewed) {
          return false;
        }
        
        // If the story is not in viewedStories, it's unviewed
        return true;
      } catch (error) {
        console.error("Error parsing viewed stories:", error);
        return true; // If there's an error, assume the story is unviewed
      }
    }
    return true; // During SSR, assume stories are unviewed
  });

  // Show story ring only if:
  // 1. It's the current user's profile, or
  // 2. The profile is public and has stories, or
  // 3. The profile is private but the current user is following them
  const shouldShowStoryRing = isCurrentUser || (!user.isPrivate && hasStories) || (user.isPrivate && user.followers?.some(follow => follow.followerId === session?.user?.id && follow.status === "ACCEPTED") && hasStories);

  console.log("[ProfileAvatar] Story ring state:", {
    isCurrentUser,
    isPrivate: user.isPrivate,
    hasStories,
    hasUnviewedStories,
    shouldShowStoryRing,
    viewedStories
  });

  // Update local stories when prop changes
  useEffect(() => {
    setStories(initialStories);
  }, [initialStories]);

  const handleProfileClick = () => {
    const isFollowing = user.followers?.some(follow => follow.followerId === session?.user?.id && follow.status === "ACCEPTED");
    
    // Check if we should allow story access based on the same conditions as shouldShowStoryRing
    const canAccessStories = isCurrentUser || (!user.isPrivate && hasStories) || (user.isPrivate && isFollowing && hasStories);
    
    if (canAccessStories) {
      // Show the options modal instead of directly opening the story
      setShowOptionsModal(true);
    } else if (isCurrentUser) {
      editProfileModal.onOpen();
    }
  };

  const handleViewStory = async () => {
    try {
      console.log("[ProfileAvatar] Fetching stories for user:", user.id);
      const response = await fetch(`/api/stories?userId=${user.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch story');
      }
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch stories');
      }
      
      console.log("[ProfileAvatar] Stories fetched successfully:", {
        count: data.data.length,
        stories: data.data.map((s: any) => ({ id: s.id, createdAt: s.createdAt }))
      });
      
      // Format the stories to match the expected format
      const formattedStories = data.data.map((story: any) => ({
        id: story.id,
        fileUrl: story.fileUrl,
        createdAt: new Date(story.createdAt),
        scale: story.scale || 1,
        user_id: story.user_id,
        user: {
          id: story.user.id,
          username: story.user.username,
          name: null,
          image: story.user.image,
          verified: story.user.verified,
          isPrivate: false,
          role: 'USER' as UserRole,
          status: 'ACTIVE' as UserStatus,
        },
        views: story.views || [],
        likes: story.likes || [],
      }));
      
      // Set the stories in the state
      setStories(formattedStories);
      
      // Set the user ID and open the story modal
      storyModal.setUserId(user.id);
      storyModal.setUserStories([{
        userId: user.id,
        stories: formattedStories
      }]);
      storyModal.setCurrentUserIndex(0);
      storyModal.onOpen();
      
      console.log("[ProfileAvatar] Story modal opened with:", {
        userId: user.id,
        storiesCount: formattedStories.length
      });
    } catch (error) {
      console.error('Error fetching story:', error);
      toast.error('Failed to load story');
    }
  };

  if (!mount) return null;

  return (
    <div className="relative">
      <div
        className={cn(
          "relative cursor-pointer",
          shouldShowStoryRing && hasStories && !hasUnviewedStories && "before:absolute before:inset-0 before:rounded-full before:bg-neutral-300 dark:before:bg-neutral-700 before:p-[0.5px] before:w-[calc(100%+4px)] before:h-[calc(100%+4px)] before:-left-0.5 before:-top-0.5",
          shouldShowStoryRing && hasUnviewedStories && "before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-tr before:from-yellow-400 before:to-fuchsia-600 before:p-[0.5px] before:w-[calc(100%+4px)] before:h-[calc(100%+4px)] before:-left-0.5 before:-top-0.5"
        )}
        onClick={handleProfileClick}
        suppressHydrationWarning
      >
        <div className={cn(
          "relative rounded-full overflow-hidden",
          shouldShowStoryRing && hasStories && "p-1"
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
        onViewStory={handleViewStory}
      />
    </div>
  );
}

export default ProfileAvatar;
