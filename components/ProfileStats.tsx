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
      <div className="flex items-center justify-around md:justify-start md:gap-x-7 text-sm" suppressHydrationWarning>
        <span suppressHydrationWarning>
          <strong className="font-semibold">{profile.posts.length}</strong>{" "}
          posts
        </span>
        {(!profile.isPrivate || isCurrentUser || isFollowing) ? (
          <button onClick={() => setShowFollowersModal(true)}>
            <span className="hover:opacity-75 transition" suppressHydrationWarning>
              <strong className="font-semibold">
                {profile.followers.filter(f => f.status === "ACCEPTED").length}
              </strong>{" "}
              {profile.followers.filter(f => f.status === "ACCEPTED").length === 1 ? "follower" : "followers"}
            </span>
          </button>
        ) : (
          <span className="cursor-default" suppressHydrationWarning>
            <strong className="font-semibold">
              {profile.followers.filter(f => f.status === "ACCEPTED").length}
            </strong>{" "}
            {profile.followers.filter(f => f.status === "ACCEPTED").length === 1 ? "follower" : "followers"}
          </span>
        )}
        
        {(!profile.isPrivate || isCurrentUser || isFollowing) ? (
          <button onClick={() => setShowFollowingModal(true)}>
            <span className="hover:opacity-75 transition" suppressHydrationWarning>
              <strong className="font-semibold">
                {profile.following.filter(f => f.status === "ACCEPTED").length}
              </strong>{" "}
              following
            </span>
          </button>
        ) : (
          <span className="cursor-default" suppressHydrationWarning>
            <strong className="font-semibold">
              {profile.following.filter(f => f.status === "ACCEPTED").length}
            </strong>{" "}
            following
          </span>
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