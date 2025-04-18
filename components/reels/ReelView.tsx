"use client";

import { useState, useRef, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { Heart, MessageCircle, Volume2, VolumeX, Play, Pause, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import Link from "next/link";
import { CommentForm } from "@/components/comments/CommentForm";
import { CommentList } from "@/components/comments/CommentList";
import VerifiedBadge from "@/components/VerifiedBadge";
import Image from "next/image";

interface User {
  id: string;
  username: string;
  image: string | null;
  name: string | null;
  verified: boolean;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: User;
}

interface Like {
  user_id: string;
}

interface Reel {
  id: string;
  caption: string | null;
  fileUrl: string;
  thumbnail: string;
  views: number;
  createdAt: string;
  user: User;
  likes: Like[];
  comments: Comment[];
}

interface ReelViewProps {
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
      name: string | null;
      verified: boolean;
    };
    likes: { user_id: string }[];
    comments: {
      id: string;
      content: string;
      createdAt: string;
      user: {
        id: string;
        username: string;
        image: string | null;
        name: string | null;
        verified: boolean;
      };
    }[];
    likesCount?: number;
    commentsCount?: number;
  };
}

export default function ReelView({ reel }: ReelViewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLiked, setIsLiked] = useState(reel.likes.length > 0);
  const [likesCount, setLikesCount] = useState(reel.likesCount || reel.likes.length);
  const [commentsCount, setCommentsCount] = useState(reel.commentsCount || reel.comments.length);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [comments, setComments] = useState(reel.comments);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Check if the current user has liked the reel
    const checkLiked = async () => {
      try {
        const response = await fetch(`/api/reels/${reel.id}/isLiked`);
        if (response.ok) {
          const data = await response.json();
          setIsLiked(data.isLiked);
        }
      } catch (error) {
        console.error("Error checking like status:", error);
      }
    };
    checkLiked();
  }, [reel.id]);

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

  const handleComment = async (content: string) => {
    try {
      const response = await fetch(`/api/reels/${reel.id}/comment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error("Failed to post comment");
      }

      const newComment = await response.json();
      setComments(prev => [newComment, ...prev]);
      setCommentsCount(prev => prev + 1);
      toast.success("Comment posted successfully");
    } catch (error) {
      console.error("Error posting comment:", error);
      toast.error("Failed to post comment");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Video Section */}
      <Card 
        className="relative overflow-hidden bg-background dark:bg-background border-border"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Header */}
        <div className="p-4 flex items-center gap-3">
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
          <div>
            <div className="flex items-center gap-1">
              <Link
                href={`/dashboard/${reel.user.username}`}
                className="font-medium hover:underline"
              >
                {reel.user.username}
              </Link>
              {reel.user.verified && <VerifiedBadge />}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(reel.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>

        {/* Video Container */}
        <div 
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
              <p className="text-sm text-foreground">
                <Link
                  href={`/dashboard/${reel.user.username}`}
                  className="font-medium hover:underline mr-2"
                >
                  {reel.user.username}
                </Link>
                {reel.caption}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Comments Section */}
      <Card className="flex flex-col h-[600px]">
        <div className="p-4 border-b">
          <h3 className="font-medium">Comments ({commentsCount})</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {comments.length > 0 ? (
            <CommentList comments={comments} />
          ) : (
            <p className="text-center text-muted-foreground">No comments yet. Be the first to comment!</p>
          )}
        </div>
        <div className="p-4 border-t mt-auto">
          <CommentForm 
            onSubmit={handleComment} 
            placeholder="Add a comment..."
            buttonText="Post"
          />
        </div>
      </Card>
    </div>
  );
} 