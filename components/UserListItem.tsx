import Link from "next/link";
import { UserWithExtras } from "@/lib/definitions";
import UserAvatar from "./UserAvatar";
import { useSession } from "next-auth/react";
import FollowButton from "./FollowButton";
import VerifiedBadge from "./VerifiedBadge";

type UserListItemUser = {
  id: string;
  username: string | null;
  name: string | null;
  image: string | null;
  verified?: boolean;
  isPrivate?: boolean;
  followers?: { followerId: string; status: "ACCEPTED" | "PENDING" }[];
};

interface UserListItemProps {
  user: UserListItemUser;
  isFollowing?: boolean;
  hasPendingRequest?: boolean;
  isFollowedByUser?: boolean;
}

export default function UserListItem({ 
  user, 
  isFollowing = false,
  hasPendingRequest = false,
  isFollowedByUser = false
}: UserListItemProps) {
  const { data: session } = useSession();
  const isCurrentUser = session?.user?.id === user.id;

  if (!session) return null;

  return (
    <div className="flex items-center justify-between gap-2 w-full">
      <Link 
        href={`/dashboard/${user.username}`}
        className="flex items-center gap-2 hover:opacity-75 transition flex-1"
      >
        <UserAvatar user={user} className="h-10 w-10" />
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            <p className="font-semibold text-sm">{user.username}</p>
            {user.verified && <VerifiedBadge className="h-3.5 w-3.5" />}
          </div>
          {user.name && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{user.name}</p>
          )}
        </div>
      </Link>
      
      {!isCurrentUser && (
        <FollowButton
          followingId={user.id}
          isFollowing={isFollowing}
          hasPendingRequest={hasPendingRequest}
          isPrivate={user.isPrivate}
          isFollowedByUser={isFollowedByUser}
          buttonClassName="!px-6"
        />
      )}
    </div>
  );
} 