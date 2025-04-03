"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import { MoreHorizontal, Settings, Activity, Moon, Sun, Globe, LogOut } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useLanguage } from "@/hooks/use-language";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { useMediaQuery } from "@/lib/hooks/use-media-query";

function Header() {
  const { data: session } = useSession();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, showLanguageToggle, setShowLanguageToggle } = useLanguage();
  const [showDropdown, setShowDropdown] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");

  if (!isMobile) return null;

  return (
    <header className="fixed top-0 left-0 right-0 bg-white dark:bg-black border-b border-zinc-300 dark:border-neutral-700 z-50 md:hidden">
      <div className="flex items-center justify-between px-4 h-16">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center">
          <span className="font-bold text-xl text-white">
            Social Land
          </span>
        </Link>

        {/* More Menu */}
        <DropdownMenu open={showDropdown} onOpenChange={setShowDropdown}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            className="w-64 dark:bg-black !rounded-xl !p-0"
            align="end"
            alignOffset={-40}
          >
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
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="flex items-center gap-2 p-3 cursor-pointer"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
              <p>{theme === "dark" ? "Light Mode" : "Dark Mode"}</p>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex items-center gap-2 p-3 cursor-pointer"
              onClick={() => setShowLanguageToggle(true)}
            >
              <Globe className="w-5 h-5" />
              <p>Language</p>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="flex items-center gap-2 p-3 cursor-pointer text-red-500"
              onClick={() => signOut()}
            >
              <LogOut className="w-5 h-5" />
              <p>Log Out</p>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export default Header;
