"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Hash, TrendingUp, UserPlus } from "lucide-react";
import Link from "next/link";

const trendingHashtags = [
  "#photography",
  "#nature",
  "#travel",
  "#food",
  "#fashion",
  "#art",
  "#music",
  "#fitness",
  "#technology",
  "#lifestyle",
];

const suggestedUsers = [
  {
    id: "1",
    username: "user1",
    name: "John Doe",
    image: "https://picsum.photos/200",
    followers: "1.2M",
  },
  {
    id: "2",
    username: "user2",
    name: "Jane Smith",
    image: "https://picsum.photos/201",
    followers: "800K",
  },
  {
    id: "3",
    username: "user3",
    name: "Mike Johnson",
    image: "https://picsum.photos/202",
    followers: "500K",
  },
  {
    id: "4",
    username: "user4",
    name: "Sarah Williams",
    image: "https://picsum.photos/203",
    followers: "300K",
  },
];

export default function ExploreSidebar() {
  return (
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

        {/* Suggested Users */}
        <div>
          <h2 className="font-semibold mb-4">Suggested Users</h2>
          <div className="space-y-4">
            {suggestedUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between">
                <Link
                  href={`/dashboard/${user.username}`}
                  className="flex items-center gap-3 group"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.image} />
                    <AvatarFallback>
                      {user.name[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium group-hover:underline">
                      {user.username}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {user.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user.followers} followers
                    </p>
                  </div>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
} 