"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes/dist/types";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  React.useEffect(() => {
    const handleThemeChange = () => {
      document.body.setAttribute('data-theme-transitioning', 'true');
      
      setTimeout(() => {
        document.body.removeAttribute('data-theme-transitioning');
      }, 300);
    };

    // Listen for theme changes
    window.addEventListener('theme-change', handleThemeChange);
    
    return () => {
      window.removeEventListener('theme-change', handleThemeChange);
    };
  }, []);

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      storageKey="theme-preference"
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
