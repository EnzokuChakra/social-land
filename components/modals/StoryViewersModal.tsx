"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import UserAvatar from "../UserAvatar";
import { formatDistanceToNow } from "date-fns";
import { Eye, Clock, Heart, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStoryModal } from "@/hooks/use-story-modal";

interface StoryViewer {
  id: string;
  user: {
    id: string;
    username: string;
    name: string | null;
    image: string | null;
  };
  createdAt: Date;
  liked: boolean;
}

interface StoryViewersModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewers: StoryViewer[];
}

export default function StoryViewersModal({ isOpen, onClose, viewers }: StoryViewersModalProps) {
  const router = useRouter();
  const storyModal = useStoryModal();

  // Format time to show '5h' or '10m' format
  const formatTime = (date: Date) => {
    const now = new Date();
    const viewDate = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - viewDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m`;
    }
    const diffInHours = Math.floor(diffInMinutes / 60);
    return `${diffInHours}h`;
  };

  const handleViewerClick = (username: string) => {
    // Close both modals
    onClose();
    storyModal.onClose();
    // Navigate to profile
    router.push(`/dashboard/${username}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 bg-black">
        <DialogHeader className="border-b border-neutral-800">
          <DialogTitle className="text-center font-semibold text-lg py-2 text-white">
            Story Viewers
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {viewers.length > 0 ? (
            viewers.map((viewer) => (
              <div
                key={viewer.id}
                className="flex items-center justify-between p-4 hover:bg-neutral-900 transition"
              >
                <Link
                  href={`/dashboard/${viewer.user.username}`}
                  className="flex items-center gap-3"
                >
                  <UserAvatar
                    user={viewer.user}
                    className="h-11 w-11"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-white">
                      {viewer.user.username}
                    </span>
                    {viewer.user.name && (
                      <span className="text-sm text-neutral-400">{viewer.user.name}</span>
                    )}
                  </div>
                </Link>
                <div className="flex items-center gap-3">
                  {viewer.liked && (
                    <Heart className="h-4 w-4 text-red-500 fill-red-500" />
                  )}
                  <div className="flex items-center gap-2 text-sm text-neutral-400">
                    <Clock className="h-4 w-4" />
                    <span>{formatTime(new Date(viewer.createdAt))}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-neutral-400">
              No viewers yet
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
} 