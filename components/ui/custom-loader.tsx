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
    sm: "w-4 h-4",
    default: "w-6 h-6",
    lg: "w-8 h-8",
  };

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Return a basic loader during SSR and before hydration
  if (!mounted) {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 200 200"
          className={sizeClasses[size]}
        >
          <radialGradient
            id="a9"
            cx=".66"
            fx=".66"
            cy=".3125"
            fy=".3125"
            gradientTransform="scale(1.5)"
          >
            <stop offset="0" stopColor="#FFFFFF" />
            <stop offset=".3" stopColor="#FFFFFF" stopOpacity=".9" />
            <stop offset=".6" stopColor="#FFFFFF" stopOpacity=".6" />
            <stop offset=".8" stopColor="#FFFFFF" stopOpacity=".3" />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
          <circle
            style={{ transformOrigin: "center" }}
            fill="none"
            stroke="url(#a9)"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray="200 1000"
            strokeDashoffset="0"
            cx="100"
            cy="100"
            r="70"
          >
            <animateTransform
              type="rotate"
              attributeName="transform"
              calcMode="spline"
              dur="2"
              values="360;0"
              keyTimes="0;1"
              keySplines="0 0 1 1"
              repeatCount="indefinite"
            />
          </circle>
          <circle
            style={{ transformOrigin: "center" }}
            fill="none"
            opacity=".2"
            stroke="#FFFFFF"
            strokeWidth="9"
            strokeLinecap="round"
            cx="100"
            cy="100"
            r="70"
          />
        </svg>
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