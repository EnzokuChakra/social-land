import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export type FollowStatus = {
  isFollowing: boolean;
  hasPendingRequest: boolean;
  isFollowedByUser: boolean;
  hasPendingRequestFromUser: boolean;
  status: 'ACCEPTED' | 'PENDING' | null;
};

async function fetchFollowStatus(userId: string): Promise<FollowStatus> {
  const response = await fetch(`/api/users/follow/check?followingId=${userId}`, {
    credentials: 'include',
    headers: {
      'Cache-Control': 'no-cache',
    },
  });

  if (response.status === 401) {
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    throw new Error('Failed to fetch follow status');
  }

  return response.json();
}

export function useFollowStatus(userId: string | null) {
  const router = useRouter();
  const { data: session } = useSession();

  return useQuery({
    queryKey: ['followStatus', userId],
    queryFn: () => (userId ? fetchFollowStatus(userId) : null),
    enabled: !!userId && !!session,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message === 'Unauthorized') {
        router.push('/login');
        return false;
      }
      return failureCount < 2;
    }
  });
} 