import { FollowingWithExtras } from "@/lib/definitions";
import { useSession } from "next-auth/react";
import UserListItem from "./UserListItem";

function Following({ following }: { following: FollowingWithExtras }) {
  const { data: session } = useSession();
  // We're already following these users since they're in our following list
  const isFollowing = true;  // These are users we follow, so always true
  const hasPendingRequest = false; // Can't be pending since we're already following

  if (!session) return null;

  return (
    <div className="p-4">
      <UserListItem
        user={following.following}
        isFollowing={isFollowing}
        hasPendingRequest={hasPendingRequest}
      />
    </div>
  );
}

export default Following;
