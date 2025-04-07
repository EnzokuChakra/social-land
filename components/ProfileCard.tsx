"use client";

import { UserWithExtras } from "@/lib/definitions";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Button } from "./ui/button";
import UserAvatar from "./UserAvatar";
import VerifiedBadge from "./VerifiedBadge";
import { useEffect, useState } from "react";

export default function ProfileCard({ profile }: { profile?: UserWithExtras }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, [profile]);

  // Show loading skeleton while not mounted or no profile
  if (!isMounted || !profile) {
    return (
      <div className="flex items-center justify-between mb-8 bg-white/20 dark:bg-black/20 rounded-xl /*backdrop-blur-sm*/ border border-neutral-200 dark:border-neutral-800 p-4">
        <div className="flex items-center gap-x-3">
          <div className="h-10 w-10 rounded-full bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
          <div className="flex flex-col gap-y-1">
            <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
            <div className="h-3 w-32 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
          </div>
        </div>
        <div className="h-8 w-20 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between mb-8 bg-white/20 dark:bg-black/20 rounded-xl /*backdrop-blur-sm*/ border border-neutral-200 dark:border-neutral-800 p-4">
      <Link href={`/dashboard/${profile.username}`} className="flex items-center gap-x-3">
        <UserAvatar user={profile} />
        <div className="flex flex-col">
          <div className="flex items-center gap-x-1">
            <span className="font-medium">{profile.username}</span>
            {profile.verified && <VerifiedBadge className="h-4 w-4" />}
          </div>
          <span className="text-neutral-600 dark:text-neutral-400 text-sm">
            {profile.name}
          </span>
        </div>
      </Link>
      <Button
        onClick={() => signOut()}
        size="sm"
        variant="ghost"
        className="text-sm font-semibold text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
      >
        Log out
      </Button>
    </div>
  );
} 