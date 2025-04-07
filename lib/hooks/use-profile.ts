import { useQuery } from '@tanstack/react-query';
import { UserWithExtras } from '@/lib/definitions';
import { apiClient } from '@/lib/api-client';

interface ProfileResponse extends UserWithExtras {
  id: string;
}

interface FollowStatusResponse {
  status: 'ACCEPTED' | 'PENDING' | null;
  isFollowing: boolean;
  hasPendingRequest: boolean;
}

async function fetchProfile(username: string): Promise<ProfileResponse> {
  try {
    return await apiClient<ProfileResponse>(`/api/profile/${username}`);
  } catch (error) {
    console.error('Error fetching profile data:', error);
    throw new Error('Failed to fetch profile');
  }
}

async function fetchFollowStatus(userId: string): Promise<FollowStatusResponse> {
  try {
    return await apiClient<FollowStatusResponse>(`/api/users/follow/status?userId=${userId}`);
  } catch (error) {
    console.error('Error fetching follow status:', error);
    throw new Error('Failed to fetch follow status');
  }
}

export function useProfile(username: string | null) {
  const profileQuery = useQuery({
    queryKey: ['profile', username],
    queryFn: () => (username ? fetchProfile(username) : null),
    enabled: !!username,
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    gcTime: 1000 * 60 * 30, // Keep data in cache for 30 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const followStatusQuery = useQuery({
    queryKey: ['followStatus', profileQuery.data?.id],
    queryFn: () => (profileQuery.data?.id ? fetchFollowStatus(profileQuery.data.id) : null),
    enabled: !!profileQuery.data?.id,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  return {
    profile: profileQuery.data,
    followStatus: followStatusQuery.data,
    isLoading: profileQuery.isLoading || followStatusQuery.isLoading,
    error: profileQuery.error || followStatusQuery.error,
  };
} 