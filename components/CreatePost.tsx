"use client";

import { useEffect, useState, useRef } from "react";
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
import { useStats } from "@/lib/hooks/use-stats";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { cn, containsUrl } from "@/lib/utils";

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
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [caption, setCaption] = useState("");
  const [aspectRatio, setAspectRatio] = useState(1);
  const [taggedUsers, setTaggedUsers] = useState<{ userId: string; username: string; name?: string; image?: string; verified?: boolean }[]>([]);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: session } = useSession();
  const { updateStats } = useStats(session?.user?.username || null);
  const queryClient = useQueryClient();

  const handleTaggedUsersChange = (newTaggedUsers: { userId: string; username: string; name?: string; image?: string; verified?: boolean }[]) => {
    setTaggedUsers(newTaggedUsers);
  };

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
    e.preventDefault();
    
    if (containsUrl(caption)) {
      toast.error("URLs are not allowed in captions");
      return;
    }

    if (!file || isLoading) {
      return;
    }

    try {
      setIsLoading(true);

      // First, upload the file
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload file");
      }

      const { url: fileUrl } = await uploadRes.json();

      // Then create the post with the file URL
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

      if (!response.ok) {
        throw new Error("Failed to create post");
      }

      const responseData = await response.json();

      // Optimistically update the post count and dispatch event BEFORE closing modal
      if (session?.user?.username) {
        const tagsData = taggedUsers.map((user: any) => ({
          id: `temp-${crypto.randomUUID()}`,
          postId: responseData.id || crypto.randomUUID(),
          userId: user.userId,
          x: 0,
          y: 0,
          createdAt: new Date(),
          user: {
            id: user.userId,
            username: user.username,
            name: user.name || '',
            image: user.image || '',
            verified: user.verified || false
          }
        }));

        const eventData = {
          post: {
            id: responseData.id || crypto.randomUUID(),
            fileUrl: fileUrl,
            caption: caption,
            location: location,
            aspectRatio: aspectRatio,
            user_id: session.user.id,
            user: {
              id: session.user.id,
              username: session.user.username,
              image: session.user.image,
              verified: session.user.verified || false
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            likes: [],
            comments: [],
            tags: tagsData,
            taggedUsers: taggedUsers
          }
        };
        
        console.log("[CreatePost] Response data from server:", responseData);
        console.log("[CreatePost] Session data:", {
          userId: session.user.id,
          username: session.user.username,
          image: session.user.image,
          verified: session.user.verified
        });
        console.log("[CreatePost] Constructed event data:", {
          postId: eventData.post.id,
          userId: eventData.post.user_id,
          username: eventData.post.user.username,
          createdAt: eventData.post.createdAt,
          caption: eventData.post.caption,
          location: eventData.post.location,
          tags: eventData.post.tags,
          taggedUsers: eventData.post.taggedUsers,
          fileUrl: eventData.post.fileUrl,
          aspectRatio: eventData.post.aspectRatio,
          fullPostData: eventData.post
        });
        
        updateStats({ posts: 1 });
        
        // Dispatch the event with the complete eventData object
        const event = new CustomEvent('newPost', { 
          detail: eventData,
          bubbles: true,
          composed: true
        });
        window.dispatchEvent(event);
      }
      
      toast.success("Post created successfully!");
      onClose();
      
      // Reset form
      setFile(null);
      setPreview("");
      setCaption("");
      setLocation("");
      setTaggedUsers([]);
    } catch (error) {
      toast.error("Something went wrong!");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl overflow-visible">
        <DialogHeader>
          <DialogTitle>Create new post</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!file ? (
            <div className="h-96 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
              <ImageIcon className="h-16 w-16 text-gray-400" />
              <Button
                onClick={() => inputRef.current?.click()}
                variant="default"
                className="mt-2"
                disabled={isUploading}
              >
                Select from gallery
              </Button>
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

          <div className="space-y-2">
            <Label htmlFor="tagPeople">Tag People</Label>
            <TagPeople
              onTagsChange={handleTaggedUsersChange}
              maxTags={10}
            />
          </div>

          <Button
            type="submit"
            disabled={!file || isLoading}
            className="w-full"
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isLoading ? "Posting..." : "Share"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
} 