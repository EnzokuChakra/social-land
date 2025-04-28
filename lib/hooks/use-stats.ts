import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useRef } from 'react';
import { getSocket } from '@/lib/socket';
import { useDebounce } from '@/hooks/useDebounce';

export interface ProfileStats {
  posts: number;
  followers: number;
  following: number;
  reels: number;
}

// Cache duration constants
const STATS_CACHE_TIME = 1000 * 60 * 5; // 5 minutes
const STATS_STALE_TIME = 1000 * 30; // 30 seconds

export function useStats(username: string | null) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: session } = useSession();
  const invalidationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track when last fetch happened to prevent excessive refetches
  const lastFetchTimeRef = useRef<number>(0);
  
  // Debounce username to prevent multiple fetches when it changes rapidly
  const debouncedUsername = useDebounce(username, 300);

  const fetchStats = async (username: string) => {
    if (!username) {
      return null;
    }

    // Prevent fetching if we recently fetched (within 2 seconds)
    const now = Date.now();
    if (now - lastFetchTimeRef.current < 2000) {
      return queryClient.getQueryData<ProfileStats>(['profileStats', username]) || null;
    }
    
    lastFetchTimeRef.current = now;

    try {
      const response = await fetch(`/api/profile/${username}/stats`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      
      const data = await response.json();
      return data.stats as ProfileStats;
    } catch (error) {
      return null;
    }
  };

  const query = useQuery({
    queryKey: ['profileStats', debouncedUsername],
    queryFn: () => fetchStats(debouncedUsername || ''),
    enabled: !!debouncedUsername,
    staleTime: STATS_STALE_TIME,
    gcTime: STATS_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });

  const updateStats = useMutation({
    mutationFn: async (newStats: Partial<ProfileStats>) => {
      if (!debouncedUsername) {
        return null;
      }
      
      const currentStats = queryClient.getQueryData<ProfileStats>(['profileStats', debouncedUsername]);
      if (!currentStats) {
        return null;
      }

      const updatedStats = { ...currentStats, ...newStats };
      
      // Optimistically update the cache
      queryClient.setQueryData(['profileStats', debouncedUsername], updatedStats);
      
      // Debounced invalidation to prevent multiple rapid refetches
      scheduleInvalidation(debouncedUsername);
      
      return updatedStats;
    },
    onError: (error) => {
      // Revert optimistic update on error
      if (debouncedUsername) {
        scheduleInvalidation(debouncedUsername);
      }
    },
  });

  // Helper function to debounce cache invalidation
  const scheduleInvalidation = (username: string) => {
    if (invalidationTimeoutRef.current) {
      clearTimeout(invalidationTimeoutRef.current);
    }
    
    invalidationTimeoutRef.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['profileStats', username] });
      invalidationTimeoutRef.current = null;
    }, 500);
  };

  // Listen for post creation events
  useEffect(() => {
    if (!debouncedUsername) return;

    const handlePostCreated = (event: CustomEvent<{ userId: string; username: string }>) => {
      if (event.detail.username === debouncedUsername) {
        scheduleInvalidation(debouncedUsername);
      }
    };

    const handleFollowStatusChange = (event: CustomEvent) => {
      if (event.detail?.followingId) {
        scheduleInvalidation(debouncedUsername);
      }
    };

    window.addEventListener('postCreated', handlePostCreated as EventListener);
    window.addEventListener('followStatusChanged', handleFollowStatusChange as EventListener);
    
    return () => {
      window.removeEventListener('postCreated', handlePostCreated as EventListener);
      window.removeEventListener('followStatusChanged', handleFollowStatusChange as EventListener);
      
      // Clear any pending timeouts on unmount
      if (invalidationTimeoutRef.current) {
        clearTimeout(invalidationTimeoutRef.current);
      }
    };
  }, [debouncedUsername, queryClient]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (invalidationTimeoutRef.current) {
        clearTimeout(invalidationTimeoutRef.current);
      }
    };
  }, []);

  // Listen for socket events
  useEffect(() => {
    if (!debouncedUsername) return;

    const socket = getSocket();
    if (!socket) return;

    const handleFollowRequestAccepted = (data: { followingId: string }) => {
      if (data.followingId) {
        queryClient.invalidateQueries({ queryKey: ['profileStats', debouncedUsername] });
      }
    };

    socket.on('followRequestAccepted', handleFollowRequestAccepted);

    return () => {
      socket.off('followRequestAccepted', handleFollowRequestAccepted);
    };
  }, [debouncedUsername, queryClient]);

  return {
    ...query,
    updateStats: updateStats.mutate,
  };
}

// Helper function to invalidate profile stats
export function invalidateProfileStats(username: string) {
  const queryClient = useQueryClient();
  queryClient.invalidateQueries({ queryKey: ['profileStats', username] });
} 