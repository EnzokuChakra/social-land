import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSocket } from "@/lib/socket";
import { useEffect } from 'react';

interface ImageOptions {
  forceRefresh?: boolean;
}

/**
 * Hook for basic image loading
 */
export function useImage(src: string | null, options: ImageOptions = {}) {
  const { forceRefresh = false } = options;
  const queryClient = useQueryClient();
  const socket = getSocket();

  // Profile image query
  const { data: imageUrl, isLoading } = useQuery({
    queryKey: ['image', src],
    queryFn: async () => {
      if (!src) return null;
      return src;
    },
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // Listen for profile updates via socket
  useEffect(() => {
    if (!socket || !src?.includes('/uploads/profiles/')) return;

    const handleProfileUpdate = (data: { userId: string; image: string | null }) => {
      if (data.image !== src) {
        queryClient.invalidateQueries({ queryKey: ['image', src] });
      }
    };

    socket.on('profileUpdate', handleProfileUpdate);
    return () => {
      socket.off('profileUpdate', handleProfileUpdate);
    };
  }, [socket, src, queryClient]);

  return {
    imageUrl: imageUrl || '/images/profile_placeholder.webp',
    isLoading,
    blurDataURL: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwMCIgaGVpZ2h0PSIxMjAwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNlZWUiLz48L3N2Zz4="
  };
} 