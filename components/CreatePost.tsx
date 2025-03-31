"use client";

import { useEffect, useState } from "react";
import { User } from "@/lib/definitions";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";
import { Loader2, ImageIcon } from "lucide-react";
import TagPeople from "./TagPeople";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { toast } from "sonner";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

interface LocationSuggestion {
  location: string;
  _count: {
    location: number;
  };
}

interface CreatePostProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreatePost({ isOpen, onClose }: CreatePostProps) {
  const [location, setLocation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [caption, setCaption] = useState("");
  const [aspectRatio, setAspectRatio] = useState(1);
  const [taggedUsers, setTaggedUsers] = useState<{ userId: string; username: string }[]>([]);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Calculate aspect ratio
      const img = new Image();
      img.onload = () => {
        setAspectRatio(img.width / img.height);
      };
      img.src = URL.createObjectURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    console.log("[CREATE_POST] Form submission started");
    e.preventDefault();
    
    if (!file || isLoading) {
      console.log("[CREATE_POST] Submission blocked:", { hasFile: !!file, isLoading });
      return;
    }

    try {
      setIsLoading(true);
      console.log("[CREATE_POST] Starting post creation with data:", {
        hasFile: !!file,
        fileSize: file.size,
        fileType: file.type,
        caption: caption ? "present" : "empty",
        location: location ? "present" : "empty",
        aspectRatio,
        taggedUsersCount: taggedUsers.length,
        taggedUsers
      });

      // First, upload the file
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);

      console.log("[CREATE_POST] Uploading file...");
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload file");
      }

      const { url: fileUrl } = await uploadRes.json();
      console.log("[CREATE_POST] File uploaded successfully:", { fileUrl });

      // Then create the post with the file URL
      console.log("[CREATE_POST] Creating post with data:", {
        fileUrl,
        caption,
        location,
        aspectRatio,
        taggedUsers
      });

      const response = await fetch("/api/posts/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileUrl,
          caption,
          location,
          aspectRatio,
          taggedUsers
        }),
      });

      console.log("[CREATE_POST] Response received:", {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[CREATE_POST] Response not OK:", {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`Failed to create post: ${errorText}`);
      }

      const responseData = await response.json();
      console.log("[CREATE_POST] Response data:", responseData);

      toast.success("Post created successfully!");
      console.log("[CREATE_POST] Success toast shown, refreshing page...");
      router.refresh();
      console.log("[CREATE_POST] Page refresh triggered, closing modal...");
      onClose();
    } catch (error) {
      console.error("[CREATE_POST] Error details:", {
        error,
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined
      });
      toast.error("Something went wrong!");
    } finally {
      setIsLoading(false);
      console.log("[CREATE_POST] Process completed");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl overflow-visible">
        <DialogHeader>
          <DialogTitle>Create new post</DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => {
          console.log("[CREATE_POST] Form onSubmit triggered");
          handleSubmit(e);
        }} className="space-y-4">
          {!file ? (
            <div className="h-96 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
              <ImageIcon className="h-16 w-16 text-gray-400" />
              <Label
                htmlFor="file"
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg cursor-pointer"
              >
                Select from computer
              </Label>
              <input
                id="file"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="relative aspect-square overflow-hidden rounded-lg">
              <img
                src={preview}
                alt="Preview"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setPreview("");
                }}
                className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70"
              >
                ×
              </button>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="caption">Caption</Label>
            <Textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption..."
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Add location"
            />
          </div>

          <div className="space-y-2 relative">
            <Label htmlFor="tagPeople">Tag People</Label>
            <TagPeople
              onTagsChange={setTaggedUsers}
              maxTags={10}
            />
          </div>

          <Button
            type="submit"
            disabled={!file || isLoading}
            className="w-full"
            onClick={() => {
              console.log("[CREATE_POST] Share button clicked", {
                hasFile: !!file,
                isLoading,
                isDisabled: !file || isLoading
              });
            }}
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isLoading ? "Posting..." : "Share"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
} 