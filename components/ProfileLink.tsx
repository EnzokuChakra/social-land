"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonVariants } from "./ui/button";
import UserAvatar from "./UserAvatar";
import { useEffect, useState, useRef } from "react";
import { UserWithExtras } from "@/lib/definitions";
import { useNavbar } from "@/lib/hooks/use-navbar";
import { useSocket } from "@/hooks/use-socket";
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
  const socket = useSocket();

  useEffect(() => {
    if (!socket || !user?.id) return;

    const handleProfileUpdate = (data: { userId: string; image: string | null }) => {
      if (data.userId === user.id) {
        user.image = data.image;
      }
    };

    socket.on('profileUpdate', handleProfileUpdate);
    return () => {
      socket.off('profileUpdate', handleProfileUpdate);
    };
  }, [socket, user?.id]);

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-4 py-2 rounded-lg transition-colors",
        "hover:bg-neutral-100 dark:hover:bg-neutral-800",
        isActive && "bg-neutral-100 dark:bg-neutral-800",
        className
      )}
    >
      <UserAvatar user={user} className="h-8 w-8" priority={true} />
      {!isCollapsed && (
        <div className="flex items-center gap-1">
          <span className="font-medium text-sm truncate">
            {user.username}
          </span>
          {user.verified && (
            <VerifiedBadge className="h-4 w-4" />
          )}
        </div>
      )}
    </Link>
  );
}
