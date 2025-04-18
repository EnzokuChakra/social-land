import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { UserWithExtras } from '@/lib/definitions';

interface ProfileResponse extends UserWithExtras {
  followStatus?: {
    isFollowing: boolean;
    isFollowed: boolean;
  };
}

export function useProfile(username: string) {
  return useQuery({
    queryKey: ['profile', username],
    queryFn: async () => {
      return await apiClient<ProfileResponse>(`/api/profiles/${username}`);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    enabled: !!username,
  });
} 