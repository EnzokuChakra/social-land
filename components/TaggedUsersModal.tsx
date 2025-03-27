"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PostTag } from "@/lib/definitions";
import Link from "next/link";
import UserAvatar from "./UserAvatar";
import VerifiedBadge from "./VerifiedBadge";

interface TaggedUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  tags?: PostTag[];
}

export default function TaggedUsersModal({
  isOpen,
  onClose,
  tags = []
}: TaggedUsersModalProps) {
  if (!tags || tags.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="dialogContent max-w-md h-[80vh] flex flex-col bg-white dark:bg-neutral-950">
        <DialogHeader className="border-b border-neutral-200 dark:border-neutral-800 px-4 py-4">
          <DialogTitle className="text-center font-medium text-base">
            Tagged People
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-800">
            {tags.map((tag) => (
              <div key={tag.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Link href={`/dashboard/${tag.user.username}`}>
                    <UserAvatar user={tag.user} className="h-9 w-9" />
                  </Link>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1">
                      <Link href={`/dashboard/${tag.user.username}`} className="font-semibold text-sm hover:underline">
                        {tag.user.username}
                      </Link>
                      {tag.user.verified && <VerifiedBadge className="h-3.5 w-3.5" />}
                    </div>
                    {tag.user.name && (
                      <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-1">
                        {tag.user.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 