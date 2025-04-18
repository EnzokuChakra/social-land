"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, Trash2, PlayCircle } from "lucide-react";
import { useState } from "react";
import { useEditProfileModal } from "@/hooks/use-edit-profile-modal";
import { useSession } from "next-auth/react";
import { useStoryModal } from "@/hooks/use-story-modal";
import { toast } from "sonner";

interface UploadPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoSelect: (file: File) => void;
  currentImage?: string | null;
  hasActiveStory?: boolean;
}

export default function UploadPhotoModal({
  isOpen,
  onClose,
  onPhotoSelect,
  currentImage,
  hasActiveStory = false
}: UploadPhotoModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { data: session } = useSession();
  const editProfileModal = useEditProfileModal();
  const storyModal = useStoryModal();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      toast.error("Image must be less than 4MB");
      return;
    }

    onPhotoSelect(file);
    onClose();
    editProfileModal.onOpen();
  };

  const handleViewStory = () => {
    onClose();
    storyModal.onOpen();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-lg rounded-2xl">
        <DialogHeader className="border-b border-neutral-200 dark:border-neutral-800">
          <DialogTitle className="text-center font-medium text-lg p-4 text-neutral-900 dark:text-neutral-100">
            Change Profile Photo
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-800">
          <Button
            variant="ghost"
            className="w-full px-4 py-6 text-sm font-semibold text-blue-500 dark:text-blue-400 transition hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:bg-neutral-100 dark:focus:bg-neutral-800 rounded-none flex items-center justify-center gap-2 disabled:opacity-50"
            onClick={() => {
              if (!isLoading) {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (e) => handleFileChange(e as unknown as React.ChangeEvent<HTMLInputElement>);
                input.click();
              }
            }}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Camera className="w-5 h-5" />
            )}
            {isLoading ? "Uploading..." : "Upload Photo"}
          </Button>

          {hasActiveStory && (
            <Button
              variant="ghost"
              className="w-full px-4 py-6 text-sm font-semibold text-purple-500 dark:text-purple-400 transition hover:bg-purple-50 dark:hover:bg-purple-950/50 focus:bg-purple-50 dark:focus:bg-purple-950/50 rounded-none flex items-center justify-center gap-2"
              onClick={handleViewStory}
            >
              <PlayCircle className="w-5 h-5" />
              View Story
            </Button>
          )}

          {currentImage && (
            <Button
              variant="ghost"
              className="w-full px-4 py-6 text-sm font-semibold text-red-500 dark:text-red-400 transition hover:bg-red-50 dark:hover:bg-red-950/50 focus:bg-red-50 dark:focus:bg-red-950/50 rounded-none flex items-center justify-center gap-2 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Trash2 className="w-5 h-5" />
              )}
              {isLoading ? "Removing..." : "Remove Current Photo"}
            </Button>
          )}

          <Button
            variant="ghost"
            className="w-full px-4 py-6 text-sm font-semibold text-neutral-900 dark:text-neutral-100 transition hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:bg-neutral-100 dark:focus:bg-neutral-800 rounded-none flex items-center justify-center disabled:opacity-50"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 