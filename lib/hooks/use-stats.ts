import { useQuery } from '@tanstack/react-query';

interface ProfileStats {
  posts: number;
  followers: number;
  following: number;
  reels: number;
}

async function fetchProfileStats(username: string): Promise<ProfileStats> {
  const response = await fetch(`/api/profile/${username}/stats/`);
  if (!response.ok) {
    throw new Error('Failed to fetch profile stats');
  }
  const data = await response.json();
  return data.stats; // Extract the stats object from the response
}

export function useStats(username: string | null) {
  return useQuery({
    queryKey: ['profileStats', username],
    queryFn: () => (username ? fetchProfileStats(username) : null),
    enabled: !!username,
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    gcTime: 1000 * 60 * 30, // Keep data in cache for 30 minutes
    refetchInterval: 1000 * 60 * 2, // Refetch every 2 minutes
  });
} 