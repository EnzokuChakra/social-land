import { useQuery } from '@tanstack/react-query';

interface FollowStatus {
  status: 'ACCEPTED' | 'PENDING' | null;
  isFollowing: boolean;
  hasPendingRequest: boolean;
  isFollowedByUser: boolean;
}

async function fetchFollowStatus(userId: string): Promise<FollowStatus> {
  const response = await fetch(`/api/users/follow/status?userId=${userId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch follow status');
  }
  return response.json();
}

export function useFollowStatus(userId: string | null) {
  return useQuery({
    queryKey: ['followStatus', userId],
    queryFn: () => (userId ? fetchFollowStatus(userId) : null),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    gcTime: 1000 * 60 * 30, // Keep data in cache for 30 minutes
  });
} 