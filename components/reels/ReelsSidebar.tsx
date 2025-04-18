"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Hash, TrendingUp } from "lucide-react";
import Link from "next/link";

const trendingHashtags = [
  "#reels",
  "#viral",
  "#trending",
  "#explore",
  "#fyp",
  "#foryou",
  "#foryoupage",
  "#reelsogram",
  "#reelitfeelit",
  "#reelkarofeelkaro",
];

const suggestedReels = [
  {
    id: 1,
    username: "user1",
    image: "https://picsum.photos/200",
    views: "1.2M",
  },
  {
    id: 2,
    username: "user2",
    image: "https://picsum.photos/201",
    views: "800K",
  },
  {
    id: 3,
    username: "user3",
    image: "https://picsum.photos/202",
    views: "500K",
  },
  {
    id: 4,
    username: "user4",
    image: "https://picsum.photos/203",
    views: "300K",
  },
];

export default function ReelsSidebar() {
  return (
    <div className="w-80 border-l border-border/40 bg-background/95 /*backdrop-blur supports-[backdrop-filter]:bg-background/60*/">
      <ScrollArea className="h-full">
        <div className="p-4 space-y-6">
          {/* Trending Hashtags */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5" />
              <h2 className="font-semibold">Trending Hashtags</h2>
            </div>
            <div className="space-y-2">
              {trendingHashtags.map((hashtag) => (
                <Link
                  key={hashtag}
                  href={`/dashboard/explore?tag=${hashtag.slice(1)}`}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  <Hash className="h-4 w-4" />
                  {hashtag}
                </Link>
              ))}
            </div>
          </div>

          {/* Suggested Reels */}
          <div>
            <h2 className="font-semibold mb-4">Suggested Reels</h2>
            <div className="space-y-4">
              {suggestedReels.map((reel) => (
                <Link
                  key={reel.id}
                  href={`/dashboard/reels/${reel.id}`}
                  className="flex items-center gap-3 group"
                >
                  <div className="relative w-16 h-28 rounded-lg overflow-hidden">
                    <img
                      src={reel.image}
                      alt={reel.username}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                  </div>
                  <div>
                    <p className="font-medium">@{reel.username}</p>
                    <p className="text-sm text-muted-foreground">{reel.views} views</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
} 