'use client';

import Image, { ImageProps } from 'next/image';
import { useEffect, useState } from 'react';
import { imageCache } from '@/lib/services/image-cache';
import { cn } from '@/lib/utils';

interface CachedImageProps extends Omit<ImageProps, 'src'> {
  src: string | null;
  fallbackSrc?: string;
  preload?: boolean;
  onLoad?: () => void;
  className?: string;
}

export default function CachedImage({
  src,
  fallbackSrc = '/images/placeholder.jpg',
  preload = false,
  onLoad,
  className,
  alt,
  ...props
}: CachedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const finalSrc = src || fallbackSrc;

  useEffect(() => {
    if (preload && finalSrc) {
      imageCache.preloadImage(finalSrc)
        .catch(() => setError(true));
    }
  }, [finalSrc, preload]);

  const handleLoad = () => {
    setIsLoading(false);
    if (onLoad) onLoad();
  };

  const handleError = () => {
    setError(true);
    setIsLoading(false);
  };

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-800 animate-pulse" />
      )}
      <Image
        src={error ? fallbackSrc : finalSrc}
        alt={alt || ''}
        className={cn(
          'transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100'
        )}
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
    </div>
  );
} 