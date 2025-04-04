"use client";

import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { Smile } from "lucide-react";
import { useTheme } from "next-themes";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

interface EmojiPickerProps {
  onChange: (emoji: string) => void;
}

export function EmojiPicker({ onChange }: EmojiPickerProps) {
  const { resolvedTheme } = useTheme();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Smile className="w-5 h-5 text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer transition-colors" />
      </PopoverTrigger>
      <PopoverContent 
        className="w-full p-0 border-none" 
        side="right" 
        sideOffset={40}
      >
        <Picker
          theme={resolvedTheme}
          data={data}
          onEmojiSelect={(emoji: any) => onChange(emoji.native)}
        />
      </PopoverContent>
    </Popover>
  );
} 