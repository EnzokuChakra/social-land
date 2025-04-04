"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useNavbar } from "@/lib/hooks/use-navbar";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { memo } from "react";

interface PageLayoutProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

const MemoizedContent = memo(({ children, className, style }: { 
  children: React.ReactNode;
  className?: string;
  style: React.CSSProperties;
}) => (
  <div
    suppressHydrationWarning
    className={className}
    style={style}
  >
    {children}
  </div>
));
MemoizedContent.displayName = "MemoizedContent";

export default function PageLayout({
  children,
  className,
  noPadding = false,
}: PageLayoutProps) {
  const { navbarWidth, isCollapsed } = useNavbar();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    const checkBanStatus = async () => {
      if (session?.user?.id) {
        try {
          const response = await fetch("/api/profile");
          if (response.status === 403) {
            // User is banned
            await signOut({ redirect: false });
            router.push("/banned");
          }
        } catch (error) {
          console.error("Error checking ban status:", error);
        }
      }
    };

    if (status === "authenticated") {
      checkBanStatus();
    }
  }, [session, status, router]);

  const contentStyle = {
    marginLeft: isMobile ? 0 : isCollapsed ? "88px" : "245px",
    width: isMobile ? "100%" : `calc(100% - ${isCollapsed ? "88px" : "245px"})`,
  };

  const contentClassName = cn(
    "min-h-screen transition-all duration-300 ease-in-out",
    !noPadding && "px-4 sm:px-6 md:px-8 lg:px-12",
    "pb-20 md:pb-0",
    className
  );

  return (
    <MemoizedContent
      className={contentClassName}
      style={contentStyle}
    >
      {children}
    </MemoizedContent>
  );
} 