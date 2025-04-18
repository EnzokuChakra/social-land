"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { Input } from "./ui/input";
import { XIcon, ChevronLeftIcon } from "lucide-react";
import { useDebounce } from "@/lib/hooks/use-debounce";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "./ui/button";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import VerifiedBadge from "./VerifiedBadge";
import { HydrationSafeDiv } from "./HydrationSafeDiv";

interface SearchSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface User {
  id: string;
  username: string;
  image: string | null;
  verified: boolean;
  name?: string | null;
}

interface RecentSearch {
  id: string;
  userId: string;
  searchedId: string;
  searchedUser: User;
  createdAt: Date;
}

export default function SearchSidebar({ isOpen, onClose }: SearchSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 300);
  const router = useRouter();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [animationCount, setAnimationCount] = useState(0);
  const isAnimatingRef = useRef(false);
  const lastIsOpenRef = useRef(isOpen);

  // Remove logging for component lifecycle
  useEffect(() => {
    // Component mounted
    return () => {
      // Component unmounted
    };
  }, []);

  // Remove logging for isOpen changes
  useEffect(() => {
    // If isOpen changed and we're not already animating, start animation
    if (isOpen !== lastIsOpenRef.current && !isAnimatingRef.current) {
      isAnimatingRef.current = true;
      lastIsOpenRef.current = isOpen;
    }
  }, [isOpen, animationCount]);

  // Reset search and fetch recent searches when sidebar is opened
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setSearchResults([]);
      fetchRecentSearches();
    } else {
      // Reset state when closing
      setSearchQuery("");
      setSearchResults([]);
      setRecentSearches([]);
    }
  }, [isOpen]);

  // Memoize fetchRecentSearches function
  const fetchRecentSearches = useCallback(async () => {
    if (!isOpen) return;
    
    try {
      const response = await fetch("/api/search/recent");
      if (response.ok) {
        const data = await response.json();
        setRecentSearches(data);
      }
    } catch (error) {
      console.error("Error fetching recent searches:", error);
    }
  }, [isOpen]);

  // Memoize searchUsers function
  const searchUsers = useCallback(async () => {
    if (!debouncedSearch || !isOpen) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/search/users?q=${encodeURIComponent(debouncedSearch)}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      }
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, isOpen]);

  // Handle search when debounced query changes
  useEffect(() => {
    if (debouncedSearch && isOpen) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearch, searchUsers, isOpen]);

  // Memoize handleUserClick function
  const handleUserClick = useCallback(async (user: User) => {
    try {
      await fetch("/api/search/recent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user.id }),
      });
      router.push(`/dashboard/${user.username}`);
      onClose();
    } catch (error) {
      console.error("Error saving recent search:", error);
    }
  }, [router, onClose]);

  // Memoize removeRecentSearch function
  const removeRecentSearch = useCallback(async (searchId: string) => {
    try {
      await fetch(`/api/search/recent/${searchId}`, {
        method: "DELETE",
      });
      setRecentSearches(prev => prev.filter(search => search.id !== searchId));
    } catch (error) {
      console.error("Error removing recent search:", error);
    }
  }, []);

  // Memoize clearAllRecentSearches function
  const clearAllRecentSearches = useCallback(async () => {
    try {
      await fetch("/api/search/recent", {
        method: "DELETE",
      });
      setRecentSearches([]);
    } catch (error) {
      console.error("Error clearing recent searches:", error);
    }
  }, []);

  // Memoize search input handler
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value.toLowerCase());
  }, []);

  return (
    <>
      <div
        className={cn(
          "fixed z-50",
          isMobile ? "inset-0" : "inset-y-0 left-[72px]",
          "border-r border-neutral-200 dark:border-neutral-800",
          "bg-white dark:bg-black",
          "shadow-sm dark:shadow-neutral-800/10",
          "overflow-hidden",
          "transform-gpu",
          "backface-visibility-hidden",
          "will-change-transform",
          "transition-all duration-200 ease-out",
          isOpen 
            ? "w-[397px] opacity-100 translate-x-0" 
            : "w-0 opacity-0 -translate-x-full pointer-events-none"
        )}
        data-search-sidebar
      >
        <HydrationSafeDiv className="sticky top-0 z-10 bg-white dark:bg-black border-b border-neutral-200 dark:border-neutral-800 p-4">
          <HydrationSafeDiv className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Search</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="hover:bg-neutral-100 dark:hover:bg-neutral-800/50 rounded-full"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </Button>
          </HydrationSafeDiv>
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full"
            autoComplete="off"
          />
        </HydrationSafeDiv>

        <HydrationSafeDiv className="p-4">
          {!searchQuery && recentSearches.length > 0 && (
            <HydrationSafeDiv className="mb-6">
              <HydrationSafeDiv className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Recent</h3>
                <button
                  onClick={clearAllRecentSearches}
                  className="text-sm text-blue-500 hover:text-blue-600"
                >
                  Clear all
                </button>
              </HydrationSafeDiv>
              <div className="space-y-4">
                {recentSearches.map((search) => (
                  <div key={search.id} className="flex items-center justify-between">
                    <div
                      className="flex items-center gap-3 cursor-pointer flex-1"
                      onClick={() => handleUserClick(search.searchedUser)}
                    >
                      <div className="relative h-12 w-12">
                        <Image
                          src={search.searchedUser?.image || "/images/profile_placeholder.webp"}
                          alt={search.searchedUser?.username || "User"}
                          fill
                          className="rounded-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <p className="font-semibold">{search.searchedUser?.username || "Unknown User"}</p>
                          {search.searchedUser?.verified && (
                            <VerifiedBadge size={16} />
                          )}
                        </div>
                        {search.searchedUser?.name && (
                          <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            {search.searchedUser.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeRecentSearch(search.id);
                      }}
                      className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full"
                    >
                      <XIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </HydrationSafeDiv>
          )}

          {searchQuery && (
            <HydrationSafeDiv className="space-y-4">
              {isLoading ? (
                <p className="text-center text-neutral-600 dark:text-neutral-400">
                  Searching...
                </p>
              ) : searchResults.length > 0 ? (
                searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => handleUserClick(user)}
                  >
                    <div className="relative h-12 w-12">
                      <Image
                        src={user?.image || "/images/profile_placeholder.webp"}
                        alt={user?.username || "User"}
                        fill
                        className="rounded-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <p className="font-semibold">{user?.username || "Unknown User"}</p>
                        {user?.verified && (
                          <VerifiedBadge size={16} />
                        )}
                      </div>
                      {user?.name && (
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          {user.name}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-neutral-600 dark:text-neutral-400">
                  No users found
                </p>
              )}
            </HydrationSafeDiv>
          )}
        </HydrationSafeDiv>
      </div>

      <div
        className={cn(
          "fixed z-40 bg-black/20",
          isMobile ? "inset-0" : "inset-y-0 left-[72px] right-0",
          "transition-opacity duration-200 ease-out",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />
    </>
  );
} 