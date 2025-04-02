"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonVariants } from "./ui/button";
import UserAvatar from "./UserAvatar";
import { useEffect, useState } from "react";
import { UserWithExtras } from "@/lib/definitions";
import { useNavbar } from "@/lib/hooks/use-navbar";
import { useSocket } from "@/hooks/use-socket";

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
  const [profile, setProfile] = useState<UserWithExtras | null>(null);
  const { isCollapsed } = useNavbar();
  const socket = useSocket();

  useEffect(() => {
    async function loadProfile() {
      if (user?.username) {
        try {
          const response = await fetch('/api/profile');
          if (!response.ok) {
            throw new Error('Failed to fetch profile');
          }
          const data = await response.json();
          setProfile(data);
        } catch (error) {
          console.error("[PROFILE_LINK] Error loading profile:", {
            error,
            errorMessage: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString()
          });
        }
      }
    }
    loadProfile();
  }, [user?.username]);

  useEffect(() => {
    if (!socket || !user?.id) return;

    const handleProfileUpdate = (data: { userId: string; image: string | null }) => {
      if (data.userId === user.id) {
        setProfile(prev => {
          if (!prev) return null;
          return { ...prev, image: data.image };
        });
      }
    };

    socket.on('profileUpdate', handleProfileUpdate);
    return () => {
      socket.off('profileUpdate', handleProfileUpdate);
    };
  }, [socket, user?.id]);

  // Use profile data if available, otherwise fallback to user data
  const avatarUser = profile || user;

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
      <UserAvatar user={avatarUser} className="h-8 w-8" />
      {!isCollapsed && (
        <span className="font-medium text-sm truncate">
          {avatarUser.username}
        </span>
      )}
    </Link>
  );
}
