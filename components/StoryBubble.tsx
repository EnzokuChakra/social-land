"use client";

import { User } from "@prisma/client";
import { cn } from "@/lib/utils";
import UserAvatar from "./UserAvatar";
import { useStoryModal } from "@/hooks/use-story-modal";

type MinimalUser = Pick<User, "id" | "username" | "image" | "name">;

interface StoryBubbleProps {
  user: MinimalUser;
  hasStory: boolean;
  isOwn: boolean;
  viewed: boolean;
}

export default function StoryBubble({ user, hasStory, isOwn, viewed }: StoryBubbleProps) {
  const storyModal = useStoryModal();

  const handleClick = () => {
    if (hasStory) {
      storyModal.setUserId(user.id);
      storyModal.onOpen();
    }
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex flex-col items-center space-y-1",
        !hasStory && "cursor-default"
      )}
    >
      <div
        className={cn(
          "rounded-full flex items-center justify-center",
          hasStory && !viewed && "bg-gradient-to-tr from-yellow-400 to-fuchsia-600 p-[2px]",
          hasStory && viewed && "bg-neutral-300 dark:bg-neutral-700 p-[2px]",
          !hasStory && isOwn && "bg-neutral-200 dark:bg-neutral-800 p-[2px]",
          !hasStory && !isOwn && "p-0"
        )}
      >
        <div className="rounded-full bg-white dark:bg-black p-[2px]">
          <UserAvatar
            user={user}
            className="h-14 w-14"
          />
        </div>
      </div>
      <span className="text-xs truncate max-w-[64px]">
        {isOwn ? "Your story" : user.username}
      </span>
    </button>
  );
} 