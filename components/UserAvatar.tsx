"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { AvatarProps } from "@radix-ui/react-avatar";
import type { User } from "next-auth";
import { UserWithExtras } from "@/lib/definitions";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useEffect, useState, useMemo } from "react";
import { useSocket } from "@/hooks/use-socket";

type UserAvatarUser = {
  id: string;
  username: string | null;
  name: string | null;
  image: string | null;
};

interface Props extends AvatarProps {
  user: UserAvatarUser | User | UserWithExtras | null;
  priority?: boolean;
}

export default function UserAvatar({ user, priority = false, className, ...avatarProps }: Props) {
  const [isMounted, setIsMounted] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(user?.image || null);
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const socket = useSocket();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setCurrentImage(user?.image || null);
  }, [user?.image]);

  useEffect(() => {
    if (!socket || !user?.id) return;

    const handleProfileUpdate = (data: { userId: string; image: string | null }) => {
      if (data.userId === user.id) {
        console.log("[UserAvatar] Received profile update:", data);
        setCurrentImage(data.image);
        setNeedsUpdate(true);
        // Reset the update flag after a short delay
        setTimeout(() => setNeedsUpdate(false), 1000);
      }
    };

    socket.on('updateProfile', handleProfileUpdate);
    return () => {
      socket.off('updateProfile', handleProfileUpdate);
    };
  }, [socket, user?.id]);

  const imageUrl = useMemo(() => {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
    
    if (!currentImage) return `${baseUrl}/images/profile_placeholder.webp`;
    
    // Handle absolute URLs
    if (currentImage.startsWith('http')) return currentImage;
    
    // Keep the /public prefix since it's needed in the URL
    return `${baseUrl}${currentImage}${needsUpdate ? `?t=${Date.now()}` : ''}`;
  }, [currentImage, needsUpdate]);

  const altText = user ? `${user.name || user.username || 'User'}'s profile picture` : 'User profile picture';

  if (!isMounted) {
    return null;
  }

  return (
    <Avatar className={cn(className)} {...avatarProps}>
      <div className="relative aspect-square h-full w-full">
        <Image
          src={imageUrl}
          alt={altText}
          referrerPolicy="no-referrer"
          priority={priority}
          fill
          sizes="(max-width: 768px) 77px, 150px"
          className="object-cover"
          unoptimized
        />
      </div>
    </Avatar>
  );
}
