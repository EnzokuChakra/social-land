"use client";

import { useState, useEffect, useRef } from "react";
import { useDebounce } from "@/lib/hooks/use-debounce";
import UserAvatar from "./UserAvatar";
import { cn } from "@/lib/utils";
import { Input } from "./ui/input";
import { Loader2, Users2 } from "lucide-react";

interface User {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  verified: boolean;
  isPrivate: boolean;
}

interface TagPeopleProps {
  onTagsChange: (tags: { userId: string; username: string }[]) => void;
  maxTags?: number;
}

export default function TagPeople({ onTagsChange, maxTags = 10 }: TagPeopleProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [taggedUsers, setTaggedUsers] = useState<{ userId: string; username: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debouncedSearch = useDebounce(searchQuery, 300);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setError(null);
  };

  useEffect(() => {
    let isMounted = true;

    const searchUsers = async () => {
      // Only search if @ is present
      if (!debouncedSearch.startsWith('@')) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      // Remove @ from search query
      const searchWithoutAt = debouncedSearch.slice(1).trim();
      
      if (!searchWithoutAt) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      if (!isMounted) return;
      setIsSearching(true);
      setError(null);
      
      try {
        console.log(`Searching for users with query: ${searchWithoutAt}`);
        // Use the mutual followers API endpoint
        const response = await fetch(`/api/users/search/mutual?q=${encodeURIComponent(searchWithoutAt)}`);
        
        if (!response.ok) {
          console.error(`Search failed with status: ${response.status}`);
          const errorText = await response.text();
          throw new Error(errorText || "Failed to search users");
        }
        
        const data = await response.json();
        console.log(`Search results:`, data);
        
        if (!isMounted) return;
        
        // Filter out already tagged users
        const filteredResults = Array.isArray(data) 
          ? data.filter(user => !taggedUsers.some(tagged => tagged.userId === user.id))
          : [];
        
        setSearchResults(filteredResults);
        setError(null);
      } catch (error) {
        console.error("Error searching users:", error);
        if (isMounted) {
          setError(error instanceof Error ? error.message : "Failed to search users");
          setSearchResults([]);
        }
      } finally {
        if (isMounted) {
          setIsSearching(false);
        }
      }
    };

    searchUsers();

    return () => {
      isMounted = false;
    };
  }, [debouncedSearch, taggedUsers]);

  const handleTagUser = (user: User) => {
    if (taggedUsers.length >= maxTags) {
      return;
    }

    const newTaggedUsers = [
      ...taggedUsers,
      { userId: user.id, username: user.username || "" }
    ];
    
    setTaggedUsers(newTaggedUsers);
    onTagsChange(newTaggedUsers);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleRemoveTag = (userId: string) => {
    const newTaggedUsers = taggedUsers.filter(user => user.userId !== userId);
    setTaggedUsers(newTaggedUsers);
    onTagsChange(newTaggedUsers);
  };

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setSearchResults([]);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="w-full" ref={searchContainerRef}>
      <div className="relative flex items-center rounded-sm border border-neutral-200 dark:border-neutral-800 px-3 py-2">
        <Users2 className="h-4 w-4 text-neutral-500 dark:text-neutral-400 mr-2" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search people to tag... (use @ to find people you follow)"
          value={searchQuery}
          onChange={handleSearchChange}
          className={cn(
            "w-full bg-transparent border-none text-sm text-neutral-800 dark:text-neutral-200",
            "placeholder:text-neutral-500 dark:placeholder:text-neutral-400",
            "focus-visible:ring-0 focus-visible:ring-offset-0 p-0",
            taggedUsers.length >= maxTags && "opacity-50 cursor-not-allowed"
          )}
          disabled={taggedUsers.length >= maxTags}
        />
        
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-neutral-500" />
          </div>
        )}
      </div>

      {searchResults.length > 0 && (
        <>
          <div 
            className="fixed inset-0 z-[9998]"
            onClick={() => {
              setSearchResults([]);
              setSearchQuery("");
            }}
          />
          <div 
            className="absolute z-[9999] w-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md shadow-lg max-h-[200px] overflow-auto mt-1 left-0 top-[calc(100%+4px)]"
          >
            {searchResults.map((user) => (
              <button
                key={user.id}
                onClick={() => handleTagUser(user)}
                className="w-full px-4 py-2 flex items-center gap-3 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              >
                <UserAvatar user={user} className="h-8 w-8" />
                <div className="flex-1 text-left">
                  <p className="font-semibold text-sm">{user.username}</p>
                  {user.name && (
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">{user.name}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {searchResults.length === 0 && searchQuery.startsWith('@') && !isSearching && debouncedSearch.length > 1 && (
        <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 px-2">
          No users found. Try a different search.
        </div>
      )}

      {error && searchQuery.startsWith('@') && !isSearching && (
        <p className="text-xs text-red-500 mt-1 px-2">{error}</p>
      )}

      {taggedUsers.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {taggedUsers.map((user) => (
            <div
              key={user.userId}
              className="group flex items-center gap-1.5 px-2.5 py-1 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-full transition-colors"
            >
              <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                {user.username}
              </span>
              <button
                onClick={() => handleRemoveTag(user.userId)}
                className="text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 transition-colors"
                aria-label={`Remove ${user.username} from tags`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 