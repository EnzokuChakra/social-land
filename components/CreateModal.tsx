"use client";

import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContentWithoutClose,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Slider } from "@/components/ui/slider";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { 
  ImageIcon, 
  Loader2, 
  MapPin, 
  Tag, 
  Film, 
  PlusSquareIcon, 
  X, 
  ZoomIn, 
  ZoomOut,
  Layers,
  Info,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buttonVariants } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import TagPeople from "./TagPeople";
import { Label } from "@/components/ui/label";
import { useSession } from "next-auth/react";
import { getSocket } from "@/lib/socket";

type TabType = "post" | "story" | "reel";

type UploadState = {
  file: File | null;
  preview: string | null;
  caption: string;
  location: string;
  tags: { userId: string; username: string }[];
  isUploading: boolean;
  scale: number;
};

const MAX_CAPTION_LENGTH = 250;
const MAX_LOCATION_LENGTH = 20;

export default function CreateModal({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [reelsEnabled, setReelsEnabled] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("post");
  const { data: session } = useSession();
  const [postState, setPostState] = useState<UploadState>({
    file: null,
    preview: null,
    caption: "",
    location: "",
    tags: [],
    isUploading: false,
    scale: 1,
  });
  const [storyState, setStoryState] = useState<UploadState>({
    file: null,
    preview: null,
    caption: "",
    location: "",
    tags: [],
    isUploading: false,
    scale: 1,
  });
  const [reelState, setReelState] = useState<UploadState>({
    file: null,
    preview: null,
    caption: "",
    location: "",
    tags: [],
    isUploading: false,
    scale: 1,
  });
  const [dragging, setDragging] = useState(false);
  const postInputRef = useRef<HTMLInputElement>(null);
  const storyInputRef = useRef<HTMLInputElement>(null);
  const reelInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const uploadInProgressRef = useRef(false);
  const socket = getSocket();

  // Fetch reels visibility setting when component mounts
  useEffect(() => {
    const fetchReelsVisibility = async () => {
      try {
        const response = await fetch("/api/settings/reels");
        if (response.ok) {
          const data = await response.json();
          setReelsEnabled(data.value === "true");
          
          // If reels are disabled and current active tab is reel, switch to post
          if (data.value !== "true" && activeTab === "reel") {
            setActiveTab("post");
          }
        } else {
          console.log('Failed to fetch reels settings:', response.status);
          setReelsEnabled(false);
          if (activeTab === "reel") {
            setActiveTab("post");
          }
        }
      } catch (error) {
        console.error("Error fetching reels visibility setting:", error);
        setReelsEnabled(false);
        if (activeTab === "reel") {
          setActiveTab("post");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchReelsVisibility();

    // Set up WebSocket listener
    if (socket) {
      const handleReelsVisibilityChange = (data: { reelsEnabled: boolean }) => {
        setReelsEnabled(data.reelsEnabled);
        if (!data.reelsEnabled && activeTab === "reel") {
          setActiveTab("post");
        }
      };

      socket.on('reels_visibility_changed', handleReelsVisibilityChange);

      return () => {
        socket.off('reels_visibility_changed', handleReelsVisibilityChange);
      };
    }
  }, [activeTab, socket]);

  useEffect(() => {
    // Reset zoom when switching tabs
    if (activeTab === "post") setPostState(prev => ({ ...prev, scale: 1 }));
    if (activeTab === "story") setStoryState(prev => ({ ...prev, scale: 1 }));
    if (activeTab === "reel") setReelState(prev => ({ ...prev, scale: 1 }));
  }, [activeTab]);

  const getCurrentState = () => {
    switch (activeTab) {
      case "post":
        return { state: postState, setState: setPostState, inputRef: postInputRef };
      case "story":
        return { state: storyState, setState: setStoryState, inputRef: storyInputRef };
      case "reel":
        return { state: reelState, setState: setReelState, inputRef: reelInputRef };
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    const file = e.target.files?.[0];
    if (!file) return;

    const { setState } = getCurrentState();

    // Validate file type
    if (activeTab === "reel") {
      if (!file.type.startsWith('video/')) {
        toast.error("Please select a video file");
        return;
      }
    } else {
      if (!file.type.startsWith('image/')) {
        toast.error("Please select an image file");
        return;
      }
    }

    const url = URL.createObjectURL(file);
    setState(prev => ({
      ...prev,
      file,
      preview: url,
    }));
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const { setState } = getCurrentState();

    // Validate file type
    if (activeTab === "reel") {
      if (!file.type.startsWith('video/')) {
        toast.error("Please select a video file");
        return;
      }
    } else {
      if (!file.type.startsWith('image/')) {
        toast.error("Please select an image file");
        return;
      }
    }

    const url = URL.createObjectURL(file);
    setState(prev => ({
      ...prev,
      file,
      preview: url,
    }));
  };

  const handleUpload = async () => {
    // Prevent duplicate submissions
    if (isSubmitting || uploadInProgressRef.current) {
      return;
    }

    const state = activeTab === "story" 
      ? storyState 
      : activeTab === "reel" 
      ? reelState 
      : postState;

    if (!state.file) {
      return;
    }

    try {
      setIsSubmitting(true);
      uploadInProgressRef.current = true;

      const formData = new FormData();
      formData.append('file', state.file);
      formData.append('type', activeTab === 'story' ? 'stories' : activeTab === 'reel' ? 'reels' : 'posts');

      let uploadRes;
      let retries = 3;
      
      while (retries > 0) {
        try {
          uploadRes = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });
          break;
        } catch (error) {
          console.error("Upload attempt failed:", { retries, error });
          retries--;
          if (retries === 0) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (!uploadRes?.ok) {
        const data = await uploadRes?.json().catch(() => ({}));
        console.error("Upload response not OK:", { status: uploadRes?.status, data });
        throw new Error(data?.message || data?.error || 'Upload failed');
      }

      const uploadData = await uploadRes.json();
      
      if (!uploadData.fileUrl) {
        console.error("Missing fileUrl in upload response");
        throw new Error('Invalid response: missing fileUrl');
      }

      const fileUrl = uploadData.fileUrl.startsWith('http') 
        ? uploadData.fileUrl 
        : `${window.location.origin}${uploadData.fileUrl}`;

      // Create post/story/reel based on active tab
      const endpoint = activeTab === "story" 
        ? `/api/stories?action=create`
        : activeTab === "reel"
        ? `/api/reels/create`
        : `/api/posts/create`;

      // Different body for different content types
      const body = {
        fileUrl,
        caption: state.caption,
        ...(activeTab === "post" && {
          location: state.location,
          aspectRatio: 1,
          taggedUsers: state.tags,
        }),
        ...(activeTab === "story" && {
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }),
      };

      const createRes = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!createRes.ok) {
        const errorData = await createRes.json().catch(() => ({}));
        console.error("Content creation failed:", { status: createRes.status, data: errorData });
        throw new Error(errorData?.message || errorData?.error || 'Failed to create content');
      }

      const createData = await createRes.json();

      // Reset state and close modal
      if (activeTab === "story") {
        if (!createData?.data?.id) {
          console.error("Invalid story creation response:", createData);
          throw new Error("Invalid response from server");
        }

        // Create an optimistic story object
        const optimisticStory = {
          id: createData.data.id,
          fileUrl: fileUrl,
          user_id: session?.user?.id,
          createdAt: new Date().toISOString(),
          scale: state.scale,
          user: {
            id: session?.user?.id,
            username: session?.user?.username,
            image: session?.user?.image,
            verified: session?.user?.verified,
            hasActiveStory: true
          },
          views: [],
          likes: []
        };

        // Optimistically update the UI
        try {
          // @ts-ignore - Using the exposed optimistic update function
          if (typeof window.addStoryOptimistically === 'function') {
            window.addStoryOptimistically(optimisticStory);
          }

          // Dispatch events to update all story rings and story feed
          window.dispatchEvent(new CustomEvent('userHasNewStory', {
            detail: { userId: session?.user?.id }
          }));
          
          window.dispatchEvent(new CustomEvent('storyUploaded', {
            detail: { story: optimisticStory }
          }));

          // Reset the story state
          setStoryState({
            file: null,
            preview: null,
            caption: "",
            location: "",
            tags: [],
            isUploading: false,
            scale: 1,
          });

          // Close modal and show success message
          setOpen(false);
          toast.success("Story shared!");

          // Force router refresh to update server components
          router.refresh();
        } catch (error) {
          console.error('Error updating story UI:', error);
          toast.error("Story shared but UI update failed");
        }
      } else if (activeTab === "reel") {
        setReelState({
          file: null,
          preview: null,
          caption: "",
          location: "",
          tags: [],
          isUploading: false,
          scale: 1,
        });
        setOpen(false);
        router.refresh();
        toast.success("Reel shared!");
      } else {
        setPostState({
          file: null,
          preview: null,
          caption: "",
          location: "",
          tags: [],
          isUploading: false,
          scale: 1,
        });
        setOpen(false);
        router.refresh();
        toast.success("Post shared!");

        // After successful post creation, before closing the modal:
        window.dispatchEvent(new CustomEvent('newPost', {
          detail: {
            post: {
              id: createData.id,
              fileUrl: fileUrl,
              caption: state.caption,
              location: state.location,
              aspectRatio: 1,
              user_id: session?.user?.id,
              user: {
                id: session?.user?.id,
                username: session?.user?.username,
                image: session?.user?.image
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              likes: [],
              comments: [],
              savedBy: [],
              tags: state.tags.map(tag => ({
                id: `temp-${crypto.randomUUID()}`,
                postId: createData.id,
                userId: tag.userId,
                x: 0,
                y: 0,
                createdAt: new Date().toISOString(),
                user: {
                  id: tag.userId,
                  username: tag.username,
                  image: null,
                  verified: false
                }
              })),
              taggedUsers: state.tags
            }
          }
        }));
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
      uploadInProgressRef.current = false;
    }
  };

  const handleClose = () => {
    // Reset all states first
    setPostState({
      file: null,
      preview: null,
      caption: "",
      location: "",
      tags: [],
      isUploading: false,
      scale: 1,
    });
    setStoryState({
      file: null,
      preview: null,
      caption: "",
      location: "",
      tags: [],
      isUploading: false,
      scale: 1,
    });
    setReelState({
      file: null,
      preview: null,
      caption: "",
      location: "",
      tags: [],
      isUploading: false,
      scale: 1,
    });
    
    // Reset submission states
    setIsSubmitting(false);
    uploadInProgressRef.current = false;
    
    // Close the modal last
    setOpen(false);
  };

  const adjustScale = (increment: boolean) => {
    const { state, setState } = getCurrentState();
    const newScale = increment 
      ? Math.min(state.scale + 0.1, 2) 
      : Math.max(state.scale - 0.1, 0.5);
    setState(prev => ({ ...prev, scale: parseFloat(newScale.toFixed(1)) }));
  };

  const { state, inputRef, setState } = getCurrentState();

  const tabIcons = {
    post: <Layers className="w-4 h-4 mr-2" />,
    story: <Clock className="w-4 h-4 mr-2" />,
    reel: <Film className="w-4 h-4 mr-2" />
  };

  // Add this block for character count display
  const getCharsRemaining = (text: string, maxLength: number) => {
    return maxLength - text.length;
  };

  const isNearCharLimit = (text: string, maxLength: number, isLocation = false) => {
    const remaining = getCharsRemaining(text, maxLength);
    return isLocation ? (remaining <= 5 && remaining > 0) : (remaining <= 20 && remaining > 0);
  };

  const isAtCharLimit = (text: string, maxLength: number) => {
    return text.length >= maxLength;
  };

  const handleCaptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { state, setState } = getCurrentState();
    const value = e.target.value;
    if (value.length <= MAX_CAPTION_LENGTH) {
      setState(prev => ({ ...prev, caption: value }));
    }
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { state, setState } = getCurrentState();
    const value = e.target.value;
    if (value.length <= MAX_LOCATION_LENGTH) {
      setState(prev => ({ ...prev, location: value }));
    }
  };

  if (isLoading) {
    return <>{children}</>;
  }

  return (
    <Dialog 
      open={open} 
      onOpenChange={(open) => {
        if (!open) {
          handleClose();
        } else {
          setOpen(true);
        }
      }}
    >
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContentWithoutClose 
        aria-describedby="dialog-description"
        className="max-w-5xl h-[90vh] flex flex-col p-0 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xl bg-white dark:bg-neutral-900"
      >
        <DialogHeader className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <DialogTitle className="text-center text-lg font-semibold">
            Create new {activeTab}
          </DialogTitle>
          <DialogDescription id="dialog-description" className="text-center text-sm text-neutral-500 dark:text-neutral-400">
            {activeTab === "story" 
              ? "Share a photo that disappears after 24 hours" 
              : activeTab === "reel" 
              ? "Create and share a video with your followers"
              : "Share a photo with your followers"}
          </DialogDescription>
          <button 
            onClick={handleClose}
            className="absolute right-4 top-4 p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </DialogHeader>

        <Tabs 
          defaultValue="post" 
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "post" | "story" | "reel")}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="bg-neutral-100 dark:bg-neutral-800 p-1 mx-6 mt-4 mb-2 grid w-auto rounded-lg h-auto" style={{
            gridTemplateColumns: reelsEnabled ? "repeat(3, 1fr)" : "repeat(2, 1fr)"
          }}>
            <TabsTrigger 
              value="post" 
              className={cn(
                "rounded-md h-10 data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-900 data-[state=active]:shadow-sm flex items-center gap-1.5",
                activeTab === "post" ? "text-neutral-900 dark:text-white" : "text-neutral-600 dark:text-neutral-400"
              )}
            >
              <ImageIcon className="w-4 h-4" />
              <span>Post</span>
            </TabsTrigger>
            <TabsTrigger 
              value="story" 
              className={cn(
                "rounded-md h-10 data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-900 data-[state=active]:shadow-sm flex items-center gap-1.5",
                activeTab === "story" ? "text-neutral-900 dark:text-white" : "text-neutral-600 dark:text-neutral-400"
              )}
            >
              <Clock className="w-4 h-4" />
              <span>Story</span>
            </TabsTrigger>
            {reelsEnabled && (
              <TabsTrigger 
                value="reel" 
                className={cn(
                  "rounded-md h-10 data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-900 data-[state=active]:shadow-sm flex items-center gap-1.5",
                  activeTab === "reel" ? "text-neutral-900 dark:text-white" : "text-neutral-600 dark:text-neutral-400"
                )}
              >
                <Film className="w-4 h-4" />
                <span>Reel</span>
              </TabsTrigger>
            )}
          </TabsList>

          <div className="h-[calc(90vh-120px)] overflow-hidden">
            {["post", "story", ...(reelsEnabled ? ["reel"] : [])].map((tab) => (
              <TabsContent key={tab} value={tab} className="m-0 h-full">
                <div className="flex w-full h-full">
                  {/* Left side - Upload/Preview */}
                  <div className="flex-1 flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
                    {!state.preview ? (
                      <div
                        className={cn(
                          "flex flex-col items-center justify-center w-full h-full gap-4 transition-colors p-6",
                          dragging && "bg-neutral-100 dark:bg-neutral-800"
                        )}
                        onDrop={handleDrop}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragging(true);
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          setDragging(false);
                        }}
                      >
                        <div className="flex flex-col items-center justify-center gap-4 max-w-md text-center p-8 bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-800">
                          <div className="w-24 h-24 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-2">
                            {tab === "reel" ? (
                              <Film className="h-10 w-10 text-neutral-500" />
                            ) : tab === "story" ? (
                              <Clock className="h-10 w-10 text-neutral-500" />
                            ) : (
                              <Layers className="h-10 w-10 text-neutral-500" />
                            )}
                          </div>
                          <h3 className="text-xl font-semibold">
                            Create a new {tab}
                          </h3>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">
                            {tab === "reel" 
                              ? "Share your moments with short videos" 
                              : tab === "story" 
                              ? "Share a moment that disappears in 24 hours"
                              : "Share your photos with your followers"}
                          </p>
                          <div className="w-full border-t border-neutral-200 dark:border-neutral-800 my-4"></div>
                          <p className="text-sm font-medium">
                            Drag {tab === "reel" ? "videos" : "photos"} here
                          </p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            or
                          </p>
                          <Input
                            ref={inputRef}
                            type="file"
                            accept={tab === "reel" ? "video/*" : "image/*"}
                            className="hidden"
                            onChange={handleFileChange}
                            disabled={state.isUploading}
                          />
                          <Button
                            onClick={() => inputRef.current?.click()}
                            variant="default"
                            className="mt-2"
                            disabled={state.isUploading}
                          >
                            Select from gallery
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative w-full h-full flex items-center justify-center p-6">
                        <div className={cn(
                          "relative overflow-hidden rounded-lg shadow-lg bg-black",
                          tab === "story" ? "w-[350px]" : "max-w-3xl w-full"
                        )}>
                          <AspectRatio
                            ratio={tab === "story" ? 9/16 : 16/9}
                            className="w-full bg-black overflow-hidden"
                          >
                            {tab === "reel" ? (
                              <video
                                src={state.preview}
                                className="w-full h-full object-contain"
                                controls
                              />
                            ) : (
                              <div className="relative w-full h-full">
                                <Image
                                  src={state.preview}
                                  alt="Preview"
                                  fill
                                  className="object-contain"
                                  style={{ transform: `scale(${state.scale})` }}
                                  priority
                                />
                              </div>
                            )}
                          </AspectRatio>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right side - Details */}
                  {state.preview && (
                    <div className="w-[350px] h-full border-l border-neutral-200 dark:border-neutral-800 flex flex-col bg-white dark:bg-neutral-900 overflow-hidden">
                      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                        {(tab === "post" || tab === "reel") && (
                          <div>
                            <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-2">
                              {tab === "reel" ? "Reel caption" : "Write a caption"}
                            </h3>
                            <div className="relative flex items-start rounded-sm border border-neutral-200 dark:border-neutral-800 px-3 py-2">
                              <Info className="h-4 w-4 text-neutral-500 dark:text-neutral-400 mr-2 mt-[5px]" />
                              <Textarea
                                placeholder="Write a caption..."
                                className="min-h-[120px] resize-none bg-transparent border-none text-sm text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-500 dark:placeholder:text-neutral-400 focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
                                value={state.caption}
                                onChange={handleCaptionChange}
                                maxLength={MAX_CAPTION_LENGTH}
                              />
                            </div>
                            <div className="flex justify-end mt-1">
                              <span className={cn(
                                "text-xs", 
                                isAtCharLimit(state.caption, MAX_CAPTION_LENGTH) 
                                  ? "text-red-500" 
                                  : isNearCharLimit(state.caption, MAX_CAPTION_LENGTH) 
                                    ? "text-amber-500" 
                                    : "text-neutral-500"
                              )}>
                                {getCharsRemaining(state.caption, MAX_CAPTION_LENGTH)} characters remaining
                              </span>
                            </div>
                          </div>
                        )}
                        
                        {tab === "post" && (
                          <>
                            <div>
                              <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-2">
                                Location
                              </h3>
                              <div className="relative flex items-center rounded-sm border border-neutral-200 dark:border-neutral-800 px-3 py-2">
                                <MapPin className="h-4 w-4 text-neutral-500 dark:text-neutral-400 mr-2" />
                                <Input
                                  placeholder="Add location"
                                  className="w-full bg-transparent border-none text-sm text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-500 dark:placeholder:text-neutral-400 focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
                                  value={state.location}
                                  onChange={handleLocationChange}
                                  maxLength={MAX_LOCATION_LENGTH}
                                />
                              </div>
                              <div className="flex justify-end mt-1">
                                <span className={cn(
                                  "text-xs", 
                                  isAtCharLimit(state.location, MAX_LOCATION_LENGTH) 
                                    ? "text-red-500" 
                                    : isNearCharLimit(state.location, MAX_LOCATION_LENGTH, true) 
                                      ? "text-amber-500" 
                                      : "text-neutral-500"
                                )}>
                                  {getCharsRemaining(state.location, MAX_LOCATION_LENGTH)} characters remaining
                                </span>
                              </div>
                            </div>

                            <div>
                              <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-2">
                                Tag people
                              </h3>
                              <div className="relative">
                                <TagPeople
                                  onTagsChange={(tags) => {
                                    setState(prev => ({ ...prev, tags }));
                                  }}
                                  maxTags={10}
                                />
                              </div>
                            </div>
                          </>
                        )}

                        {(tab === "story" || tab === "reel") && (
                          <div className="bg-neutral-50 dark:bg-neutral-800 p-4 rounded-lg">
                            <div className="flex items-center mb-4">
                              <Info className="w-4 h-4 mr-2 text-neutral-500" />
                              <h3 className="text-sm font-medium">
                                {tab === "story" ? "Stories disappear after 24 hours" : "Reels can be discovered by everyone"}
                              </h3>
                            </div>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                              {tab === "story" 
                                ? "Stories are visible to your followers for 24 hours before they disappear." 
                                : "Reels may be featured on the Explore page and can be seen by people who don't follow you."}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="p-6 border-t border-neutral-200 dark:border-neutral-800">
                        <Button
                          onClick={handleUpload}
                          disabled={isSubmitting}
                          className="w-full relative flex items-center justify-center"
                        >
                          {isSubmitting ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>
                                {activeTab === "story"
                                  ? "Sharing story..."
                                  : activeTab === "reel"
                                  ? "Sharing reel..."
                                  : "Sharing post..."}
                              </span>
                            </div>
                          ) : (
                            <span>Share {activeTab}</span>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </DialogContentWithoutClose>
    </Dialog>
  );
} 