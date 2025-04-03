"use client";

import {
  Clapperboard,
  Compass,
  Home,
  PlusSquare,
  Search,
  Bell,
  Calendar,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "./ui/button";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { UserRole, NotificationWithExtras } from "@/lib/definitions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import SearchUsers from "./SearchUsers";
import CreateModal from "./CreateModal";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { useNotifications } from "@/lib/hooks/use-notifications";
import SearchSidebar from "./SearchSidebar";
import NotificationSidebar from "./NotificationSidebar";

// Base links without reels
const baseLinks = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Explore", href: "/dashboard/explore", icon: Compass },
  {
    name: "Events",
    href: "/dashboard/events",
    icon: Calendar,
  },
];

// Reels link that will be conditionally added
const reelsLink = {
  name: "Reels",
  href: "/dashboard/reels",
  icon: Clapperboard,
};

const adminLink = {
  name: "Admin",
  href: "/dashboard/admin",
  icon: Shield,
};

function NavLinks() {
  const pathname = usePathname();
  const router = useRouter();
  const [showSearch, setShowSearch] = useState(false);
  const { data: session } = useSession();
  const [reelsEnabled, setReelsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isMobile = useMediaQuery("(max-width: 768px)");
  const { notifications } = useNotifications();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  
  const userRole = session?.user?.role as UserRole | undefined;
  const isAdmin = userRole && ["MODERATOR", "ADMIN", "MASTER_ADMIN"].includes(userRole);

  useEffect(() => {
    // Fetch reels visibility setting
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
        setIsLoading(false);
      }
    };

    fetchReelsVisibility();
  }, []);

  // Construct links array based on permissions and settings
  const links = [...baseLinks];
  
  // Add reels link if enabled
  if (reelsEnabled === true) {
    const exploreIndex = links.findIndex(link => link.name === "Explore");
    if (exploreIndex !== -1) {
      links.splice(exploreIndex + 1, 0, reelsLink);
    }
  }
  
  // Add admin link if user has admin role
  if (isAdmin) {
    links.push(adminLink);
  }

  if (isLoading) {
    return <div className="flex flex-row md:flex-col w-full animate-pulse">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-12 w-full bg-neutral-100 dark:bg-neutral-800 rounded-md mb-1"></div>
      ))}
    </div>;
  }

  return (
    <>
      <Dialog open={showSearch} onOpenChange={setShowSearch}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center font-medium">Search Users</DialogTitle>
          </DialogHeader>
          <SearchUsers onClose={() => setShowSearch(false)} />
        </DialogContent>
      </Dialog>

      <div className="flex flex-row md:flex-col w-full">
        <nav className="flex flex-row md:flex-col items-center md:items-stretch gap-x-2 md:gap-y-1 w-full">
          {links.map((link) => {
            const LinkIcon = link.icon;
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.name}
                href={link.href}
                className={cn(
                  buttonVariants({ 
                    variant: "ghost", 
                    size: "lg",
                    className: "w-full justify-start gap-x-4 transition-all md:px-3"
                  }),
                  isActive && "font-semibold bg-neutral-100 dark:bg-neutral-800/50"
                )}
              >
                <div className="relative">
                  <LinkIcon className={cn(
                    "w-6 h-6 transition-colors",
                    isActive && "scale-[1.02]"
                  )} />
                  {isActive && (
                    <span className="absolute -right-1 -top-1 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </div>
                <span className="hidden md:block text-sm">{link.name}</span>
              </Link>
            );
          })}

          {!isMobile && (
            <>
              <Button
                variant="ghost"
                size="lg"
                className="w-full justify-start gap-x-4 transition-all md:px-3"
                onClick={() => setShowSearch(true)}
              >
                <Search className="w-6 h-6" />
                <span className="hidden md:block text-sm">Search</span>
              </Button>

              <Button
                variant="ghost"
                size="lg"
                className={cn(
                  "w-full justify-start gap-x-4 transition-all md:px-3",
                  pathname === "/dashboard/notifications" && "font-semibold bg-neutral-100 dark:bg-neutral-800/50"
                )}
                onClick={() => router.push("/dashboard/notifications")}
              >
                <div className="relative">
                  <Bell className="w-6 h-6 transition-colors" />
                  {pathname === "/dashboard/notifications" && (
                    <span className="absolute -right-1 -top-1 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </div>
                <span className="hidden md:block text-sm">Notifications</span>
              </Button>
            </>
          )}

          <CreateModal>
            <Button
              variant="ghost"
              size="lg"
              className="w-full justify-start gap-x-4 transition-all md:px-3"
            >
              <PlusSquare className="w-6 h-6" />
              <span className="hidden md:block text-sm">Create</span>
            </Button>
          </CreateModal>
        </nav>
      </div>

      {isMobile && (
        <>
          <SearchSidebar
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
          />

          <NotificationSidebar
            isOpen={isNotificationsOpen}
            onClose={() => setIsNotificationsOpen(false)}
            notifications={notifications.map(n => ({
              ...n,
              sender: n.sender ? {
                id: n.sender.id,
                username: n.sender.username,
                image: n.sender.image,
                isFollowing: n.sender.isFollowing,
                hasPendingRequest: n.sender.hasPendingRequest,
                isFollowedByUser: n.sender.isFollowedByUser,
                isPrivate: n.sender.isPrivate
              } : undefined,
              post: n.post ? {
                id: n.post.id,
                fileUrl: n.post.fileUrl
              } : null,
              comment: n.comment ? {
                id: n.comment.id,
                text: n.comment.text
              } : null,
              metadata: n.metadata as Record<string, any> | null
            })) as NotificationWithExtras[]}
          />
        </>
      )}
    </>
  );
}

export default NavLinks;
