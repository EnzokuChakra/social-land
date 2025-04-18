'use client';

import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  effect?: 'blur' | 'black-and-white' | 'opacity';
  placeholderSrc?: string;
  onLoad?: () => void;
}

export default function LazyImage({
  src,
  alt,
  className,
  width,
  height,
  effect = 'blur',
  placeholderSrc,
  onLoad,
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  const handleLoad = () => {
    setIsLoaded(true);
    if (onLoad) onLoad();
  };

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <LazyLoadImage
        src={src}
        alt={alt}
        width={width}
        height={height}
        effect={effect}
        placeholderSrc={placeholderSrc}
        className={cn(
          'transition-all duration-300',
          !isLoaded && 'opacity-0',
          isLoaded && 'opacity-100'
        )}
        afterLoad={handleLoad}
        wrapperClassName={cn(
          'w-full h-full',
          !isLoaded && 'animate-pulse bg-gray-200 dark:bg-gray-800'
        )}
      />
    </div>
  );
} 