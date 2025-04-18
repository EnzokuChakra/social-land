"use client";

import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Card } from "@/components/ui/card";
import { Play, MessageCircle, Heart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Reel, User } from "@prisma/client";

interface ProfileReelsProps {
  reels: (Reel & {
    comments: any[];
    likes: any[];
    user: User;
  })[];
}

export default function ProfileReels({ reels }: ProfileReelsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {reels.map((reel, index) => (
        <Link href={`/dashboard/reels/${reel.id}`} key={reel.id}>
          <Card className="group relative overflow-hidden rounded-lg">
            <AspectRatio ratio={9/16}>
              <Image
                src={reel.thumbnail}
                alt={reel.caption || "Reel"}
                fill
                priority={index === 0}
                className="object-cover transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="text-white">
                  <Play className="w-12 h-12" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white">
                <p className="text-sm font-medium truncate">{reel.caption}</p>
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <div className="flex items-center gap-1">
                    <Heart className="w-4 h-4" />
                    {reel.likes.length.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="w-4 h-4" />
                    {reel.comments.length.toLocaleString()}
                  </div>
                </div>
              </div>
            </AspectRatio>
          </Card>
        </Link>
      ))}
      {reels.length === 0 && (
        <div className="col-span-full text-center py-12">
          <h3 className="text-lg font-semibold">No Reels Yet</h3>
          <p className="text-muted-foreground mt-1">
            When you create reels, they will appear here.
          </p>
        </div>
      )}
    </div>
  );
} 