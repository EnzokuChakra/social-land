"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import {
  HomeIcon,
  SearchIcon,
  CalendarIcon,
  HeartIcon,
  UserIcon,
  CompassIcon,
} from "lucide-react";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { useState, useEffect } from "react";
import SearchSidebar from "./SearchSidebar";
import NotificationSidebar from "./NotificationSidebar";
import { useNotifications } from "@/lib/hooks/use-notifications";
import { NotificationType, NotificationWithExtras } from "@/lib/definitions";

const navigation = [
  {
    name: "Home",
    href: "/dashboard",
    icon: HomeIcon,
  },
  {
    name: "Explore",
    href: "/dashboard/explore",
    icon: CompassIcon,
  },
  {
    name: "Search",
    href: "/dashboard/search",
    icon: SearchIcon,
  },
  {
    name: "Events",
    href: "/dashboard/events",
    icon: CalendarIcon,
  },
  {
    name: "Notifications",
    href: "/dashboard/notifications",
    icon: HeartIcon,
  },
];

// Add paths where bottom nav should be hidden
const hiddenPaths = ['/login', '/register', '/forgot-password', '/reset-password'];

const LinkComponent = ({ href, children, className, onClick }: { 
  href: string; 
  children: React.ReactNode; 
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}) => {
  const pathname = usePathname();
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const normalizedPathname = pathname?.endsWith('/') ? pathname.slice(0, -1) : pathname;
    const active = href === "/dashboard" 
      ? normalizedPathname === "/dashboard" || normalizedPathname === ""
      : pathname?.startsWith(href);
    setIsActive(active);
  }, [pathname, href]);
  
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center justify-center p-2 rounded-lg transition-all",
        isActive
          ? "text-black dark:text-white"
          : "text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white",
        className
      )}
    >
      {children}
    </Link>
  );
};

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const { notifications, followRequests } = useNotifications();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Add useEffect to handle mounting state
  useEffect(() => {
    setMounted(true);
  }, []);

  // More strict check to handle path variations
  if (!pathname) return null;
  
  // Check if the current path is in hidden paths or starts with any of them
  const shouldHide = hiddenPaths.some(path => 
    pathname === path || pathname.startsWith(`${path}/`)
  );
  
  // Hide on non-mobile devices and auth pages
  if (!isMobile || shouldHide) return null;

  const handleNavigationClick = (e: React.MouseEvent, item: typeof navigation[0]) => {
    if (item.name === "Search") {
      e.preventDefault();
      setIsSearchOpen(true);
    } else if (item.name === "Notifications") {
      e.preventDefault();
      setIsNotificationsOpen(true);
    } else {
      // Close any open sidebars when clicking other navigation items
      setIsSearchOpen(false);
      setIsNotificationsOpen(false);
    }
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-[200] flex h-14 items-center justify-around border-t border-neutral-200 bg-white dark:border-neutral-800 dark:bg-black md:hidden" suppressHydrationWarning>
        {navigation.map((item) => {
          const normalizedPathname = pathname?.endsWith('/') ? pathname.slice(0, -1) : pathname;
          const active = item.href === "/dashboard"
            ? normalizedPathname === "/dashboard" || normalizedPathname === ""
            : pathname?.startsWith(item.href);
          const isSearch = item.name === "Search";
          const isNotifications = item.name === "Notifications";

          return (
            <LinkComponent
              key={item.name}
              href={item.href}
              onClick={(e) => handleNavigationClick(e, item)}
              className={cn(
                "flex items-center justify-center p-2 rounded-lg transition-all",
                active
                  ? "text-black dark:text-white"
                  : "text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white"
              )}
            >
              <item.icon className={cn("h-6 w-6", active && "scale-110")} />
            </LinkComponent>
          );
        })}
        
        {mounted && session?.user && (
          <LinkComponent
            href={`/dashboard/${session.user.username}`}
            className={cn(
              "flex items-center justify-center p-2 rounded-lg transition-all",
              pathname === `/dashboard/${session.user.username}`
                ? "text-black dark:text-white"
                : "text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white"
            )}
          >
            <UserIcon className={cn("h-6 w-6", pathname === `/dashboard/${session.user.username}` && "scale-110")} />
          </LinkComponent>
        )}
      </nav>

      <SearchSidebar
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      <NotificationSidebar
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={[
          ...(followRequests || []).map(n => ({
            ...n,
            type: "FOLLOW_REQUEST" as NotificationType,
            sender: n.sender ? {
              id: n.sender.id,
              username: n.sender.username || null,
              image: n.sender.image
            } : undefined,
            metadata: n.metadata || null
          })),
          ...(notifications || []).map(n => ({
            ...n,
            type: n.type as NotificationType,
            sender: n.sender ? {
              id: n.sender.id,
              username: n.sender.username || null,
              image: n.sender.image
            } : undefined,
            metadata: n.metadata || null
          }))
        ] as NotificationWithExtras[]}
      />
    </>
  );
} 