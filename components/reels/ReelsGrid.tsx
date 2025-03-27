"use client";

import Link from "next/link";
import Image from "next/image";
import { MessageCircle, Heart, Play } from "lucide-react";

interface ReelsGridProps {
  reels: {
    id: string;
    thumbnail: string;
    fileUrl: string;
    caption: string | null;
    _count: {
      likes: number;
      comments: number;
    };
  }[];
}

export default function ReelsGrid({ reels }: ReelsGridProps) {
  if (!reels?.length) {
    return null;
  }

  return (
    <div className="grid grid-cols-3 gap-1 sm:gap-4">
      {reels.map((reel, index) => (
        <Link
          key={reel.id}
          href={`/dashboard/reels/${reel.id}`}
          className="relative aspect-[16/10] bg-muted rounded-md overflow-hidden group"
        >
          <Image
            src={reel.thumbnail}
            alt={reel.caption || "Reel thumbnail"}
            fill
            priority={index === 0}
            className="object-cover"
            sizes="(max-width: 768px) 33vw, 288px"
          />
          
          {/* Play Button Overlay */}
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Play className="w-12 h-12 text-white" />
          </div>

          {/* Stats Overlay */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-white">
                <Heart className="w-4 h-4" />
                <span className="text-sm font-medium">{reel._count.likes}</span>
              </div>
              <div className="flex items-center gap-1 text-white">
                <MessageCircle className="w-4 h-4" />
                <span className="text-sm font-medium">{reel._count.comments}</span>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
} 