"use client";

import { useState, useEffect } from "react";

export function useMediaQuery(query: string): boolean {
  // For mobile queries, default to true on server to prevent flashing
  const isMobileQuery = query.includes("max-width");
  
  const [matches, setMatches] = useState(isMobileQuery);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const media = window.matchMedia(query);
    
    // Set initial value based on actual browser environment
    setMatches(media.matches);

    // Create listener function
    const listener = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };

    // Add listener
    media.addEventListener("change", listener);

    // Clean up
    return () => {
      media.removeEventListener("change", listener);
    };
  }, [query]);

  // Return the default value on server or the actual value if mounted
  return mounted ? matches : isMobileQuery;
} 