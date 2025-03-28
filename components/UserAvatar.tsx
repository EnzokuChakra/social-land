"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { AvatarProps } from "@radix-ui/react-avatar";
import type { User } from "next-auth";
import { UserWithExtras } from "@/lib/definitions";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useEffect, useState } from "react";

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

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const imageUrl = user?.image
    ? user.image.startsWith('http')
      ? user.image
      : user.image.startsWith('/')
        ? user.image
        : `/uploads/${user.image}`
    : "/images/profile_placeholder.webp";

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
        />
      </div>
    </Avatar>
  );
}
