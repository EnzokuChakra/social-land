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

interface ProfilePictureOptionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasStory: boolean;
  userId: string;
  isOwnProfile: boolean;
}

export default function ProfilePictureOptionsModal({
  open,
  onOpenChange,
  hasStory,
  userId,
  isOwnProfile,
}: ProfilePictureOptionsModalProps) {
  const storyModal = useStoryModal();
  const editProfileModal = useEditProfileModal();

  const handleViewStory = () => {
    onOpenChange(false);
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
      <DialogContentWithoutClose className="gap-0 p-0 outline-none bg-white dark:bg-neutral-800">
        <DialogTitle className="sr-only">Profile Picture Options</DialogTitle>
        <DialogDescription className="sr-only">
          Options for profile picture interaction
        </DialogDescription>
        <div className="flex flex-col">
          {hasStory && (
            <Button
              variant="ghost"
              className="w-full px-4 py-3 text-sm font-semibold transition border-b rounded-none border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700 focus:bg-neutral-100 dark:focus:bg-neutral-700"
              onClick={handleViewStory}
            >
              View story
            </Button>
          )}
          {isOwnProfile && (
            <Button
              variant="ghost"
              className="w-full px-4 py-3 text-sm font-semibold transition border-b rounded-none border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700 focus:bg-neutral-100 dark:focus:bg-neutral-700"
              onClick={handleChangeProfilePicture}
            >
              Change profile picture
            </Button>
          )}
          <Button
            variant="ghost"
            className="w-full px-4 py-3 text-sm font-semibold transition text-red-500 rounded-none hover:bg-red-50 dark:hover:bg-red-950/50 focus:bg-red-50 dark:focus:bg-red-950/50"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </div>
      </DialogContentWithoutClose>
    </Dialog>
  );
} 