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
  const { isCollapsed, setIsCollapsed, navbarWidth } = useNavbar();
  const { notifications, isLoading, setNotifications } = useNotifications();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, showLanguageToggle, setShowLanguageToggle } = useLanguage();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [reelsEnabled, setReelsEnabled] = useState(false);
  const [isLoadingReels, setIsLoadingReels] = useState(false);
  const { profile } = useProfile();
  const [showModeToggle, setShowModeToggle] = useState(false);
  
  // Combined state object for better performance
  const [states, setStates] = useState({
    isSearchOpen: false,
    isNotificationsOpen: false,
    showDropdown: false,
    hasUnreadNotifications: false
  });

  const { 
    isSearchOpen, 
    isNotificationsOpen, 
    showDropdown, 
    hasUnreadNotifications 
  } = states;

  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>({
    hasRequest: false,
    status: null
  });

  const userRole = session?.user?.role;
  const isAdmin = userRole && ["MODERATOR", "ADMIN", "MASTER_ADMIN"].includes(userRole);

  const handleThemeChange = (checked: boolean) => {
    const newTheme = checked ? "dark" : "light";
    console.log("Toggling theme from", theme, "to", newTheme);
    setTheme(newTheme);
    // Keep the dropdown open
    setStates(prev => ({
      ...prev,
      showDropdown: true
    }));
  };

  // Ensure theme is set to dark by default
  useEffect(() => {
    if (!theme || theme === 'system') {
      setTheme('dark');
    }
  }, [theme, setTheme]);

  const fetchReelsVisibility = async () => {
    try {
      const response = await fetch('/api/admin/settings/reels/', {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.log('User not authenticated for reels settings');
          return false;
        }
        console.log('Failed to fetch reels settings:', response.status);
        return false;
      }

      const data = await response.json();
      return data.enabled ?? false;
    } catch (error) {
      // In development, log the error but don't throw
      if (process.env.NODE_ENV === 'development') {
        console.log('Reels settings fetch error (expected in dev):', error);
        return false;
      }
      // In production, we might want to log this to monitoring
      console.error('Reels settings fetch error:', error);
      return false;
    }
  };

  useEffect(() => {
    let mounted = true;
    setIsLoadingReels(true); // Set loading state when starting to fetch

    const getReelsVisibility = async () => {
      try {
        const isEnabled = await fetchReelsVisibility();
        if (mounted) {
          setReelsEnabled(isEnabled);
          setIsLoadingReels(false); // Clear loading state after fetch
        }
      } catch (error) {
        if (mounted) {
          setIsLoadingReels(false); // Clear loading state on error
        }
        // Handle error silently in development
        if (process.env.NODE_ENV !== 'development') {
          console.error('Error setting reels visibility:', error);
        }
      }
    };

    getReelsVisibility();

    return () => {
      mounted = false;
    };
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
        handleSearchClose();
      }

      // Only close notifications if click is outside both navbar and notifications sidebar
      if (isNotificationsOpen && navbar && !navbar.contains(target) && notificationSidebar && !notificationSidebar.contains(target)) {
        handleNotificationsClose();
      }

      if (dropdownRef.current && !dropdownRef.current.contains(target as Node)) {
        setStates(prev => ({
          ...prev,
          showModeToggle: false,
          showLanguageToggle: false,
          showDropdown: false
        }));
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSearchOpen, isNotificationsOpen, isMobile]);

  // Close notifications and search when navigating
  useEffect(() => {
    setStates(prev => ({
      ...prev,
      isNotificationsOpen: false,
      isSearchOpen: false,
      isCollapsed: isMobile
    }));
  }, [pathname, isMobile]);

  // Auto collapse on mobile
  useEffect(() => {
    if (isMobile) {
      setStates(prev => ({
        ...prev,
        isCollapsed: true
      }));
    }
  }, [isMobile]);

  // Check for unread notifications when notifications array changes
  useEffect(() => {
    if (notifications) {
      const unreadExists = notifications.some(notification => !notification.isRead);
      setStates(prev => ({
        ...prev,
        hasUnreadNotifications: unreadExists
      }));
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
      // If notifications are already open, just close them
      if (isNotificationsOpen) {
        setStates(prev => ({
          ...prev,
          isNotificationsOpen: false
        }));
        if (!isMobile) {
          setIsCollapsed(false);
        }
        return;
      }

      // Close search if it's open
      setStates(prev => ({
        ...prev,
        isSearchOpen: false,
        isNotificationsOpen: true
      }));

      // Update collapse state using the navbar hook
      if (!isMobile) {
        setIsCollapsed(true);
      }

      // Mark notifications as read if there are unread ones
      if (notifications?.some(n => !n.isRead)) {
        const response = await fetch("/api/notifications/mark-read", {
          method: "POST",
        });
        if (response.ok) {
          setNotifications(notifications.map(n => ({ ...n, isRead: true })));
          setStates(prev => ({
            ...prev,
            hasUnreadNotifications: false
          }));
        }
      }
    } catch (error) {
      console.error("Error handling notifications:", error);
    }
  };

  const handleSearchClick = () => {
    // If search is already open, just close it
    if (isSearchOpen) {
      setStates(prev => ({
        ...prev,
        isSearchOpen: false
      }));
      if (!isMobile) {
        setIsCollapsed(false);
      }
      return;
    }

    // Close notifications if it's open
    setStates(prev => ({
      ...prev,
      isNotificationsOpen: false,
      isSearchOpen: true
    }));

    // Update collapse state using the navbar hook
    if (!isMobile) {
      setIsCollapsed(true);
    }
  };

  const handleNotificationsClose = () => {
    setStates(prev => ({
      ...prev,
      isNotificationsOpen: false
    }));

    // Update collapse state using the navbar hook
    if (!isMobile) {
      setIsCollapsed(false);
    }
  };

  const handleSearchClose = () => {
    setStates(prev => ({
      ...prev,
      isSearchOpen: false
    }));

    // Update collapse state using the navbar hook
    if (!isMobile) {
      setIsCollapsed(false);
    }
  };

  const toggleCollapse = () => {
    if (!isMobile && !isNotificationsOpen) {
      setIsCollapsed(!isCollapsed);
    }
  };

  // Close panels on navigation
  useEffect(() => {
    setStates(prev => ({
      ...prev,
      isNotificationsOpen: false,
      isSearchOpen: false
    }));

    // Update collapse state using the navbar hook
    if (!isMobile) {
      setIsCollapsed(false);
    }
  }, [pathname, isMobile]);

  // Auto collapse on mobile
  useEffect(() => {
    if (isMobile) {
      setIsCollapsed(true);
    }
  }, [isMobile]);

  if (isLoadingReels) {
    return null; // Or show a loading spinner
  }

  return (
    <>
      <nav 
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-full w-[240px] flex-col bg-white dark:bg-black border-r border-neutral-200 dark:border-neutral-800 transition-all duration-300 ease-in-out",
          isCollapsed && "w-[72px]",
          isMobile ? "hidden" : "flex" // Show on desktop, hide on mobile
        )}
      >
        {/* Collapse Toggle Button */}
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3 top-6 h-6 w-6 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <ChevronLeftIcon className={cn("h-4 w-4 transition-transform", isCollapsed && "rotate-180")} />
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
            <h1 className="font-bold text-xl">Social Land</h1>
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
                onClick={() => setStates(prev => ({
                  ...prev,
                  showDropdown: !prev.showDropdown
                }))}
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
                    onClick={() => {
                      const newTheme = theme === "dark" ? "light" : "dark";
                      console.log("Toggling theme from", theme, "to", newTheme);
                      setTheme(newTheme);
                      // Keep the dropdown open
                      setStates(prev => ({
                        ...prev,
                        showDropdown: true
                      }));
                    }}
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
                        onCheckedChange={handleThemeChange}
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
      </nav>

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