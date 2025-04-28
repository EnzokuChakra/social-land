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
import { Camera, ImageIcon, Trash2, X, ZoomIn, ZoomOut, Move } from "lucide-react";
import { updateProfile, deleteProfilePhoto } from "@/lib/actions";
import { getSocket } from "@/lib/socket";
import { cn } from "@/lib/utils";

export default function EditProfileModal() {
  const { data: session, update: updateSession } = useSession();
  const editProfileModal = useEditProfileModal();
  const router = useRouter();
  const socket = getSocket();
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
      const fileCopy = new File([file], file.name, { type: file.type });
      formData.append("file", fileCopy);
      formData.append("isProfilePhoto", "true");
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed with status: ${response.status}`);
      }
      
      const uploadData = await response.json();
      const imageUrl = uploadData.fileUrl || uploadData.url;
      
      if (!imageUrl) {
        throw new Error("No image URL returned from upload");
      }
      
      const result = await updateProfile({
        image: imageUrl
      });

      if (result.message === "Profile updated successfully") {
        if (socket && session?.user?.id) {
          socket.emit("profileUpdate", {
            userId: session.user.id,
            image: imageUrl
          });
        }
        
        setIsUploading(false);
        editProfileModal.onClose();
        toast.success("Profile photo updated successfully");
        
        if (session?.user) {
          session.user.image = imageUrl;
        }
        
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        console.error("[EditProfileModal] Profile update failed:", result);
        setIsUploading(false);
        toast.error(result.message || "Error updating profile photo");
      }
      
    } catch (error) {
      console.error("[EditProfileModal] Error updating profile photo:", error);
      setIsUploading(false);
      toast.error("Error updating profile photo. Please try again.");
    }
  };

  const handleRemovePhoto = async () => {
    setIsLoading(true);
    try {
      console.log('[EditProfileModal] Starting profile photo removal');
      
      let currentUser;
      try {
        const response = await fetch('/api/profile');
        if (!response.ok) {
          throw new Error('Failed to fetch profile data');
        }
        currentUser = await response.json();
      } catch (error) {
        console.error('[EditProfileModal] Error fetching profile:', error);
        currentUser = { image: null };
      }
      
      if (currentUser?.image && currentUser.image !== PLACEHOLDER_IMAGE) {
        try {
          const cleanImageUrl = currentUser.image.split('?')[0];
          const deleteResult = await deleteProfilePhoto(cleanImageUrl);
          
          if (!deleteResult.success) {
            console.warn('[EditProfileModal] Failed to delete old image, continuing with update');
          }
        } catch (error) {
          console.error('[EditProfileModal] Error deleting old image:', error);
        }
      }

      const updateResult = await updateProfile({
        id: session?.user?.id as string,
        image: PLACEHOLDER_IMAGE,
      });

      if (updateResult.message) {
        // Update the session data
        if (session?.user) {
          session.user.image = PLACEHOLDER_IMAGE;
        }
        
        // Emit socket event for other components
        if (socket && session?.user?.id) {
          socket.emit('profileUpdate', {
            userId: session.user.id,
            image: PLACEHOLDER_IMAGE
          });
        }
        
        toast.success(updateResult.message);
        editProfileModal.onClose();
      } else {
        throw new Error('Failed to update profile');
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
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl font-semibold">Change Profile Photo</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Upload a new photo or remove your current one
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4">
          <div className="flex flex-col items-center gap-6">
            <div className="relative w-48 h-48 rounded-full overflow-hidden border-2 border-dashed border-muted">
              {previewUrl ? (
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
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <ImageIcon className="w-12 h-12 text-muted-foreground" />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4 w-full max-w-xs">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => document.getElementById('file-input')?.click()}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Upload Photo
                </Button>
                <input
                  id="file-input"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {currentImage && currentImage !== PLACEHOLDER_IMAGE && (
                  <Button
                    variant="destructive"
                    onClick={handleRemovePhoto}
                    disabled={isLoading}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                )}
              </div>

              {previewUrl && (
                <>
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setScale(Math.max(1, scale - 0.1))}
                    >
                      <ZoomOut className="w-4 h-4" />
                    </Button>
                    <Slider
                      value={[scale]}
                      min={1}
                      max={2}
                      step={0.1}
                      onValueChange={([value]) => setScale(value)}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setScale(Math.min(2, scale + 0.1))}
                    >
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={handleFit}
                    >
                      <Move className="w-4 h-4 mr-2" />
                      Reset Position
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => handleImageUpload(selectedFile!)}
                      disabled={isUploading}
                    >
                      {isUploading ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 