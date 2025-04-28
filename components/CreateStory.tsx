"use client";

import { useRef, useState, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContentWithoutClose,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { createStory } from "@/lib/actions";
import { Loader2, ZoomIn, ZoomOut, X, Clock, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CreateStory({ open, onClose }: Props) {
  const { data: session } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [fitToScreen, setFitToScreen] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleFile(file);
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    setFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setDataUrl(dataUrl);

      // Get image dimensions
      const img = new window.Image();
      img.onload = () => {
        setImageSize({
          width: img.width,
          height: img.height,
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const toggleFitToScreen = () => {
    setFitToScreen(!fitToScreen);
    if (fitToScreen) {
      // If currently fit to screen, switch to 100% zoom
      setScale(1);
    } else {
      // If currently at custom zoom, fit to screen
      setScale(1);
    }
  };

  const adjustScale = (increment: boolean) => {
    const newScale = increment 
      ? Math.min(scale + 0.1, 2) 
      : Math.max(scale - 0.1, 0.5);
    setScale(parseFloat(newScale.toFixed(1)));
  };

  const onSubmit = async () => {
    if (!file || !dataUrl) return;

    setLoading(true);

    try {
      // First upload the file to get a URL
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const errorData = await uploadRes.json();
        throw new Error(errorData.message || "Upload failed");
      }

      const data = await uploadRes.json();
      
      if (!data.fileUrl) {
        throw new Error("Invalid response: missing fileUrl");
      }

      const fileUrl = data.fileUrl.startsWith('http') 
        ? data.fileUrl 
        : `${window.location.origin}${data.fileUrl}`;

      // Use the createStory server action instead of direct API call
      const result = await createStory({ fileUrl, scale });
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      toast.success("Your story has been shared!");
      router.refresh();
      onClose();
    } catch (error) {
      console.error("Error creating story:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create story");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContentWithoutClose className="max-w-5xl h-[90vh] flex flex-col p-0 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xl bg-white dark:bg-neutral-900">
        <DialogHeader className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <DialogTitle className="text-center text-lg font-semibold">
            Create new story
          </DialogTitle>
          <button 
            onClick={onClose}
            className="absolute right-4 top-4 p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </DialogHeader>

        <div className="flex w-full h-[calc(90vh-64px)]">
          {/* Left side - Upload/Preview */}
          <div className="flex-1 flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
            <AnimatePresence mode="wait">
              {!dataUrl ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "flex flex-col items-center justify-center w-full h-full gap-4 transition-colors p-6",
                    isDragging && "bg-neutral-100 dark:bg-neutral-800"
                  )}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  <div className="flex flex-col items-center justify-center gap-4 max-w-md text-center p-8 bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-800">
                    <div className="w-24 h-24 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-2">
                      <Clock className="h-10 w-10 text-neutral-500" />
                    </div>
                    <h3 className="text-xl font-semibold">
                      Create a new story
                    </h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">
                      Share a moment that disappears in 24 hours
                    </p>
                    <div className="w-full border-t border-neutral-200 dark:border-neutral-800 my-4"></div>
                    <p className="text-sm font-medium">
                      Drag photos here
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      or
                    </p>
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                      disabled={loading}
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="default"
                      className="mt-2"
                      disabled={loading}
                    >
                      Select from gallery
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="relative w-full h-full flex items-center justify-center p-6"
                >
                  <div className="relative overflow-hidden rounded-lg shadow-lg bg-black w-[350px]">
                    <AspectRatio
                      ratio={9 / 16}
                      className="w-full bg-black overflow-hidden"
                    >
                      <div className="relative w-full h-full">
                        <Image
                          src={dataUrl}
                          alt="Story preview"
                          fill
                          className="object-contain"
                          style={{ transform: `scale(${scale})` }}
                          priority
                        />
                      </div>
                    </AspectRatio>
                  </div>

                  <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 p-2 bg-white/90 dark:bg-black/90 rounded-full backdrop-blur-sm border border-neutral-200 dark:border-neutral-800">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => adjustScale(false)}
                      className="h-9 w-9 rounded-full"
                      disabled={scale <= 0.5}
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <Slider
                      value={[scale * 100]}
                      min={50}
                      max={200}
                      step={5}
                      className="w-32"
                      onValueChange={([value]) => {
                        setScale(value / 100);
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => adjustScale(true)}
                      className="h-9 w-9 rounded-full"
                      disabled={scale >= 2}
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </div>

                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute top-3 left-3 h-9 w-9 rounded-full bg-white/90 dark:bg-black/90 /*backdrop-blur-sm*/ hover:bg-white dark:hover:bg-black border border-neutral-200 dark:border-neutral-800"
                    onClick={() => {
                      setDataUrl(null);
                      setFile(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right side - Details */}
          <AnimatePresence>
            {dataUrl && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 350, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="w-[350px] h-full border-l border-neutral-200 dark:border-neutral-800 flex flex-col bg-white dark:bg-neutral-900 overflow-hidden"
              >
                <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                  <div className="bg-neutral-50 dark:bg-neutral-800 p-4 rounded-lg">
                    <div className="flex items-center mb-4">
                      <Info className="w-4 h-4 mr-2 text-neutral-500" />
                      <h3 className="text-sm font-medium">
                        Stories disappear after 24 hours
                      </h3>
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Stories are visible to your followers for 24 hours before they disappear. You can adjust how your image appears using the zoom controls.
                    </p>
                  </div>

                  <div className="bg-neutral-50 dark:bg-neutral-800 p-4 rounded-lg">
                    <h3 className="text-sm font-medium mb-3">
                      Image details
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                      <div>Original size:</div>
                      <div>{imageSize.width} × {imageSize.height}px</div>
                      <div>Zoom level:</div>
                      <div>{Math.round(scale * 100)}%</div>
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-neutral-200 dark:border-neutral-800">
                  <Button
                    onClick={onSubmit}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sharing...
                      </>
                    ) : (
                      "Share story"
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContentWithoutClose>
    </Dialog>
  );
} 