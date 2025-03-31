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
          console.log('[ProfileLink] Initial profile loaded:', data);
          setProfile(data);
        } catch (error) {
          console.error('Error loading profile:', error);
        }
      }
    }
    loadProfile();
  }, [user?.username]);

  useEffect(() => {
    if (!socket || !user?.id) return;

    const handleProfileUpdate = (data: { userId: string; image: string | null }) => {
      console.log('[ProfileLink] Received profile update:', { data, userId: user.id });
      if (data.userId === user.id) {
        console.log('[ProfileLink] Updating profile image');
        setProfile(prev => {
          if (!prev) return null;
          const updated = { ...prev, image: data.image };
          console.log('[ProfileLink] Updated profile:', updated);
          return updated;
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
        buttonVariants({
          variant: "ghost",
          size: "lg",
          className: cn(
            "w-full transition-all",
            isCollapsed ? "justify-center px-3" : "justify-start px-4 gap-x-4",
            className
          )
        }),
        isActive && "font-semibold bg-neutral-100 dark:bg-neutral-800/50"
      )}
    >
      <div className="relative">
        <UserAvatar
          user={avatarUser}
          priority={true}
          className={cn(
            "h-8 w-8",
            isActive && "ring-1 ring-black dark:ring-white"
          )}
        />
      </div>

      {!isCollapsed && (
        <span className={cn(
          "text-sm",
          isActive && "font-semibold"
        )}>
          Profile
        </span>
      )}
    </Link>
  );
}
