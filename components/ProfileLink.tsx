"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonVariants } from "./ui/button";
import UserAvatar from "./UserAvatar";
import { useEffect, useState, useRef } from "react";
import { UserWithExtras } from "@/lib/definitions";
import { useNavbar } from "@/lib/hooks/use-navbar";
import { getSocket } from "@/lib/socket";
import VerifiedBadge from "./VerifiedBadge";

interface ProfileLinkProps {
  user: {
    id: string;
    username: string | null;
    name: string | null;
    image: string | null;
    verified?: boolean;
    isPrivate?: boolean;
  };
  className?: string;
}

export default function ProfileLink({ user, className }: ProfileLinkProps) {
  const pathname = usePathname();
  const href = `/dashboard/${user.username}`;
  const isActive = pathname === href;
  const { isCollapsed } = useNavbar();
  const socket = getSocket();
  const [profileImage, setProfileImage] = useState<string | null>(user.image);

  // Update profileImage when user.image changes
  useEffect(() => {
    if (user?.image !== profileImage) {
      setProfileImage(user.image);
    }
  }, [user.image]);

  // Fetch actual profile data from API for current user
  useEffect(() => {
    if (user?.id) {
      fetch('/api/profile')
        .then(res => res.json())
        .then(data => {
          if (data?.image && data.image !== profileImage) {
            setProfileImage(data.image);
          }
        })
        .catch(() => {
          // Silently handle error
        });
    }
  }, [user?.id]);

  useEffect(() => {
    if (!socket || !user?.id) return;

    const handleProfileUpdate = (data: { userId: string; image: string | null }) => {
      if (data.userId === user.id) {
        setProfileImage(data.image);
      }
    };

    socket.on('updateProfile', handleProfileUpdate);
    return () => {
      socket.off('updateProfile', handleProfileUpdate);
    };
  }, [socket, user?.id, profileImage]);

  return (
    <Link
      href={href}
      className={cn(
        buttonVariants({ variant: "ghost", size: "lg" }),
        "w-full flex items-center py-3",
        "transition-all duration-200",
        "hover:bg-neutral-100 dark:hover:bg-neutral-800/50",
        isActive && "bg-neutral-100 dark:bg-neutral-800/50",
        isCollapsed ? "justify-center px-3" : "justify-start px-4 gap-4",
        className
      )}
    >
      <UserAvatar user={{...user, image: profileImage}} className="h-8 w-8" priority={true} />
      {!isCollapsed && (
        <div className="text-sm tracking-wide whitespace-nowrap">
          <div className="flex items-center gap-1">
            <span className="font-medium truncate">
              {user.username}
            </span>
            {user.verified && (
              <VerifiedBadge className="h-4 w-4" />
            )}
          </div>
        </div>
      )}
    </Link>
  );
}
