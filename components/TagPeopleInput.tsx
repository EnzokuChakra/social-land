import { useEffect, useState } from "react";
import { User } from "@prisma/client";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import UserAvatar from "./UserAvatar";
import VerifiedBadge from "./VerifiedBadge";
import { X } from "lucide-react";

interface TagPeopleInputProps {
  onTagsChange: (tags: { id: string; username: string }[]) => void;
  following: User[];
}

export default function TagPeopleInput({ onTagsChange, following }: TagPeopleInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<{ id: string; username: string }[]>([]);

  // Filter following based on search
  const filteredFollowing = following.filter((user) => {
    if (!user.username) return false;
    const matchesSearch = user.username.toLowerCase().includes(search.toLowerCase());
    const notAlreadyTagged = !selectedTags.find((tag) => tag.id === user.id);
    return matchesSearch && notAlreadyTagged;
  });

  // Update parent component when tags change
  useEffect(() => {
    onTagsChange(selectedTags);
  }, [selectedTags, onTagsChange]);

  const handleSelect = (user: User) => {
    if (selectedTags.length >= 10) return;
    setSelectedTags([...selectedTags, { id: user.id, username: user.username! }]);
    setSearch("");
    setOpen(false);
  };

  const removeTag = (userId: string) => {
    setSelectedTags(selectedTags.filter((tag) => tag.id !== userId));
  };

  return (
    <div className="w-full space-y-2">
      <div className="flex flex-wrap gap-2">
        {selectedTags.map((tag) => (
          <div
            key={tag.id}
            className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded-full"
          >
            <span className="text-sm">{tag.username}</span>
            <button
              onClick={() => removeTag(tag.id)}
              className="hover:text-red-500 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button 
            onClick={() => setOpen(true)}
            className="w-full text-left text-sm text-neutral-500 dark:text-neutral-400 py-2 px-2 rounded-md border border-neutral-200 dark:border-neutral-800"
          >
            {selectedTags.length === 0 ? "Tag people" : "Add more tags"}
          </button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-64" align="start">
          <Command>
            <CommandInput
              placeholder="Search people..."
              value={search}
              onValueChange={(value) => {
                setSearch(value);
                if (!open) setOpen(true);
              }}
              className="border-none focus:ring-0"
              autoFocus
            />
            <CommandEmpty>No people found.</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {filteredFollowing.map((user) => (
                <CommandItem
                  key={user.id}
                  value={user.username!}
                  onSelect={() => handleSelect(user)}
                  className="flex items-center gap-2 p-2 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <UserAvatar user={user} className="h-8 w-8" />
                  <div className="flex items-center gap-1">
                    <span className="font-medium">{user.username}</span>
                    {user.verified && <VerifiedBadge className="h-3.5 w-3.5" />}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
} 