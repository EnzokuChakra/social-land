"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  Activity,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  Moon,
  Settings,
  Sun,
  BadgeCheckIcon,
  Globe,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/hooks/use-language";
import { useTranslation } from "@/hooks/use-translation";

function MoreDropdown() {
  const [showModeToggle, setShowModeToggle] = useState(false);
  const [showLanguageToggle, setShowLanguageToggle] = useState(false);
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const ref = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();

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

  useEffect(() => {
    // Close the dropdown when the user clicks outside
    function handleOutsideClick(event: MouseEvent) {
      if (!event.target) return;
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setShowModeToggle(false);
        setShowLanguageToggle(false);
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [ref]);

  useEffect(() => {
    // Ensure theme is set to dark by default
    if (!theme || theme === 'system') {
      setTheme('dark');
    }
  }, [theme, setTheme]);

  return (
    <DropdownMenu open={open}>
      <DropdownMenuTrigger asChild>
        <Button
          onClick={() => setOpen(!open)}
          variant={"ghost"}
          size={"lg"}
          className="md:w-full !justify-start space-x-2 !px-3"
        >
          <Menu />
          <div className="hidden lg:block">{t("common.more")}</div>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        ref={ref}
        className={cn(
          "dark:bg-black w-64 !rounded-xl !p-0 transition-opacity",
          !open && "opacity-0"
        )}
        align="end"
        alignOffset={-40}
      >
        {!showModeToggle && !showLanguageToggle && (
          <>
            <DropdownMenuItem
              className="flex items-center gap-2 p-3 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800/50"
              onClick={() => {
                router.push("/dashboard/edit-profile");
                setOpen(false);
              }}
            >
              <Settings size={20} />
              <p>{t("common.editProfile")}</p>
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="flex items-center gap-2 p-3 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800/50"
              onClick={() => {
                router.push("/dashboard/activity");
                setOpen(false);
              }}
            >
              <Activity size={20} />
              <p>{t("common.yourActivity")}</p>
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="flex items-center gap-2 p-3 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800/50"
              onClick={() => {
                if (session?.user?.username) {
                  router.push(`/dashboard/${session.user.username}/saved`);
                  setOpen(false);
                }
              }}
            >
              <Bookmark size={20} />
              <p>{t("common.saved")}</p>
            </DropdownMenuItem>

            {profile?.verified ? (
              <DropdownMenuItem
                className="flex items-center gap-2 p-3 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800/50"
                onClick={() => {
                  router.push("/dashboard/verify");
                  setOpen(false);
                }}
              >
                <BadgeCheckIcon size={20} className="text-green-500" />
                <p className="text-green-500 font-semibold">Verified Account</p>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                className="flex items-center gap-2 p-3 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800/50"
                onClick={() => {
                  router.push("/dashboard/verify");
                  setOpen(false);
                }}
              >
                <BadgeCheckIcon size={20} className="text-blue-500" />
                <p className="text-blue-500 font-semibold">Get Verified</p>
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator className="dark:border-neutral-700" />

            <DropdownMenuItem
              className="flex items-center gap-2 p-3 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800/50"
              onClick={() => setShowModeToggle(true)}
            >
              {theme === "dark" ? (
                <Moon size={20} />
              ) : (
                <Sun size={20} />
              )}
              <p>{t("common.switchAppearance")}</p>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex items-center gap-2 p-3 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800/50"
              onClick={() => setShowLanguageToggle(true)}
            >
              <Globe size={20} />
              <p>{t("common.language")}</p>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex items-center gap-2 p-3 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800/50 text-red-500"
              onClick={() => signOut()}
            >
              <LogOut size={20} />
              <p>{t("common.logout")}</p>
            </DropdownMenuItem>
          </>
        )}

        {showModeToggle && (
          <>
            <div className="flex items-center border-b border-gray-200 dark:border-neutral-700 py-3.5 px-2.5">
              <ChevronLeft size={18} onClick={() => setShowModeToggle(false)} className="cursor-pointer" />
              <p className="font-bold ml-1">{t("common.switchAppearance")}</p>
            </div>
            <div className="p-6">
              <Label htmlFor="dark-mode">{theme === "dark" ? "Dark" : "Light"} mode</Label>
              <div className="flex items-center space-x-2 mt-4">
                <Switch
                  id="dark-mode"
                  checked={theme === "dark"}
                  defaultChecked={true}
                  onCheckedChange={(checked) => {
                    setTheme(checked ? "dark" : "light");
                  }}
                />
              </div>
            </div>
          </>
        )}

        {showLanguageToggle && (
          <>
            <div className="flex items-center border-b border-gray-200 dark:border-neutral-700 py-3.5 px-2.5">
              <ChevronLeft size={18} onClick={() => setShowLanguageToggle(false)} className="cursor-pointer" />
              <p className="font-bold ml-1">{t("common.language")}</p>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <Label htmlFor="language-toggle">RO / EN</Label>
                <Switch
                  id="language-toggle"
                  checked={language === "ro"}
                  onCheckedChange={(checked) => {
                    setLanguage(checked ? "ro" : "en");
                  }}
                />
              </div>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default MoreDropdown;
