"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import UserAvatar from "./UserAvatar";

interface Props {
  profile: {
    id: string;
    username: string | null;
    name?: string | null;
    image?: string | null;
    bio?: string | null;
    followers?: any[];
    following?: any[];
  };
  hasStories?: boolean;
  stories?: any[];
  reelsEnabled?: boolean;
  isCurrentUser?: boolean;
}

export default function ProfileHeader({ profile, hasStories = false, stories = [], reelsEnabled = false, isCurrentUser = false }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);

  if (!profile || !profile.username) return null;

  const handlePrevStory = () => {
    setCurrentStoryIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNextStory = () => {
    setCurrentStoryIndex((prev) => Math.min(stories.length - 1, prev + 1));
  };

  return (
    <div className="flex flex-col items-center gap-4 py-4 md:py-8">
      <button
        className={cn(
          "rounded-full",
          hasStories && "p-1 bg-gradient-to-tr from-yellow-400 to-fuchsia-600"
        )}
        onClick={() => hasStories && setIsOpen(true)}
        disabled={!hasStories}
      >
        <div className={cn("rounded-full", hasStories && "p-0.5 bg-white")}>
          <UserAvatar
            user={profile}
            className="h-20 w-20 md:h-24 md:w-24 border-2"
            priority={true}
          />
        </div>
      </button>

      <div className="flex flex-col items-center gap-2 px-4 w-full">
        <h1 className="text-xl md:text-2xl font-semibold">{profile.username}</h1>
        {profile.name && (
          <p className="text-sm md:text-base text-muted-foreground">{profile.name}</p>
        )}
        <div className="flex items-center justify-around w-full max-w-xs text-sm text-muted-foreground">
          <Link href={`/dashboard/${profile.username}/followers`} className="hover:text-foreground transition">
            <span className="font-semibold text-foreground">{profile.followers?.length || 0}</span>{" "}
            {profile.followers?.length === 1 ? "follower" : "followers"}
          </Link>
          <Link href={`/dashboard/${profile.username}/following`} className="hover:text-foreground transition">
            <span className="font-semibold text-foreground">{profile.following?.length || 0}</span>{" "}
            following
          </Link>
        </div>
        {profile.bio && (
          <p className="text-sm md:text-base text-center max-w-xs md:max-w-md">{profile.bio}</p>
        )}
      </div>

      {hasStories && stories.length > 0 && (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-md p-0 h-[calc(100vh-2rem)] overflow-hidden bg-black">
            <DialogTitle className="sr-only">View Profile Story</DialogTitle>
            <div className="relative w-full h-full flex items-center justify-center">
              <Image
                src={stories[currentStoryIndex].fileUrl}
                alt="Story"
                fill
                className="object-contain"
                style={{ transform: `scale(${stories[currentStoryIndex].scale})` }}
                priority
              />

              {/* Progress bar */}
              <div className="absolute top-4 left-4 right-4 flex gap-1">
                {stories.map((_, index) => (
                  <div
                    key={index}
                    className={cn(
                      "h-0.5 bg-white/50 flex-1 rounded-full overflow-hidden",
                      index === currentStoryIndex && "bg-white"
                    )}
                  />
                ))}
              </div>

              {/* User info */}
              <div className="absolute top-8 left-4 flex items-center gap-2">
                <UserAvatar
                  user={profile}
                  className="h-8 w-8"
                  priority={true}
                />
                <span className="text-white font-semibold">{profile.username}</span>
              </div>

              {/* Close button */}
              <Button
                size="icon"
                variant="ghost"
                className="absolute top-8 right-4 text-white hover:text-white"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-6 w-6" />
              </Button>

              {/* Navigation buttons */}
              {currentStoryIndex > 0 && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute left-4 text-white hover:text-white"
                  onClick={handlePrevStory}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
              )}
              {currentStoryIndex < stories.length - 1 && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute right-4 text-white hover:text-white"
                  onClick={handleNextStory}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
