import { useState, useEffect, useMemo } from 'react';

interface ImageCacheOptions {
  // Time in milliseconds to cache the image (default: 1 day)
  cacheDuration?: number;
  // Force refresh the image
  forceRefresh?: boolean;
}

/**
 * Simplified hook for caching images
 */
export function useImageCache(src: string | null, options: ImageCacheOptions = {}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const { forceRefresh = false } = options;
  
  const cachedSrc = useMemo(() => {
    if (!src) return null;
    
    // For profile images, add timestamp to force refresh
    if (src.includes('/uploads/profiles/') || forceRefresh) {
      const baseUrl = src.split('?')[0];
      return `${baseUrl}?t=${Date.now()}`;
    }
    
    return src;
  }, [src, forceRefresh]);
  
  // Preload image to browser cache
  useEffect(() => {
    if (!cachedSrc || isLoaded) return;
    
    const img = new Image();
    img.onload = () => setIsLoaded(true);
    img.src = cachedSrc;
    
    return () => {
      img.onload = null;
    };
  }, [cachedSrc, isLoaded]);
  
  return {
    cachedSrc,
    isLoaded,
    // Helper for Next.js Image component
    blurDataURL: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwMCIgaGVpZ2h0PSIxMjAwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNlZWUiLz48L3N2Zz4="
  };
} 