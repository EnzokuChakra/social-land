"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useNavbar } from "@/lib/hooks/use-navbar";
import { useMediaQuery } from "@/lib/hooks/use-media-query";

interface PageLayoutProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export default function PageLayout({
  children,
  className,
  noPadding = false,
}: PageLayoutProps) {
  const { navbarWidth } = useNavbar();
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

  return (
    <div
      suppressHydrationWarning
      className={cn(
        "min-h-screen transition-all duration-300 ease-in-out",
        !noPadding && "px-4 sm:px-6 md:px-8 lg:px-12",
        "pb-20 md:pb-0",
        className
      )}
      style={{
        marginLeft: isMobile ? 0 : navbarWidth,
        width: isMobile ? "100%" : `calc(100% - ${navbarWidth})`,
      }}
    >
      {children}
    </div>
  );
} 