import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import Image from "next/image";

interface User {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  verified: boolean;
}

interface SearchUsersProps {
  onClose?: () => void;
}

export default function SearchUsers({ onClose }: SearchUsersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 500);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const searchUsers = async () => {
      if (!debouncedSearch.trim()) {
        setUsers([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(`/api/search/users?q=${encodeURIComponent(debouncedSearch)}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || "Failed to search users");
        }

        setUsers(data);
        setIsOpen(true);
      } catch (error) {
        console.error("Search error:", error);
        setUsers([]);
      } finally {
        setIsLoading(false);
      }
    };

    searchUsers();
  }, [debouncedSearch]);

  const handleUserClick = (username: string) => {
    router.push(`/dashboard/${username}`);
    setIsOpen(false);
    setSearchQuery("");
    onClose?.();
  };

  return (
    <div className="relative w-full max-w-md" ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          className="pl-8 pr-8"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onClick={(e) => e.preventDefault()}
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
            onClick={(e) => {
              e.preventDefault();
              setSearchQuery("");
              setUsers([]);
              setIsOpen(false);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isOpen && (searchQuery || isLoading) && (
        <div className="absolute top-full w-full bg-background border rounded-lg mt-2 shadow-lg z-50 max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : users.length > 0 ? (
            <div className="py-2">
              {users.map((user) => (
                <button
                  key={user.id}
                  className="w-full text-start px-4 py-2 hover:bg-muted flex items-center gap-3"
                  onClick={(e) => {
                    e.preventDefault();
                    handleUserClick(user.username);
                  }}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.image || "/images/profile_placeholder.webp"} alt={user.username || ""} />
                    <AvatarFallback>
                      <Image
                        src="/images/profile_placeholder.webp"
                        alt={user.username || ""}
                        width={40}
                        height={40}
                        className="object-cover"
                      />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start">
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{user.username}</span>
                      {user.verified && (
                        <Badge variant="secondary" className="h-5 w-5 p-0.5">
                          ✓
                        </Badge>
                      )}
                    </div>
                    {user.name && (
                      <span className="text-sm text-muted-foreground">
                        {user.name}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-muted-foreground">
              No users found
            </div>
          )}
        </div>
      )}
    </div>
  );
} 