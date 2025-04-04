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
        setCurrentImage(data.image);
        setNeedsUpdate(true);
        // Reset the update flag after a short delay
        setTimeout(() => setNeedsUpdate(false), 1000);
      }
    };

    socket.on('profileUpdate', handleProfileUpdate);
    return () => {
      socket.off('profileUpdate', handleProfileUpdate);
    };
  }, [socket, user?.id]);

  const imageUrl = useMemo(() => {
    if (!currentImage) return "/images/profile_placeholder.webp";
    
    const baseUrl = currentImage.startsWith('http')
      ? currentImage
      : currentImage.startsWith('/')
        ? currentImage
        : `/uploads/${currentImage}`;
    
    // Only add timestamp when there's an actual update
    return needsUpdate ? `${baseUrl}?t=${Date.now()}` : baseUrl;
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
