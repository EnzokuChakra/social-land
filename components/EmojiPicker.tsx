"use client";

import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { Smile } from "lucide-react";
import { useTheme } from "next-themes";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { useState, useRef } from "react";

interface EmojiPickerProps {
  onChange: (emoji: string) => void;
}

export function EmojiPicker({ onChange }: EmojiPickerProps) {
  const { resolvedTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const handleEmojiSelect = (emoji: any) => {
    onChange(emoji.native);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Smile className="w-5 h-5 text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer transition-colors" />
      </PopoverTrigger>
      <PopoverContent 
        className="w-full p-0 border-none !bg-transparent !shadow-none" 
        side="right" 
        sideOffset={40}
      >
        <div 
          ref={pickerRef}
          className="max-h-[400px] overflow-y-auto bg-white dark:bg-black rounded-md"
          onWheel={(e) => e.stopPropagation()}
        >
          <Picker
            theme={resolvedTheme}
            data={data}
            onEmojiSelect={handleEmojiSelect}
            style={{ width: '100%' }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
} 