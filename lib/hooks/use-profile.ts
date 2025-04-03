import { useQuery } from '@tanstack/react-query';
import { UserWithExtras } from '@/lib/definitions';

interface ProfileResponse extends UserWithExtras {
  id: string;
}

interface FollowStatusResponse {
  status: 'ACCEPTED' | 'PENDING' | null;
  isFollowing: boolean;
  hasPendingRequest: boolean;
}

async function fetchProfile(username: string): Promise<ProfileResponse> {
  const response = await fetch(`/api/profile/${username}`);
  if (!response.ok) {
    throw new Error('Failed to fetch profile');
  }
  return response.json();
}

async function fetchFollowStatus(userId: string): Promise<FollowStatusResponse> {
  const response = await fetch(`/api/users/follow/status?userId=${userId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch follow status');
  }
  return response.json();
}

export function useProfile(username: string | null) {
  const profileQuery = useQuery({
    queryKey: ['profile', username],
    queryFn: () => (username ? fetchProfile(username) : null),
    enabled: !!username,
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    gcTime: 1000 * 60 * 30, // Keep data in cache for 30 minutes
  });

  const followStatusQuery = useQuery({
    queryKey: ['followStatus', profileQuery.data?.id],
    queryFn: () => (profileQuery.data?.id ? fetchFollowStatus(profileQuery.data.id) : null),
    enabled: !!profileQuery.data?.id,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  return {
    profile: profileQuery.data,
    followStatus: followStatusQuery.data,
    isLoading: profileQuery.isLoading || followStatusQuery.isLoading,
    error: profileQuery.error || followStatusQuery.error,
  };
} 