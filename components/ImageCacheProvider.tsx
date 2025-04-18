"use client";

import { useEffect, useRef } from "react";

/**
 * Provider component that handles image caching
 */
export default function ImageCacheProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Add cache control meta tag
    const metaElement = document.createElement('meta');
    metaElement.httpEquiv = 'Cache-Control';
    metaElement.content = 'public, max-age=3600'; // 1 hour cache
    document.head.appendChild(metaElement);

    return () => {
      document.head.removeChild(metaElement);
    };
  }, []);

  return <>{children}</>;
} 