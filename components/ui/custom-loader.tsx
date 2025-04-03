"use client";

import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { useState, useEffect } from "react";

interface CustomLoaderProps {
  className?: string;
  size?: "sm" | "default" | "lg";
  noPadding?: boolean;
}

export function CustomLoader({ className = "", size = "default", noPadding = false }: CustomLoaderProps) {
  const [mounted, setMounted] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");
  
  const sizeClasses = {
    sm: "h-6 w-6",
    default: "h-8 w-8",
    lg: "h-12 w-12"
  };

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Return a basic loader during SSR and before hydration
  if (!mounted) {
    return (
      <div className={cn(
        "flex items-center justify-center w-full h-full",
        className
      )}>
        <div className={cn(
          "animate-spin rounded-full border-b-2 border-black dark:border-white bg-white dark:bg-transparent",
          sizeClasses[size]
        )} />
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-center justify-center w-full h-full",
      !noPadding && !isMobile && "pl-[88px]",
      isMobile && "fixed inset-0 z-50 bg-white/80 dark:bg-black/80",
      className
    )}>
      <div className={cn(
        "animate-spin rounded-full border-b-2 border-black dark:border-white bg-white dark:bg-transparent",
        sizeClasses[size]
      )} />
    </div>
  );
} 