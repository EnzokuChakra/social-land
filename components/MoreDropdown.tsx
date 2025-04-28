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
  LogOut,
  Menu,
  Moon,
  Settings,
  Sun,
  BadgeCheckIcon,
  Globe,
  ChevronLeft,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { useRef, useState, useEffect } from "react";
import { Button } from "./ui/button";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/hooks/use-language";
import { useTranslation } from "@/hooks/use-translation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

function MoreDropdown() {
  const [open, setOpen] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const router = useRouter();
  const { language, setLanguage, showLanguageToggle, setShowLanguageToggle } = useLanguage();
  const { t } = useTranslation();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleThemeChange = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
  };

  const handleLanguageChange = () => {
    setLanguage(language === "ro" ? "en" : "ro");
  };

  if (!mounted) return null;

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
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
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowThemeModal(true);
              setOpen(false);
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
            className="flex items-center gap-2 p-3 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800/50"
            onClick={() => {
              setShowLanguageToggle(true);
              setOpen(false);
            }}
          >
            <Globe size={20} />
            <p>{t("common.language")}</p>
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

      <Dialog open={showThemeModal} onOpenChange={setShowThemeModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex items-center border-b border-neutral-200 dark:border-neutral-800 py-3.5 px-3">
              <ChevronLeft className="w-5 h-5 cursor-pointer" onClick={() => {
                window.console.log('=== Theme Switch Modal Back Button Clicked ===');
                window.console.log('Current modal state:', {
                  showThemeModal,
                  theme,
                  mounted
                });
                window.console.log('=== End Theme Switch Modal Log ===');
                setShowThemeModal(false);
                setOpen(true);
              }} />
              <p className="font-semibold ml-2">Switch appearance</p>
            </div>
          </DialogHeader>
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
        </DialogContent>
      </Dialog>

      {showLanguageToggle && (
        <>
          <div className="flex items-center border-b border-gray-200 dark:border-neutral-700 py-3.5 px-2.5">
            <ChevronLeft 
              size={18} 
              onClick={() => {
                setShowLanguageToggle(false);
                setOpen(false);
              }} 
              className="cursor-pointer" 
            />
            <p className="font-bold ml-1">{t("common.language")}</p>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="language-toggle" className="text-sm">
                {language === "ro" ? "Română" : "English"}
              </Label>
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
    </>
  );
}

export default MoreDropdown;
