"use client";

import { UserWithExtras } from "@/lib/definitions";
import UserListItem from "./UserListItem";

interface FollowersListProps {
  followers: UserWithExtras["followers"];
  user: UserWithExtras;
}

export default function FollowersList({ followers, user }: FollowersListProps) {
  return (
    <ul className="flex flex-col">
      {followers.map((follow) => (
        <UserListItem 
          key={follow.followerId} 
          user={follow.follower}
          isFollowing={follow.status === "ACCEPTED"}
        />
      ))}
    </ul>
  );
} 