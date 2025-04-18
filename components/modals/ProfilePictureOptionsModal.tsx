"use client";

import {
  Dialog,
  DialogContentWithoutClose,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useStoryModal } from "@/hooks/use-story-modal";
import { useEditProfileModal } from "@/hooks/use-edit-profile-modal";
import { DialogClose } from "@/components/ui/dialog";

interface ProfilePictureOptionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasStory: boolean;
  userId: string;
  isOwnProfile: boolean;
  onViewStory?: () => void;
  isBlocked?: boolean;
}

export default function ProfilePictureOptionsModal({
  open,
  onOpenChange,
  hasStory,
  userId,
  isOwnProfile,
  onViewStory,
  isBlocked = false,
}: ProfilePictureOptionsModalProps) {
  const storyModal = useStoryModal();
  const editProfileModal = useEditProfileModal();

  const handleViewStory = () => {
    onOpenChange(false);
    
    // If onViewStory is provided, use it
    if (onViewStory) {
      onViewStory();
      return;
    }
    
    // Otherwise use the default behavior
    setTimeout(() => {
      storyModal.setUserId(userId);
      storyModal.onOpen();
    }, 100);
  };

  const handleChangeProfilePicture = () => {
    onOpenChange(false);
    setTimeout(() => {
      editProfileModal.onOpen();
    }, 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContentWithoutClose className="gap-0 p-0 max-w-[400px] overflow-hidden outline-none bg-white dark:bg-neutral-800 rounded-xl">
        <DialogTitle className="sr-only">Profile Picture Options</DialogTitle>
        <DialogDescription className="sr-only">
          Options for profile picture interaction
        </DialogDescription>
        <div className="flex flex-col">
          {isOwnProfile && (
            <Button
              variant="ghost"
              className="w-full h-12 font-semibold text-blue-500 hover:text-blue-500 hover:bg-neutral-100 dark:hover:bg-neutral-700/70 transition-colors duration-200"
              onClick={handleChangeProfilePicture}
            >
              Change profile picture
            </Button>
          )}
          {hasStory && !isBlocked && (
            <Button
              variant="ghost"
              className="w-full h-12 font-semibold text-blue-500 hover:text-blue-500 hover:bg-neutral-100 dark:hover:bg-neutral-700/70 transition-colors duration-200"
              onClick={handleViewStory}
            >
              View Story
            </Button>
          )}
          <Button
            variant="ghost"
            className="w-full h-12 font-semibold text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors duration-200"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </div>
      </DialogContentWithoutClose>
    </Dialog>
  );
} 