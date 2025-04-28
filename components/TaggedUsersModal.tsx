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
import { ScrollArea } from "./ui/scroll-area";
import { Input } from "./ui/input";
import { Search } from "lucide-react";
import { useState } from "react";

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
  const [searchQuery, setSearchQuery] = useState('');
  
  if (!tags || tags.length === 0) return null;

  // Filter tags based on search query
  const filteredTags = searchQuery.trim() 
    ? tags.filter(tag => {
        const query = searchQuery.toLowerCase();
        return (
          tag.user.username?.toLowerCase().includes(query) ||
          tag.user.name?.toLowerCase().includes(query)
        );
      })
    : tags;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 bg-black">
        <DialogHeader className="border-b border-neutral-800">
          <DialogTitle className="text-center font-semibold text-lg py-2 text-white">
            Tagged People
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-4 border-b border-neutral-800">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-neutral-400" />
            <Input
              placeholder="Search"
              className="pl-8 bg-neutral-900 text-white placeholder:text-neutral-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <ScrollArea className="max-h-[60vh]">
          {filteredTags.length > 0 ? (
            filteredTags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center justify-between p-4 hover:bg-neutral-900 transition"
              >
                <Link
                  href={`/dashboard/${tag.user.username}`}
                  className="flex items-center gap-3"
                >
                  <UserAvatar
                    user={tag.user}
                    className="h-11 w-11"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-white">
                      {tag.user.username}
                      {tag.user.verified && (
                        <VerifiedBadge className="h-4 w-4 ml-1 inline-block" />
                      )}
                    </span>
                    {tag.user.name && (
                      <span className="text-sm text-neutral-400">{tag.user.name}</span>
                    )}
                  </div>
                </Link>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-neutral-400">
              No tagged users found
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
} 