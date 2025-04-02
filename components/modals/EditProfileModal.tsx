"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useEditProfileModal } from "@/hooks/use-edit-profile-modal";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UpdateUser } from "@/lib/schemas";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { updateProfile } from "@/lib/actions";
import { useSocket } from "@/hooks/use-socket";

export default function EditProfileModal() {
  const { data: session } = useSession();
  const editProfileModal = useEditProfileModal();
  const router = useRouter();
  const socket = useSocket();
  const [isLoading, setIsLoading] = useState(false);

  // Get the current image from session
  const [currentImage, setCurrentImage] = useState<string | null>(null);

  // Add constant for placeholder image path
  const PLACEHOLDER_IMAGE = '/images/profile_placeholder.webp';

  useEffect(() => {
    // Get image from profile data
    if (session?.user?.id) {
      fetch('/api/profile')
        .then(res => res.json())
        .then(data => {
          if (data?.image && data.image !== PLACEHOLDER_IMAGE) {
            setCurrentImage(data.image);
            form.setValue('image', data.image);
          }
        })
        .catch(error => {
          console.error('Error fetching profile data:', error);
        });
    }
  }, [session?.user?.id]);

  const form = useForm<z.infer<typeof UpdateUser>>({
    resolver: zodResolver(UpdateUser),
    defaultValues: {
      image: currentImage || "",
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      toast.error("Image must be less than 4MB");
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      console.log('[EditProfileModal] Starting profile photo update');
      // Step 1: Upload the image
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const uploadData = await uploadResponse.json();
      console.log('[EditProfileModal] Image uploaded successfully:', uploadData.fileUrl);
      
      // Step 2: Update the profile with the new image URL
      const { message } = await updateProfile({
        id: session?.user?.id as string,
        image: uploadData.fileUrl,
      });

      if (message) {
        // Emit profile update event
        if (socket && session?.user?.id) {
          console.log('[EditProfileModal] Emitting profile update event:', {
            userId: session.user.id,
            image: uploadData.fileUrl
          });
          socket.emit('profileUpdate', {
            userId: session.user.id,
            image: uploadData.fileUrl
          });
        }
        
        toast.success(message);
        router.refresh();
        editProfileModal.onClose();
      }
    } catch (error) {
      console.error('[EditProfileModal] Upload error:', error);
      toast.error(error instanceof Error ? error.message : "Error uploading profile photo");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemovePhoto = async () => {
    setIsLoading(true);
    try {
      console.log('[EditProfileModal] Starting profile photo removal');
      const { message } = await updateProfile({
        id: session?.user?.id as string,
        image: "",
      });

      if (message) {
        // Emit profile update event
        if (socket && session?.user?.id) {
          console.log('[EditProfileModal] Emitting profile remove event:', {
            userId: session.user.id,
            image: null
          });
          socket.emit('profileUpdate', {
            userId: session.user.id,
            image: null
          });
        }
        
        toast.success(message);
        router.refresh();
        editProfileModal.onClose();
      }
    } catch (error) {
      console.error('[EditProfileModal] Remove photo error:', error);
      toast.error(error instanceof Error ? error.message : "Error removing profile photo");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={editProfileModal.isOpen} onOpenChange={editProfileModal.onClose}>
      <DialogContent 
        className="max-w-md p-0 overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-lg rounded-2xl"
        aria-describedby="dialog-description"
      >
        <DialogHeader className="border-b border-neutral-200 dark:border-neutral-800">
          <DialogTitle className="text-center font-medium text-lg p-4 text-neutral-900 dark:text-neutral-100">
            Change Profile Photo
          </DialogTitle>
          <DialogDescription id="dialog-description" className="sr-only">
            Upload, remove or edit your profile photo
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col">
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

          {currentImage && currentImage !== PLACEHOLDER_IMAGE && (
            <Button
              variant="ghost"
              className="w-full px-4 py-6 text-sm font-semibold text-red-500 dark:text-red-400 transition hover:bg-red-50 dark:hover:bg-red-950/50 focus:bg-red-50 dark:focus:bg-red-950/50 rounded-none flex items-center justify-center gap-2 disabled:opacity-50"
              onClick={handleRemovePhoto}
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
            onClick={editProfileModal.onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 