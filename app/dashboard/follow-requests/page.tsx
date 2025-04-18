"use client";

import UserAvatar from "@/components/UserAvatar";
import { fetchProfile } from "@/lib/data";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import FollowRequestButtons from "@/components/FollowRequestButtons";

type FollowRequest = {
  id: string;
  status: string;
  followerId: string;
  follower: {
    id: string;
    username: string | null;
    name: string | null;
    image: string | null;
  };
};

export default function FollowRequestsPage() {
  const { data: session } = useSession();
  const [followRequests, setFollowRequests] = useState<FollowRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFollowRequests = async () => {
      if (!session?.user?.username) {
        console.log('FollowRequestsPage - No session or username available:', {
          session: !!session,
          username: session?.user?.username
        });
        return;
      }

      try {
        console.log('FollowRequestsPage - Fetching profile for user:', session.user.username);
        const profile = await fetchProfile(session.user.username);
        
        if (!profile) {
          console.log('FollowRequestsPage - No profile found');
          return;
        }

        console.log('FollowRequestsPage - Profile data:', {
          id: profile.id,
          username: profile.username,
          followingCount: profile.following.length,
          pendingCount: profile.following.filter(f => f.status === "PENDING").length
        });

        // Filter following with PENDING status and ensure they have follower info
        const pendingRequests = profile.following
          .filter(following => following.status === "PENDING")
          .map(following => ({
            id: following.followerId + following.followingId,
            status: following.status,
            followerId: following.followerId,
            follower: {
              id: following.follower.id,
              username: following.follower.username,
              name: following.follower.name,
              image: following.follower.image
            }
          }));

        console.log('FollowRequestsPage - Filtered pending requests:', pendingRequests);
        setFollowRequests(pendingRequests);
      } catch (error) {
        console.error("FollowRequestsPage - Error fetching follow requests:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFollowRequests();
  }, [session?.user?.username]);

  if (loading) {
    return (
      <div className="flex flex-col space-y-4 p-4">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="h-4 w-[150px]" />
          </div>
        </div>
      </div>
    );
  }

  if (followRequests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] p-4">
        <p className="text-neutral-600">No follow requests</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
      {followRequests.map((request) => {
        console.log('FollowRequestsPage - Rendering request:', {
          id: request.id,
          followerId: request.followerId,
          followerUsername: request.follower.username
        });
        
        return (
          <div
            key={request.id}
            className="flex items-center justify-between p-4"
          >
            <div className="flex items-center gap-3">
              <UserAvatar user={request.follower} />
              <div className="flex flex-col">
                <span className="font-semibold text-sm">
                  {request.follower.username}
                </span>
                <span className="text-neutral-600 dark:text-neutral-400 text-xs">
                  {request.follower.name}
                </span>
              </div>
            </div>
            <FollowRequestButtons followerId={request.followerId} />
          </div>
        );
      })}
    </div>
  );
} 