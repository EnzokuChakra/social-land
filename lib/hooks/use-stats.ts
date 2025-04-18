import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export interface ProfileStats {
  posts: number;
  followers: number;
  following: number;
  reels: number;
}

async function fetchProfileStats(username: string): Promise<ProfileStats> {
  const response = await fetch(`/api/profile/${username}/stats/`, {
    credentials: 'include',
    headers: {
      'Cache-Control': 'no-cache',
    },
  });

  if (response.status === 401) {
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    throw new Error('Failed to fetch profile stats');
  }

  const data = await response.json();
  return data.stats; // Extract the stats object from the response
}

export function useStats(username: string | null) {
  const router = useRouter();
  const { data: session } = useSession();

  return useQuery<ProfileStats | null, Error>({
    queryKey: ['profileStats', username],
    queryFn: () => (username ? fetchProfileStats(username) : null),
    enabled: !!username && !!session,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    retry: (failureCount, error) => {
      if (error.message === 'Unauthorized') {
        router.push('/login');
        return false;
      }
      return failureCount < 2;
    }
  });
} 