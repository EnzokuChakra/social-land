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
import { useRef, useState, useEffect, useMemo, useCallback } from "react";
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
import { getSocket } from "@/lib/socket";

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
  isBlocked?: boolean;
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
  isBlocked = false,
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
  const [stories, setStories] = useState<Story[]>(initialStories);
  const [viewedStoriesMap, setViewedStoriesMap] = useState<Record<string, boolean>>({});
  const [hasServerUnviewedStories, setHasServerUnviewedStories] = useState<boolean>(true);
  const socket = getSocket();
  const [isFollowing, setIsFollowing] = useState(user.followers?.some(follow => follow.followerId === session?.user?.id && follow.status === "ACCEPTED") || false);

  // Update isFollowing state when user.followers changes
  useEffect(() => {
    const newIsFollowing = user.followers?.some(follow => follow.followerId === session?.user?.id && follow.status === "ACCEPTED") || false;
    setIsFollowing(newIsFollowing);
  }, [user.followers, session?.user?.id]);

  // Fetch story view status with debouncing
  const fetchStoryViewStatus = useCallback(async () => {
    if (!session?.user?.id || !user.id) return;

    try {
      if (isCurrentUser) {
        // For own stories, check if all stories have been viewed
        const response = await fetch('/api/stories/view?operation=own-status');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            // Only show colored ring if there are unviewed stories
            setHasServerUnviewedStories(data.hasUnviewedStories);
          }
        }
      } else {
        const unviewedStories = stories.filter(story => {
          return !story.views?.some(view => view.user_id === session.user.id);
        });
        setHasServerUnviewedStories(unviewedStories.length > 0);
      }
    } catch (error) {
      console.error('Error fetching story view status:', error);
    }
  }, [session?.user?.id, user.id, isCurrentUser, stories]);

  // Listen for story events
  useEffect(() => {
    let isMounted = true;

    const handleStoryViewed = (event: CustomEvent) => {
      if (!isMounted) return;
      if (event.detail?.userId === user.id || (!event.detail && isCurrentUser)) {
        setHasServerUnviewedStories(false);
      }
    };

    const handleStoryDeleted = (event: any) => {
      if (!isMounted) return;
      const storyData = event.detail || event;
      if (storyData.userId === user.id) {
        setStories(prev => prev.filter(story => story.id !== storyData.storyId));
      }
    };

    const handleStoryUploaded = (event: CustomEvent) => {
      if (!isMounted) return;
      if (event.detail?.story && event.detail.story.user_id === user.id) {
        setStories(prev => [event.detail.story, ...prev]);
        setHasServerUnviewedStories(true);
      }
    };

    window.addEventListener('ownStoriesViewed', handleStoryViewed as EventListener);
    window.addEventListener('otherStoriesViewed', handleStoryViewed as EventListener);
    window.addEventListener('storyDeleted', handleStoryDeleted as EventListener);
    window.addEventListener('storyUploaded', handleStoryUploaded as EventListener);

    if (socket) {
      socket.on('storyDeleted', handleStoryDeleted);
      socket.on('storyViewUpdate', (data: any) => {
        if (!isMounted) return;
        if (data.userId === user.id) {
          fetchStoryViewStatus();
        }
      });
    }

    return () => {
      isMounted = false;
      window.removeEventListener('ownStoriesViewed', handleStoryViewed as EventListener);
      window.removeEventListener('otherStoriesViewed', handleStoryViewed as EventListener);
      window.removeEventListener('storyDeleted', handleStoryDeleted as EventListener);
      window.removeEventListener('storyUploaded', handleStoryUploaded as EventListener);
      
      if (socket) {
        socket.off('storyDeleted', handleStoryDeleted);
        socket.off('storyViewUpdate');
      }
    };
  }, [user.id, socket, isCurrentUser, fetchStoryViewStatus]);

  // Listen for follow request acceptance
  useEffect(() => {
    if (!socket) return;

    const handleFollowRequestAccepted = async (data: { followingId: string; followerId: string }) => {
      if (data.followingId === user.id && data.followerId === session?.user?.id) {
        setIsFollowing(true);
        // Invalidate the profile data to update the followers list
        router.refresh();
        
        // Fetch stories for the user
        try {
          const response = await fetch(`/api/stories?userId=${user.id}`);
          if (!response.ok) {
            throw new Error('Failed to fetch story');
          }
          const data = await response.json();
          
          if (!data.success) {
            throw new Error(data.error || 'Failed to fetch stories');
          }
          
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
        } catch (error) {
          console.error('Error fetching stories after follow request accepted:', error);
        }
      }
    };

    socket.on("followRequestAccepted", handleFollowRequestAccepted);

    return () => {
      socket.off("followRequestAccepted", handleFollowRequestAccepted);
    };
  }, [socket, user.id, session?.user?.id, router]);

  // Fetch initial view status
  useEffect(() => {
    fetchStoryViewStatus();
  }, [fetchStoryViewStatus]);

  // Update local stories when prop changes
  useEffect(() => {
    setStories(initialStories);
  }, [initialStories]);

  // Check if there are valid stories (less than 24 hours old)
  const hasStories = stories.length > 0 && stories.some(story => {
    const storyDate = new Date(story.createdAt);
    const now = new Date();
    const diff = now.getTime() - storyDate.getTime();
    const hours = diff / (1000 * 60 * 60);
    return hours < 24;
  });

  // Show story ring only if:
  // 1. It's the current user's profile, or
  // 2. The profile is public and has stories, or
  // 3. The profile is private but the current user is following them
  // 4. And user is not blocked
  const shouldShowStoryRing = !isBlocked && (isCurrentUser || (!user.isPrivate && hasStories) || (user.isPrivate && isFollowing && hasStories));

  const handleProfileClick = () => {
    // If user is blocked, don't do anything on click
    if (isBlocked) return;
    
    const isFollowing = user.followers?.some(follow => follow.followerId === session?.user?.id && follow.status === "ACCEPTED");
    
    // Check if we should allow story access based on the same conditions as shouldShowStoryRing
    const canAccessStories = isCurrentUser || (!user.isPrivate && hasStories) || (user.isPrivate && isFollowing && hasStories);
    
    if (isCurrentUser) {
      // For own profile, show the options modal
      setShowOptionsModal(true);
    } else if (canAccessStories) {
      // For others' profiles, directly open the story if available
      handleViewStory();
    }
  };

  const handleViewStory = async () => {
    // If user is blocked, don't allow viewing stories
    if (isBlocked) {
      toast.error('Cannot view stories of blocked users');
      return;
    }
    
    try {
      const response = await fetch(`/api/stories?userId=${user.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch story');
      }
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch stories');
      }
      
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
    } catch (error) {
      toast.error('Failed to load story');
    }
  };

  if (!mount) return null;

  // If the user is blocked, render without any story ring
  if (isBlocked) {
    return (
      <div className="relative">
        <div className="relative cursor-pointer" onClick={handleProfileClick}>
          <div className="relative rounded-full overflow-hidden">
            {children}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        className={cn(
          "relative cursor-pointer",
          shouldShowStoryRing && hasStories && !isCurrentUser && !hasServerUnviewedStories && "before:absolute before:inset-0 before:rounded-full before:bg-gray-400 dark:before:bg-gray-400 before:p-[0.5px] before:w-[calc(100%+4px)] before:h-[calc(100%+4px)] before:-left-0.5 before:-top-0.5",
          shouldShowStoryRing && hasStories && !isCurrentUser && hasServerUnviewedStories && "before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-tr before:from-yellow-400 before:to-fuchsia-600 before:p-[0.5px] before:w-[calc(100%+4px)] before:h-[calc(100%+4px)] before:-left-0.5 before:-top-0.5",
          shouldShowStoryRing && hasStories && isCurrentUser && !hasServerUnviewedStories && "before:absolute before:inset-0 before:rounded-full before:bg-gray-400 dark:before:bg-gray-400 before:p-[0.5px] before:w-[calc(100%+4px)] before:h-[calc(100%+4px)] before:-left-0.5 before:-top-0.5",
          shouldShowStoryRing && hasStories && isCurrentUser && hasServerUnviewedStories && "before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-tr before:from-yellow-400 before:to-fuchsia-600 before:p-[0.5px] before:w-[calc(100%+4px)] before:h-[calc(100%+4px)] before:-left-0.5 before:-top-0.5",
          !hasStories && isCurrentUser && "bg-transparent"
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
        isBlocked={isBlocked}
      />
    </div>
  );
}

export default ProfileAvatar;
