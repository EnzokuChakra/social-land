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
import { UserWithExtras } from "@/lib/definitions";
import { UpdateUser } from "@/lib/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { useRef, useState } from "react";
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
  createdAt: string;
  scale?: number;
  views?: Array<{
    id: string;
    user: {
      id: string;
      username: string;
      name: string | null;
      image: string | null;
    };
    createdAt: string;
  }>;
  likes?: Array<{
    id: string;
    user: {
      id: string;
      username: string;
      name: string | null;
      image: string | null;
    };
  }>;
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
  stories = [],
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

  const hasStories = stories.length > 0 && stories.some(story => {
    const storyDate = new Date(story.createdAt);
    const now = new Date();
    const diff = now.getTime() - storyDate.getTime();
    const hours = diff / (1000 * 60 * 60);
    return hours < 24;
  });

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

      const formattedStories = activeStories.map(story => ({
        ...story,
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
          hasStories && "before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-tr before:from-yellow-400 before:to-fuchsia-600 before:p-[0.5px] before:w-[calc(100%+4px)] before:h-[calc(100%+4px)] before:-left-0.5 before:-top-0.5"
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
      />
    </>
  );
}

export default ProfileAvatar;
