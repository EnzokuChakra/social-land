"use client";

import { useRouter } from "next/navigation";
import { UserWithExtras } from "@/lib/definitions";
import FollowersModal from "./FollowersModal";
import FollowingModal from "./FollowingModal";
import { useState } from "react";

interface Props {
  profile: UserWithExtras;
  isCurrentUser: boolean;
  isFollowing: boolean;
}

export default function ProfileStats({ profile, isCurrentUser, isFollowing }: Props) {
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);

  // Ensure username is not null
  const username = profile.username || '';

  return (
    <>
      <div className="flex items-center justify-around w-full md:justify-start md:gap-x-10 text-sm" suppressHydrationWarning>
        <div className="flex flex-col items-center md:items-start">
          <span suppressHydrationWarning>
            <strong className="font-semibold text-lg md:text-base">{profile.posts.length}</strong>
          </span>
          <span className="text-neutral-500 dark:text-neutral-400 text-[11px] md:text-sm tracking-wide uppercase">posts</span>
        </div>
        {(!profile.isPrivate || isCurrentUser || isFollowing) ? (
          <button 
            onClick={() => setShowFollowersModal(true)} 
            className="flex flex-col items-center md:items-start transition-transform active:scale-95"
          >
            <span className="hover:opacity-75 transition" suppressHydrationWarning>
              <strong className="font-semibold text-lg md:text-base">
                {profile.followers.filter(f => f.status === "ACCEPTED").length}
              </strong>
            </span>
            <span className="text-neutral-500 dark:text-neutral-400 text-[11px] md:text-sm tracking-wide uppercase">
              {profile.followers.filter(f => f.status === "ACCEPTED").length === 1 ? "follower" : "followers"}
            </span>
          </button>
        ) : (
          <div className="flex flex-col items-center md:items-start">
            <span className="cursor-default" suppressHydrationWarning>
              <strong className="font-semibold text-lg md:text-base">
                {profile.followers.filter(f => f.status === "ACCEPTED").length}
              </strong>
            </span>
            <span className="text-neutral-500 dark:text-neutral-400 text-[11px] md:text-sm tracking-wide uppercase">
              {profile.followers.filter(f => f.status === "ACCEPTED").length === 1 ? "follower" : "followers"}
            </span>
          </div>
        )}
        {(!profile.isPrivate || isCurrentUser || isFollowing) ? (
          <button 
            onClick={() => setShowFollowingModal(true)} 
            className="flex flex-col items-center md:items-start transition-transform active:scale-95"
          >
            <span className="hover:opacity-75 transition" suppressHydrationWarning>
              <strong className="font-semibold text-lg md:text-base">
                {profile.following.filter(f => f.status === "ACCEPTED").length}
              </strong>
            </span>
            <span className="text-neutral-500 dark:text-neutral-400 text-[11px] md:text-sm tracking-wide uppercase">following</span>
          </button>
        ) : (
          <div className="flex flex-col items-center md:items-start">
            <span className="cursor-default" suppressHydrationWarning>
              <strong className="font-semibold text-lg md:text-base">
                {profile.following.filter(f => f.status === "ACCEPTED").length}
              </strong>
            </span>
            <span className="text-neutral-500 dark:text-neutral-400 text-[11px] md:text-sm tracking-wide uppercase">following</span>
          </div>
        )}
      </div>

      {showFollowersModal && (
        <FollowersModal
          followers={profile.followers}
          username={username}
          isPrivate={profile.isPrivate}
          isFollowing={isFollowing}
          onClose={() => setShowFollowersModal(false)}
        />
      )}

      {showFollowingModal && (
        <FollowingModal
          following={profile.following}
          username={username}
          isPrivate={profile.isPrivate}
          isFollowing={isFollowing}
          onClose={() => setShowFollowingModal(false)}
        />
      )}
    </>
  );
} 