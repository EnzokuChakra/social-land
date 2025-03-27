"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import CreateModal from "./CreateModal";
import {
  HomeIcon,
  SearchIcon,
  PlusSquareIcon,
  CompassIcon,
  FilmIcon,
  CalendarIcon,
  ShieldCheckIcon,
  HeartIcon,
  MenuIcon,
  ChevronLeftIcon,
  MoreHorizontalIcon,
  UserIcon,
  Activity,
  Bookmark,
  Settings,
  Moon,
  Sun,
  LogOut,
  Globe,
  BadgeCheckIcon,
  Clock,
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import NotificationSidebar from "./NotificationSidebar";
import { useNotifications } from "@/lib/hooks/use-notifications";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/hooks/use-language";
import { useTranslation } from "@/hooks/use-translation";
import SearchSidebar from "./SearchSidebar";
import ProfileLink from "./ProfileLink";
import { useNavbar } from "@/lib/hooks/use-navbar";
import { NotificationWithExtras, NotificationType, NotificationWithUser } from "@/lib/definitions";
import { useProfile } from "@/lib/contexts/profile-context";
import VerifiedBadge from "./VerifiedBadge";

// Base routes without reels
const baseRoutes = [
  {
    href: "/dashboard",
    label: "Home",
    icon: <HomeIcon className="w-6 h-6" />,
  },
  {
    href: "/dashboard/explore",
    label: "Explore",
    icon: <CompassIcon className="w-6 h-6" />,
  },
  {
    href: "/dashboard/events",
    label: "Events",
    icon: <CalendarIcon className="w-6 h-6" />,
  },
];

// Reels route that will be conditionally added
const reelsRoute = {
  href: "/dashboard/reels",
  label: "Reels",
  icon: <FilmIcon className="w-6 h-6" />,
};

type VerificationStatus = {
  hasRequest: boolean;
  status: string | null;
};

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { isCollapsed, setIsCollapsed } = useNavbar();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { notifications, isLoading, setNotifications } = useNotifications();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, showLanguageToggle, setShowLanguageToggle } = useLanguage();
  const [showModeToggle, setShowModeToggle] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [reelsEnabled, setReelsEnabled] = useState(false);
  const [isLoadingReels, setIsLoadingReels] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const { profile } = useProfile();
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>({
    hasRequest: false,
    status: null
  });

  const userRole = session?.user?.role;
  const isAdmin = userRole && ["MODERATOR", "ADMIN", "MASTER_ADMIN"].includes(userRole);

  // Ensure theme is set to dark by default
  useEffect(() => {
    if (!theme || theme === 'system') {
      setTheme('dark');
    }
  }, [theme, setTheme]);

  // Fetch reels visibility setting
  useEffect(() => {
    const fetchReelsVisibility = async () => {
      try {
        const response = await fetch("/api/admin/settings/reels");
        if (!response.ok) {
          throw new Error('Failed to fetch reels settings');
        }
        const data = await response.json();
        setReelsEnabled(data.reelsEnabled === true);
      } catch (error) {
        console.error("Error fetching reels visibility setting:", error);
        setReelsEnabled(false);
      } finally {
        setIsLoadingReels(false);
      }
    };

    fetchReelsVisibility();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      const navbar = document.querySelector('nav');
      const searchSidebar = document.querySelector('[data-search-sidebar]');
      const notificationSidebar = document.querySelector('[data-notification-sidebar]');

      // Only close search if click is outside both navbar and search sidebar
      if (isSearchOpen && navbar && !navbar.contains(target) && searchSidebar && !searchSidebar.contains(target)) {
        setIsSearchOpen(false);
        if (!isMobile) {
          setIsCollapsed(false);
        }
      }

      // Only close notifications if click is outside both navbar and notifications sidebar
      if (isNotificationsOpen && navbar && !navbar.contains(target) && notificationSidebar && !notificationSidebar.contains(target)) {
        setIsNotificationsOpen(false);
        if (!isMobile) {
          setIsCollapsed(false);
        }
      }

      if (dropdownRef.current && !dropdownRef.current.contains(target as Node)) {
        setShowModeToggle(false);
        setShowLanguageToggle(false);
        setShowDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSearchOpen, isNotificationsOpen, isMobile]);

  // Close notifications and search when navigating
  useEffect(() => {
    setIsNotificationsOpen(false);
    setIsCollapsed(false);
    setIsSearchOpen(false);
  }, [pathname]);

  // Auto collapse on mobile
  useEffect(() => {
    if (isMobile) {
      setIsCollapsed(true);
    }
  }, [isMobile]);

  // Check for unread notifications when notifications array changes
  useEffect(() => {
    if (notifications) {
      const unreadExists = notifications.some(notification => !notification.isRead);
      setHasUnreadNotifications(unreadExists);
    }
  }, [notifications]);

  // Update verification status check
  useEffect(() => {
    if (session?.user) {
      const checkStatus = async () => {
        try {
          const response = await fetch("/api/verification/status");
          if (response.ok) {
            const data = await response.json();
            setVerificationStatus(data);
          }
        } catch (error) {
          console.error("Error checking status:", error);
        }
      };

      checkStatus();
      // Check every 30 seconds for updates
      const interval = setInterval(checkStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [session]);

  // Construct routes array based on settings
  const mainRoutes = [...baseRoutes];
  
  // Add reels route if enabled
  if (reelsEnabled === true) {
    const exploreIndex = mainRoutes.findIndex(route => route.href === "/dashboard/explore");
    if (exploreIndex !== -1) {
      mainRoutes.splice(exploreIndex + 1, 0, reelsRoute);
    }
  }

  const handleNotificationsClick = async () => {
    try {
      // Close search if it's open
      if (isSearchOpen) {
        setIsSearchOpen(false);
      }

      if (isNotificationsOpen) {
        // If notifications are open, close them and expand navbar
        setIsNotificationsOpen(false);
        if (!isMobile) {
          setIsCollapsed(false);
        }
      } else {
        // If notifications are closed, open them and collapse navbar
        setIsNotificationsOpen(true);
        setIsCollapsed(true);

        // Mark notifications as read
        if (notifications?.some(n => !n.isRead)) {
          const response = await fetch("/api/notifications/mark-read", {
            method: "POST",
          });
          if (response.ok) {
            setNotifications(notifications.map(n => ({ ...n, isRead: true })));
            setHasUnreadNotifications(false);
          }
        }
      }
    } catch (error) {
      console.error("Error handling notifications:", error);
    }
  };

  const handleNotificationsClose = () => {
    setIsNotificationsOpen(false);
    if (!isMobile && !isSearchOpen) {
      setIsCollapsed(false);
    }
  };

  const toggleCollapse = () => {
    if (!isMobile && !isNotificationsOpen) {
      setIsCollapsed(!isCollapsed);
    }
  };

  const handleSearchClick = () => {
    // Close notifications if they're open
    if (isNotificationsOpen) {
      setIsNotificationsOpen(false);
    }

    if (isSearchOpen) {
      // If search is open, close it and expand navbar
      setIsSearchOpen(false);
      if (!isMobile) {
        setIsCollapsed(false);
      }
    } else {
      // If search is closed, open it and collapse navbar
      setIsSearchOpen(true);
      setIsCollapsed(true);
    }
  };

  const handleSearchClose = () => {
    setIsSearchOpen(false);
    if (!isMobile) {
      setIsCollapsed(false);
    }
  };

  if (isLoadingReels) {
    return null; // Or show a loading spinner
  }

  return (
    <>
      <motion.nav
        initial={false}
        animate={{ 
          width: isCollapsed ? "88px" : "245px",
          x: isMobile && !isCollapsed ? 0 : isMobile && isCollapsed ? "-88px" : 0
        }}
        transition={{ 
          type: "spring", 
          stiffness: 300, 
          damping: 30 
        }}
        className={cn(
          "h-screen fixed left-0 top-0 z-40 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black flex flex-col",
          "shadow-sm dark:shadow-neutral-800/10"
        )}
      >
        {/* Collapse Toggle Button */}
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapse}
            className={cn(
              "absolute -right-3 top-6 w-6 h-6 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black",
              "hover:bg-neutral-100 dark:hover:bg-neutral-800/50",
              "transition-transform duration-200",
              isCollapsed && "rotate-180"
            )}
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </Button>
        )}

        <Link 
          href={session ? "/dashboard" : "/"} 
          className={cn(
            "p-6",
            isCollapsed ? "justify-center" : "justify-start",
            "flex items-center"
          )}
        >
          {isCollapsed ? (
            <span className="font-bold text-xl">OG</span>
          ) : (
            <h1 className="font-bold text-xl">OG GRAM</h1>
          )}
        </Link>

        {/* Main Navigation */}
        <div className="flex-1 flex flex-col gap-1 px-3">
          {/* Primary Navigation Items */}
          {mainRoutes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                buttonVariants({ variant: "ghost", size: "lg" }),
                "w-full flex items-center gap-4 py-3",
                "transition-all duration-200",
                "hover:bg-neutral-100 dark:hover:bg-neutral-800/50",
                pathname === route.href && "bg-neutral-100 dark:bg-neutral-800/50 font-medium",
                isCollapsed ? "justify-center px-3" : "justify-start px-4"
              )}
            >
              {route.icon}
              {!isCollapsed && (
                <span className="text-sm tracking-wide">{route.label}</span>
              )}
            </Link>
          ))}

          {/* Search Button */}
          <Button
            variant="ghost"
            size="lg"
            onClick={handleSearchClick}
            className={cn(
              "w-full flex items-center gap-4 py-3",
              "transition-all duration-200",
              "hover:bg-neutral-100 dark:hover:bg-neutral-800/50",
              isSearchOpen && "bg-neutral-100 dark:bg-neutral-800/50 font-medium",
              isCollapsed ? "justify-center px-3" : "justify-start px-4"
            )}
          >
            <SearchIcon className="w-6 h-6" />
            {!isCollapsed && <span className="text-sm tracking-wide">Search</span>}
          </Button>

          {/* Notifications Button */}
          <Button
            variant="ghost"
            size="lg"
            onClick={handleNotificationsClick}
            className={cn(
              "w-full flex items-center gap-4 py-3 relative",
              "transition-all duration-200",
              "hover:bg-neutral-100 dark:hover:bg-neutral-800/50",
              isNotificationsOpen && "bg-neutral-100 dark:bg-neutral-800/50 font-medium",
              isCollapsed ? "justify-center px-3" : "justify-start px-4"
            )}
          >
            <HeartIcon className="w-6 h-6" />
            {!isCollapsed && <span className="text-sm tracking-wide">Notifications</span>}
            {!isLoading && hasUnreadNotifications && (
              <span className={cn(
                "absolute w-2.5 h-2.5 bg-red-500 rounded-full",
                "ring-4 ring-white dark:ring-black",
                isCollapsed ? "top-2 right-2" : "top-2 right-4"
              )} />
            )}
          </Button>

          {/* Create Button */}
          <CreateModal>
            <button
              className={cn(
                buttonVariants({ variant: "ghost", size: "lg" }),
                "w-full flex items-center gap-4 py-3",
                "transition-all duration-200",
                "hover:bg-neutral-100 dark:hover:bg-neutral-800/50",
                isCollapsed ? "justify-center px-3" : "justify-start px-4"
              )}
            >
              <PlusSquareIcon className="w-6 h-6" />
              {!isCollapsed && <span className="text-sm tracking-wide">Create</span>}
            </button>
          </CreateModal>
        </div>

        {/* Bottom Navigation */}
        <div className="flex flex-col gap-1 mt-auto p-3 border-t border-neutral-200 dark:border-neutral-800">
          {isAdmin && (
            <Link
              href="/dashboard/admin"
              className={cn(
                buttonVariants({ variant: "ghost", size: "lg" }),
                "w-full flex items-center gap-4 py-3",
                "transition-all duration-200",
                "hover:bg-neutral-100 dark:hover:bg-neutral-800/50",
                pathname === "/dashboard/admin" && "bg-neutral-100 dark:bg-neutral-800/50 font-medium",
                isCollapsed ? "justify-center px-3" : "justify-start px-4"
              )}
            >
              <ShieldCheckIcon className="w-6 h-6" />
              {!isCollapsed && <span className="text-sm tracking-wide">Admin</span>}
            </Link>
          )}

          {session?.user && (
            <ProfileLink
              user={{
                id: session.user.id,
                username: session.user.username || null,
                name: session.user.name || null,
                image: session.user.image || null,
                verified: session.user.verified || false,
                isPrivate: false
              }}
            />
          )}

          <DropdownMenu open={showDropdown}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="lg"
                onClick={() => setShowDropdown(!showDropdown)}
                className={cn(
                  "w-full flex items-center gap-4 py-3",
                  "transition-all duration-200",
                  "hover:bg-neutral-100 dark:hover:bg-neutral-800/50",
                  isCollapsed ? "justify-center px-3" : "justify-start px-4"
                )}
              >
                <MoreHorizontalIcon className="w-6 h-6" />
                {!isCollapsed && <span className="text-sm tracking-wide">More</span>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              ref={dropdownRef}
              className={cn(
                "w-64 dark:bg-black !rounded-xl !p-0",
                !showDropdown && "opacity-0"
              )}
              align="end"
              alignOffset={-40}
            >
              {!showModeToggle && !showLanguageToggle && (
                <>
                  <DropdownMenuItem
                    className="flex items-center gap-2 p-3 cursor-pointer"
                    onClick={() => router.push("/dashboard/edit-profile")}
                  >
                    <Settings className="w-5 h-5" />
                    <p>Edit Profile</p>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="flex items-center gap-2 p-3 cursor-pointer"
                    onClick={() => router.push("/dashboard/activity")}
                  >
                    <Activity className="w-5 h-5" />
                    <p>Your Activity</p>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="flex items-center gap-2 p-3 cursor-pointer"
                    onClick={() => router.push(`/dashboard/${session?.user?.username}/saved`)}
                  >
                    <Bookmark className="w-5 h-5" />
                    <p>Saved</p>
                  </DropdownMenuItem>

                  {profile?.verified || session?.user?.verified ? (
                    <DropdownMenuItem
                      className="flex items-center gap-2 p-3 cursor-pointer"
                      onClick={() => router.push("/dashboard/verify")}
                    >
                      <BadgeCheckIcon className="w-5 h-5 text-green-500" />
                      <p className="text-green-500 font-semibold">Verified Account</p>
                    </DropdownMenuItem>
                  ) : verificationStatus.hasRequest ? (
                    <DropdownMenuItem
                      className="flex items-center gap-2 p-3 cursor-pointer"
                      onClick={() => router.push("/dashboard/verify")}
                    >
                      <Clock className="w-5 h-5 text-yellow-500" />
                      <p className="text-yellow-500 font-semibold">Pending Verification</p>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      className="flex items-center gap-2 p-3 cursor-pointer"
                      onClick={() => router.push("/dashboard/verify")}
                    >
                      <BadgeCheckIcon className="w-5 h-5 text-blue-500" />
                      <p className="text-blue-500 font-semibold">Get Verified</p>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator className="dark:border-neutral-800" />

                  <DropdownMenuItem
                    className="flex items-center gap-2 p-3 cursor-pointer"
                    onClick={() => setShowModeToggle(true)}
                  >
                    <div className="flex items-center gap-2">
                      {theme === "dark" ? (
                        <Moon className="w-5 h-5" />
                      ) : (
                        <Sun className="w-5 h-5" />
                      )}
                      <Label htmlFor="dark-mode" className="cursor-pointer">
                        {theme === "dark" ? "Dark" : "Light"} mode
                      </Label>
                    </div>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    className="flex items-center gap-2 p-3 cursor-pointer"
                    onClick={() => setShowLanguageToggle(true)}
                  >
                    <Globe className="w-5 h-5" />
                    <p>Language</p>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="dark:border-neutral-800" />

                  <DropdownMenuItem
                    className="flex items-center gap-2 p-3 cursor-pointer text-red-500"
                    onClick={() => signOut()}
                  >
                    <LogOut className="w-5 h-5" />
                    <p>Log out</p>
                  </DropdownMenuItem>
                </>
              )}

              {showModeToggle && (
                <>
                  <div className="flex items-center border-b border-neutral-200 dark:border-neutral-800 py-3.5 px-3">
                    <ChevronLeftIcon className="w-5 h-5 cursor-pointer" onClick={() => setShowModeToggle(false)} />
                    <p className="font-semibold ml-2">Switch appearance</p>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {theme === "dark" ? (
                          <Moon className="w-5 h-5" />
                        ) : (
                          <Sun className="w-5 h-5" />
                        )}
                        <Label htmlFor="dark-mode" className="cursor-pointer">
                          {theme === "dark" ? "Dark" : "Light"} mode
                        </Label>
                      </div>
                      <Switch
                        id="dark-mode"
                        checked={theme === "dark"}
                        defaultChecked={true}
                        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                      />
                    </div>
                  </div>
                </>
              )}

              {showLanguageToggle && (
                <>
                  <div className="flex items-center border-b border-neutral-200 dark:border-neutral-800 py-3.5 px-3">
                    <ChevronLeftIcon className="w-5 h-5 cursor-pointer" onClick={() => setShowLanguageToggle(false)} />
                    <p className="font-semibold ml-2">Language</p>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="language-toggle">RO / EN</Label>
                      <Switch
                        id="language-toggle"
                        checked={language === "ro"}
                        onCheckedChange={(checked) => setLanguage(checked ? "ro" : "en")}
                      />
                    </div>
                  </div>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.nav>

      <SearchSidebar
        isOpen={isSearchOpen}
        onClose={handleSearchClose}
      />

      <NotificationSidebar
        isOpen={isNotificationsOpen}
        onClose={handleNotificationsClose}
        notifications={(notifications || []).map(n => ({
          ...n,
          type: n.type as NotificationType,
          sender: n.sender ? {
            id: n.sender.id,
            username: n.sender.username || null,
            image: n.sender.image
          } : undefined,
          metadata: n.metadata || null
        })) as NotificationWithExtras[]}
      />

      <motion.main
        initial={false}
        animate={{ 
          marginLeft: isMobile ? 0 : isCollapsed ? "88px" : "245px",
        }}
        transition={{ 
          type: "spring", 
          stiffness: 300, 
          damping: 30 
        }}
        className={cn(
          "bg-white dark:bg-black",
          "transition-all duration-300 ease-in-out"
        )}
      >
        {/* Your main content */}
      </motion.main>
    </>
  );
} 