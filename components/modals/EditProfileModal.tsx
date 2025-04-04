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
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Camera, ImageIcon, Trash2 } from "lucide-react";
import { updateProfile } from "@/lib/actions";
import { useSocket } from "@/hooks/use-socket";

export default function EditProfileModal() {
  const { data: session } = useSession();
  const editProfileModal = useEditProfileModal();
  const router = useRouter();
  const socket = useSocket();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

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
      image: session?.user?.image || "",
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        toast.error("Image must be less than 4MB");
        return;
      }

      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  };

  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleDragMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    // Add bounds to prevent dragging too far
    const bounds = 100 * scale;
    const clampedX = Math.max(-bounds, Math.min(bounds, newX));
    const clampedY = Math.max(-bounds, Math.min(bounds, newY));
    
    setPosition({
      x: clampedX,
      y: clampedY,
    });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleFit = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleImageUpload = async (file: File) => {
    try {
      setIsUploading(true);
      console.log("[EditProfileModal] Starting profile photo update");
      
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      
      const uploadData = await response.json();
      if (uploadData.fileUrl || uploadData.url) {
        const imageUrl = uploadData.fileUrl || uploadData.url;
        console.log('[EditProfileModal] Image uploaded successfully:', imageUrl);
        
        // Update the profile with the new image URL
        const result = await updateProfile({
          image: imageUrl
        });
        
        if (result.message === "Profile updated successfully") {
          console.log('[EditProfileModal] Profile updated successfully');
          
          // Emit profile update event
          if (socket) {
            socket.emit('profileUpdate', {
              userId: session?.user?.id,
              image: imageUrl
            });
            console.log('[EditProfileModal] Emitting profile update event:', {
              userId: session?.user?.id,
              image: imageUrl
            });
          }
          
          setPreviewUrl(imageUrl);
          setSelectedFile(null);
          form.setValue('image', imageUrl);
          toast.success("Profile photo updated successfully");
        } else {
          console.error('[EditProfileModal] Profile update failed:', result);
          toast.error(result.message || "Error updating profile photo");
        }
      }
    } catch (error) {
      console.error("[EditProfileModal] Error updating profile photo:", error);
      setIsUploading(false);
      toast.error("Error updating profile photo");
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="mx-auto font-medium text-xl py-5">
            Change Profile Photo
          </DialogTitle>
        </DialogHeader>
        <DialogDescription>
          Upload and adjust your profile photo. You can drag to reposition and use the slider to zoom.
        </DialogDescription>

        <Form {...form}>
          <form className="space-y-4">
            <FormField
              control={form.control}
              name="image"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="flex flex-col items-center gap-4 p-4">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="w-full max-w-xs"
                      />
                      
                      {previewUrl && (
                        <div className="relative w-[300px] h-[300px] overflow-hidden rounded-full border-2 border-neutral-200 dark:border-neutral-800">
                          <div
                            className="absolute inset-0 cursor-move"
                            style={{
                              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                            }}
                            onMouseDown={handleDragStart}
                            onMouseMove={handleDragMove}
                            onMouseUp={handleDragEnd}
                            onMouseLeave={handleDragEnd}
                          >
                            <img
                              src={previewUrl}
                              alt="Preview"
                              className="w-full h-full object-cover"
                              draggable={false}
                            />
                          </div>
                        </div>
                      )}

                      {previewUrl && (
                        <div className="flex flex-col gap-4 w-full max-w-xs">
                          <div className="flex justify-between items-center gap-4">
                            <Button type="button" onClick={handleFit} variant="outline">
                              Fit
                            </Button>
                            <Slider
                              defaultValue={[1]}
                              min={1}
                              max={2}
                              step={0.1}
                              value={[scale]}
                              onValueChange={([value]) => setScale(value)}
                              className="w-32"
                            />
                          </div>
                          <Button type="button" onClick={() => handleImageUpload(selectedFile!)}>
                            Save Photo
                          </Button>
                        </div>
                      )}

                      {session?.user?.image && !previewUrl && (
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={handleRemovePhoto}
                          className="w-full"
                        >
                          Remove Current Photo
                        </Button>
                      )}
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 