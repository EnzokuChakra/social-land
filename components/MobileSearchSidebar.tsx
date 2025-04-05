"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Input } from "./ui/input";
import { XIcon, ChevronLeftIcon } from "lucide-react";
import { useDebounce } from "@/lib/hooks/use-debounce";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "./ui/button";
import VerifiedBadge from "./VerifiedBadge";

interface MobileSearchSidebarProps {
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

export default function MobileSearchSidebar({ isOpen, onClose }: MobileSearchSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 300);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setSearchResults([]);
      fetchRecentSearches();
    }
  }, [isOpen]);

  useEffect(() => {
    if (debouncedSearch) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearch]);

  const fetchRecentSearches = async () => {
    try {
      const response = await fetch("/api/search/recent");
      if (response.ok) {
        const data = await response.json();
        setRecentSearches(data);
      }
    } catch (error) {
      console.error("Error fetching recent searches:", error);
    }
  };

  const searchUsers = async () => {
    if (!debouncedSearch) return;
    
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
  };

  const handleUserClick = async (user: User) => {
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
  };

  const removeRecentSearch = async (searchId: string) => {
    try {
      await fetch(`/api/search/recent/${searchId}`, {
        method: "DELETE",
      });
      setRecentSearches(prev => prev.filter(search => search.id !== searchId));
    } catch (error) {
      console.error("Error removing recent search:", error);
    }
  };

  const clearAllRecentSearches = async () => {
    try {
      await fetch("/api/search/recent", {
        method: "DELETE",
      });
      setRecentSearches([]);
    } catch (error) {
      console.error("Error clearing recent searches:", error);
    }
  };

  return (
    <>
      <motion.div
        initial={false}
        animate={{ 
          width: isOpen ? "100%" : "0px",
          opacity: isOpen ? 1 : 0,
          x: isOpen ? 0 : -100
        }}
        transition={{ 
          type: "spring",
          width: {
            type: "spring",
            stiffness: 400,
            damping: 30
          },
          opacity: {
            duration: 0.2
          },
          x: {
            type: "spring",
            stiffness: 400,
            damping: 30
          }
        }}
        className={cn(
          "fixed inset-0 z-[200]",
          "bg-white dark:bg-black",
          "overflow-hidden",
          "will-change-[width,opacity,transform]"
        )}
        data-search-sidebar
      >
        <div className="sticky top-0 z-10 bg-white dark:bg-black border-b border-neutral-200 dark:border-neutral-800 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Search</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="hover:bg-neutral-100 dark:hover:bg-neutral-800/50 rounded-full"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </Button>
          </div>
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value.toLowerCase())}
            className="w-full"
            autoComplete="off"
          />
        </div>

        <div className="p-4">
          {!searchQuery && recentSearches.length > 0 && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Recent</h3>
                <button
                  onClick={clearAllRecentSearches}
                  className="text-sm text-blue-500 hover:text-blue-600"
                >
                  Clear all
                </button>
              </div>
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
            </div>
          )}

          <div className="space-y-4">
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
          </div>
        </div>
      </motion.div>

      {isOpen && (
        <div
          className="fixed inset-0 z-[190] bg-black/20"
          onClick={onClose}
        />
      )}
    </>
  );
} 