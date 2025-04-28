"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useInView } from "react-intersection-observer";
import { Heart, MessageCircle, Volume2, VolumeX, Play, Pause, UserCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";

interface ReelProps {
  reel: {
    id: string;
    caption: string | null;
    fileUrl: string;
    thumbnail: string;
    views: number;
    createdAt: string;
    user: {
      id: string;
      username: string;
      image: string | null;
      verified: boolean;
    };
    _count: {
      likes: number;
      comments: number;
    };
    isLiked: boolean;
  };
}

export default function ReelCard({ reel }: ReelProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLiked, setIsLiked] = useState(reel.isLiked);
  const [likesCount, setLikesCount] = useState(reel._count.likes);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const { ref: inViewRef, inView } = useInView({
    threshold: 0.7,
  });

  useEffect(() => {
    if (!videoRef.current) return;

    if (inView) {
      videoRef.current.play().catch(() => {
        setIsPlaying(false);
      });
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [inView]);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = isMuted;
    videoRef.current.volume = volume;
  }, [isMuted, volume]);

  const togglePlay = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {
        setIsPlaying(false);
      });
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
    setDuration(videoRef.current.duration);
  };

  const handleSeek = (value: number[]) => {
    if (!videoRef.current) return;
    const newTime = value[0];
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleLike = async () => {
    try {
      const response = await fetch(`/api/reels/${reel.id}/like`, {
        method: isLiked ? "DELETE" : "POST",
      });

      if (response.ok) {
        setIsLiked(!isLiked);
        setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      toast.error("Failed to like reel");
    }
  };

  return (
    <Card 
      className="relative overflow-hidden bg-background dark:bg-background border-border"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* User Info Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex items-center gap-3">
          <Link 
            href={`/dashboard/${reel.user.username}`}
            className="shrink-0 transition-transform hover:scale-105"
          >
            <Avatar className="h-12 w-12 border-2 border-primary ring-2 ring-background">
              <AvatarImage
                src={reel.user.image || "/images/placeholder-avatar.png"}
                alt={reel.user.username}
              />
              <AvatarFallback>
                {reel.user.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <Link 
              href={`/dashboard/${reel.user.username}`}
              className="inline-flex items-center gap-1.5 text-white hover:underline font-medium"
            >
              <span className="truncate">{reel.user.username}</span>
              {reel.user.verified && (
                <UserCheck className="h-4 w-4 text-blue-500 shrink-0" />
              )}
            </Link>
            <p className="text-sm text-gray-300">
              {formatDistanceToNow(new Date(reel.createdAt))} ago
            </p>
          </div>
        </div>
      </div>

      {/* Video Container */}
      <div 
        ref={inViewRef}
        className="relative aspect-[16/10] bg-black cursor-pointer group"
        onClick={togglePlay}
      >
        <video
          ref={videoRef}
          src={reel.fileUrl}
          poster={reel.thumbnail}
          loop
          playsInline
          onTimeUpdate={handleTimeUpdate}
          className="absolute inset-0 w-full h-full object-contain bg-black"
        />
        
        {/* Play/Pause Overlay */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {isPlaying ? (
            <Pause className="w-16 h-16 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          ) : (
            <Play className="w-16 h-16 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>

        {/* Video Controls */}
        <div 
          className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent transition-opacity ${isHovering ? 'opacity-100' : 'opacity-0'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="space-y-2">
            {/* Progress Bar */}
            <div className="flex items-center gap-2 text-white text-xs">
              <span>{formatTime(currentTime)}</span>
              <div className="flex-1" onClick={(e) => e.stopPropagation()}>
                <Slider
                  value={[currentTime]}
                  min={0}
                  max={duration || 100}
                  step={1}
                  onValueChange={handleSeek}
                />
              </div>
              <span>{formatTime(duration)}</span>
            </div>

            {/* Volume Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMute();
                }}
                className="text-white hover:text-primary"
              >
                {isMuted ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </Button>
              <div onClick={(e) => e.stopPropagation()}>
                <Slider
                  value={[volume]}
                  min={0}
                  max={1}
                  step={0.1}
                  onValueChange={handleVolumeChange}
                  className="w-24"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLike}
            className={`hover:text-red-500 transition-colors ${isLiked ? "text-red-500" : "text-foreground"}`}
          >
            <Heart className={`h-6 w-6 ${isLiked ? "fill-current" : ""}`} />
          </Button>
          
          <Link href={`/dashboard/reels/${reel.id}`}>
            <Button variant="ghost" size="icon" className="text-foreground hover:text-primary">
              <MessageCircle className="h-6 w-6" />
            </Button>
          </Link>

          <div className="ml-auto text-sm text-muted-foreground">
            {reel.views.toLocaleString()} views
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">{likesCount.toLocaleString()}{' '}likes</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">
              {formatDistanceToNow(new Date(reel.createdAt), { addSuffix: true })}
            </span>
          </div>

          {reel.caption && (
            <p className="text-sm text-foreground line-clamp-2">
              <Link
                href={`/dashboard/${reel.user.username}`}
                className="font-medium hover:underline mr-2"
              >
                {reel.user.username}
              </Link>
              {reel.caption}
            </p>
          )}

          <Link
            href={`/dashboard/reels/${reel.id}`}
            className="text-muted-foreground text-sm hover:underline block"
          >
            View all {reel._count.comments.toLocaleString()} comments
          </Link>
        </div>
      </div>
    </Card>
  );
} 