"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Image from "next/image";
import { memo } from "react";

interface UserAvatarProps {
  user: {
    id: string;
    username: string | null;
    name: string | null;
    image: string | null;
  };
  className?: string;
  size?: "default" | "lg" | "sm";
  priority?: boolean;
}

const sizeMap = {
  default: "h-8 w-8",
  lg: "h-12 w-12",
  sm: "h-6 w-6",
};

const UserAvatar = memo(({ 
  user, 
  className = "", 
  size = "default",
  priority = false
}: UserAvatarProps) => {
  const imageUrl = user?.image || "/images/profile_placeholder.webp";
  const imageSize = size === "lg" ? 48 : size === "sm" ? 24 : 32;
  const altText = user ? `${user.name || user.username || 'User'}'s profile picture` : 'User profile picture';

  return (
    <Avatar className={`${sizeMap[size]} ${className}`}>
      <AvatarImage
        asChild
        className="object-cover"
      >
        <Image
          src={imageUrl}
          alt={altText}
          width={imageSize}
          height={imageSize}
          priority={priority}
          className="object-cover"
          loading={priority ? "eager" : "lazy"}
          unoptimized={true}
        />
      </AvatarImage>
      <AvatarFallback>
        <Image
          src="/images/profile_placeholder.webp"
          alt="Profile placeholder"
          width={imageSize}
          height={imageSize}
          priority={true}
          className="object-cover"
          unoptimized={true}
        />
      </AvatarFallback>
    </Avatar>
  );
});

UserAvatar.displayName = "UserAvatar";

export default UserAvatar;
