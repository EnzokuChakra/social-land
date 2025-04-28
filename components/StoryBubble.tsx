"use client";

import { cn } from "@/lib/utils";
import UserAvatar from "./UserAvatar";
import { useStoryModal } from "@/hooks/use-story-modal";
import { User } from "@/lib/definitions";
import { useEffect, useMemo } from "react";

type MinimalUser = Pick<User, "id" | "username" | "image" | "name">;

interface StoryBubbleProps {
  user: MinimalUser;
  hasStory: boolean;
  isOwn: boolean;
  viewed: boolean;
}

export default function StoryBubble({ user, hasStory, isOwn, viewed }: StoryBubbleProps) {
  const storyModal = useStoryModal();

  // Memoize the user object to prevent unnecessary re-renders
  const memoizedUser = useMemo(() => ({
    ...user,
    hasActiveStory: hasStory,
    verified: false
  }), [user, hasStory]);

  // Log status on mount and when props change
  useEffect(() => {
    console.log(`[STORY_RING] StoryBubble - User: ${user.username}, hasStory: ${hasStory}, isOwn: ${isOwn}, viewed: ${viewed}`);
  }, [user.username, hasStory, isOwn, viewed]);

  const handleClick = () => {
    if (hasStory) {
      console.log(`[STORY_RING] Clicked story bubble - User: ${user.username}, isOwn: ${isOwn}, viewed: ${viewed}`);
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
          "rounded-full h-[62px] w-[62px] flex items-center justify-center p-[2px]",
          hasStory && !viewed && "bg-gradient-to-tr from-yellow-400 to-fuchsia-600",
          hasStory && viewed && "bg-gray-400 dark:bg-gray-400", 
          !hasStory && isOwn && "bg-transparent"
        )}
      >
        <div className="rounded-full bg-white dark:bg-black p-[2px] h-full w-full flex items-center justify-center">
          <UserAvatar
            user={memoizedUser}
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