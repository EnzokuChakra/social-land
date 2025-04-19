import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSocket } from "@/lib/socket";
import { useEffect, useMemo } from 'react';

interface ImageOptions {
  forceRefresh?: boolean;
}

/**
 * Hook for efficient image loading and caching using React Query
 */
export function useImage(src: string | null, options: ImageOptions = {}) {
  const { forceRefresh = false } = options;
  const queryClient = useQueryClient();
  const socket = getSocket();

  // Generate a cache key that includes a timestamp for profile images
  const cacheKey = useMemo(() => {
    if (!src) return ['image', null];
    if (src.includes('/uploads/profiles/') || forceRefresh) {
      return ['image', src, Date.now()];
    }
    return ['image', src];
  }, [src, forceRefresh]);

  // Profile image query
  const { data: imageUrl, isLoading } = useQuery({
    queryKey: cacheKey,
    queryFn: async () => {
      if (!src) return null;

      // For profile images, add timestamp and cache buster
      if (src.includes('/uploads/profiles/') || forceRefresh) {
        const baseUrl = src.split('?')[0];
        const timestamp = Date.now();
        return `${baseUrl}?t=${timestamp}&cb=${Math.random()}&v=${timestamp}`;
      }

      return src;
    },
    staleTime: src?.includes('/uploads/profiles/') ? 0 : 1000 * 60 * 60, // No stale time for profile images, 1 hour for others
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Listen for profile updates via socket
  useEffect(() => {
    if (!socket || !src?.includes('/uploads/profiles/')) return;

    const handleProfileUpdate = (data: { userId: string; image: string | null }) => {
      // Invalidate the query and refetch immediately
      queryClient.invalidateQueries({ queryKey: cacheKey });
      queryClient.refetchQueries({ queryKey: cacheKey });
    };

    socket.on('profileUpdate', handleProfileUpdate);
    return () => {
      socket.off('profileUpdate', handleProfileUpdate);
    };
  }, [socket, src, queryClient, cacheKey]);

  return {
    imageUrl: imageUrl || '/images/profile_placeholder.webp',
    isLoading,
    blurDataURL: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwMCIgaGVpZ2h0PSIxMjAwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNlZWUiLz48L3N2Zz4="
  };
} 