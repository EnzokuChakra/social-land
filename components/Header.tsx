"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import { MoreHorizontal, Settings, Activity, Moon, Sun, Globe, LogOut, ChevronLeft } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useLanguage } from "@/hooks/use-language";
import { useTranslation } from "@/hooks/use-translation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";

function Header() {
  const { data: session } = useSession();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, showLanguageToggle, setShowLanguageToggle } = useLanguage();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showModeToggle, setShowModeToggle] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");
  const { t } = useTranslation();

  if (!isMobile) return null;

  const handleThemeChange = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-black border-b border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center justify-between h-14 px-4">
        <Link href="/" className="font-bold text-xl">
          Social Land
        </Link>

        <DropdownMenu open={showDropdown} onOpenChange={setShowDropdown}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-64 dark:bg-black !rounded-xl !p-0"
            align="end"
            alignOffset={-40}
          >
            {!showModeToggle && !showLanguageToggle && (
              <>
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
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowModeToggle(true);
                    setShowDropdown(false);
                  }}
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
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowLanguageToggle(true);
                    setShowDropdown(false);
                  }}
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
                  <p>Log out</p>
                </DropdownMenuItem>
              </>
            )}

            {showModeToggle && (
              <>
                <div className="flex items-center border-b border-neutral-200 dark:border-neutral-800 py-3.5 px-3">
                  <ChevronLeft className="w-5 h-5 cursor-pointer" onClick={() => {
                    setShowModeToggle(false);
                    setShowDropdown(true);
                  }} />
                  <p className="font-semibold ml-2">Switch appearance</p>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {theme === "dark" ? (
                        <Moon className="w-5 h-5" />
                      ) : (
                        <Sun className="w-5 h-5" />
                      )}
                      <Label className="cursor-pointer">
                        {theme === "dark" ? "Dark" : "Light"} mode
                      </Label>
                    </div>
                    <Switch
                      checked={theme === "dark"}
                      onCheckedChange={handleThemeChange}
                    />
                  </div>
                </div>
              </>
            )}

            {showLanguageToggle && (
              <>
                <div className="flex items-center border-b border-neutral-200 dark:border-neutral-800 py-3.5 px-3">
                  <ChevronLeft className="w-5 h-5 cursor-pointer" onClick={() => {
                    setShowLanguageToggle(false);
                    setShowDropdown(true);
                  }} />
                  <p className="font-semibold ml-2">{t("common.language")}</p>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="language-toggle" className="text-sm">
                      {language === "ro" ? "Română" : "English"}
                    </Label>
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

export default Header;
