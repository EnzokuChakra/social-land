"use client";

import Link from "next/link";
import { Calendar, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  Settings,
  Activity,
  Bookmark,
  Moon,
  Sun,
  Globe,
  LogOut,
  ChevronLeft,
  BadgeCheckIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";

export default function MobileHeader() {
  const router = useRouter();
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const [showModeToggle, setShowModeToggle] = useState(false);
  const [showLanguageToggle, setShowLanguageToggle] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadProfile() {
      if (session?.user?.username) {
        try {
          const response = await fetch('/api/profile');
          if (!response.ok) {
            throw new Error('Failed to fetch profile');
          }
          const data = await response.json();
          setProfile(data);
        } catch (error) {
          console.error('Error loading profile:', error);
        }
      }
    }
    loadProfile();
  }, [session?.user?.username]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-14 bg-white dark:bg-black border-b border-neutral-200 dark:border-neutral-800 md:hidden">
      <div className="flex-1">
        <h1 className="font-bold text-xl">Social Land</h1>
      </div>
      <div className="flex items-center gap-2">
        <DropdownMenu open={showDropdown} onOpenChange={setShowDropdown}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
            >
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            ref={dropdownRef}
            className={cn(
              "w-64 dark:bg-black !rounded-xl !p-0",
              !showDropdown && "opacity-0"
            )}
            align="end"
          >
            {!showModeToggle && !showLanguageToggle && (
              <>
                <DropdownMenuItem
                  className="flex items-center gap-2 p-3 cursor-pointer"
                  onClick={() => {
                    router.push("/dashboard/edit-profile");
                    setShowDropdown(false);
                  }}
                >
                  <Settings className="w-5 h-5" />
                  <p>Edit Profile</p>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="flex items-center gap-2 p-3 cursor-pointer"
                  onClick={() => {
                    router.push("/dashboard/activity");
                    setShowDropdown(false);
                  }}
                >
                  <Activity className="w-5 h-5" />
                  <p>Your Activity</p>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="flex items-center gap-2 p-3 cursor-pointer"
                  onClick={() => {
                    if (session?.user?.username) {
                      router.push(`/dashboard/${session.user.username}/saved`);
                      setShowDropdown(false);
                    }
                  }}
                >
                  <Bookmark className="w-5 h-5" />
                  <p>Saved</p>
                </DropdownMenuItem>

                {profile?.verified ? (
                  <DropdownMenuItem
                    className="flex items-center gap-2 p-3 cursor-pointer"
                    onClick={() => {
                      router.push("/dashboard/verify");
                      setShowDropdown(false);
                    }}
                  >
                    <BadgeCheckIcon className="w-5 h-5 text-green-500" />
                    <p className="text-green-500 font-semibold">Verified Account</p>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    className="flex items-center gap-2 p-3 cursor-pointer"
                    onClick={() => {
                      router.push("/dashboard/verify");
                      setShowDropdown(false);
                    }}
                  >
                    <BadgeCheckIcon className="w-5 h-5 text-blue-500" />
                    <p className="text-blue-500 font-semibold">Get Verified</p>
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem
                  className="flex items-center gap-2 p-3 cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowModeToggle(true);
                  }}
                  onSelect={(e) => {
                    e.preventDefault();
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
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowLanguageToggle(true);
                  }}
                  onSelect={(e) => {
                    e.preventDefault();
                  }}
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
                  <ChevronLeft className="w-5 h-5 cursor-pointer" onClick={() => setShowModeToggle(false)} />
                  <p className="font-semibold ml-2">Appearance</p>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="dark-mode">Dark mode</Label>
                    <Switch
                      id="dark-mode"
                      checked={theme === "dark"}
                      onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                    />
                  </div>
                </div>
              </>
            )}

            {showLanguageToggle && (
              <>
                <div className="flex items-center border-b border-neutral-200 dark:border-neutral-800 py-3.5 px-3">
                  <ChevronLeft className="w-5 h-5 cursor-pointer" onClick={() => setShowLanguageToggle(false)} />
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
    </header>
  );
} 