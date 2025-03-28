"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share2, MoreVertical, Music2, UserPlus } from "lucide-react";
import Link from "next/link";
import { Reel } from "@/lib/definitions";
import Image from "next/image";

interface ReelItemProps {
  reel: Reel;
  isActive: boolean;
}

export default function ReelItem({ reel, isActive }: ReelItemProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    }
  }, [isActive]);

  const handleLike = () => {
    setIsLiked(!isLiked);
    // Add like functionality here
  };

  const handleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className="relative h-full w-full bg-black">
      {/* Video */}
      <video
        ref={videoRef}
        src={reel.videoUrl}
        className="h-full w-full object-cover"
        loop
        playsInline
      />

      {/* Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        {/* User Info */}
        <div className="flex items-center gap-3 mb-4">
          <Link href={`/dashboard/${reel.user.username}`}>
            <Avatar className="h-8 w-8">
              <AvatarImage src={reel.user.image || "/images/profile_placeholder.webp"} alt={reel.user.username} />
              <AvatarFallback>
                <Image
                  src="/images/profile_placeholder.webp"
                  alt={reel.user.username}
                  width={32}
                  height={32}
                  className="object-cover"
                />
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1">
            <Link 
              href={`/dashboard/${reel.user.username}`}
              className="text-white font-semibold hover:underline"
            >
              {reel.user.username}
            </Link>
            <p className="text-white/80 text-sm">{reel.caption}</p>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            className="text-white hover:text-white/80"
          >
            <UserPlus className="h-5 w-5" />
          </Button>
        </div>

        {/* Music Info */}
        <div className="flex items-center gap-2 mb-4">
          <Music2 className="h-4 w-4 text-white" />
          <span className="text-white text-sm">Original Sound</span>
          <div className="h-4 w-4 border-2 border-white rounded-full animate-spin" />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            className="text-white hover:text-white/80"
            onClick={handleLike}
          >
            <Heart className={`h-6 w-6 ${isLiked ? "fill-red-500 text-red-500" : ""}`} />
          </Button>
          <span className="text-white text-sm">{reel.likes}</span>

          <Button 
            variant="ghost" 
            size="icon"
            className="text-white hover:text-white/80"
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
          <span className="text-white text-sm">{reel.comments}</span>

          <Button 
            variant="ghost" 
            size="icon"
            className="text-white hover:text-white/80"
          >
            <Share2 className="h-6 w-6" />
          </Button>
          <span className="text-white text-sm">{reel.shares}</span>

          <Button 
            variant="ghost" 
            size="icon"
            className="text-white hover:text-white/80 ml-auto"
            onClick={handleMute}
          >
            <MoreVertical className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  );
} 