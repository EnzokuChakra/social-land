"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";

export function ThemeSwitch() {
  const { theme, setTheme } = useTheme();

  const handleThemeChange = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
  };

  return (
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
  );
} 