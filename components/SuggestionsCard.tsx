"use client";

import { Button } from "./ui/button";
import Suggestions from "./Suggestions";
import { UserWithExtras } from "@/lib/definitions";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";
import UserAvatar from "@/components/UserAvatar";
import FollowButton from "@/components/FollowButton";

interface SuggestionsCardProps {
  users: UserWithExtras[];
}

export default function SuggestionsCard({ users }: SuggestionsCardProps) {
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [displayedUsers, setDisplayedUsers] = useState(users.slice(0, 5));

  // Hide the card if there are no users to suggest
  if (!users || users.length === 0) return null;

  return (
    <>
      <div 
        className="bg-white/20 dark:bg-black/20 rounded-xl /*backdrop-blur-sm*/ border border-neutral-200 dark:border-neutral-800 overflow-hidden p-5 transition-all duration-300 ease-in-out hover:bg-white/30 dark:hover:bg-black/30"
        suppressHydrationWarning
      >
        <div 
          className="flex items-center justify-between mb-6"
          suppressHydrationWarning
        >
          <div 
            className="flex flex-col gap-1"
            suppressHydrationWarning
          >
            <span 
              className="font-semibold text-neutral-800 dark:text-neutral-200"
              suppressHydrationWarning
            >
              Suggested for you
            </span>
            <span 
              className="text-xs text-neutral-500 dark:text-neutral-400"
              suppressHydrationWarning
            >
              People you might be interested in following
            </span>
          </div>
          <Button
            onClick={() => setShowAllUsers(true)}
            size="sm"
            variant="ghost"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            suppressHydrationWarning
          >
            See All
          </Button>
        </div>
        <div suppressHydrationWarning>
          <Suggestions users={displayedUsers} className="mt-4" hideTitle />
        </div>
      </div>

      <Dialog 
        open={showAllUsers} 
        onOpenChange={setShowAllUsers}
      >
        <DialogContent className="max-w-md max-h-[85vh] p-0">
          <DialogHeader className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
            <DialogTitle className="text-center font-semibold text-neutral-800 dark:text-neutral-200">
              Suggested for you
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 overflow-y-auto">
            <Suggestions users={users} className="space-y-4" hideTitle />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 