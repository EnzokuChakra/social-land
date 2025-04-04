"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useMediaQuery } from "./use-media-query";

interface NavbarContextType {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
  navbarWidth: string;
}

const NavbarContext = createContext<NavbarContextType | null>(null);

export function NavbarProvider({ children }: { children: React.ReactNode }) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsCollapsed(isMobile);
  }, [isMobile]);

  const navbarWidth = mounted ? (isMobile ? "0px" : isCollapsed ? "88px" : "245px") : "245px";

  return (
    <NavbarContext.Provider value={{ isCollapsed, setIsCollapsed, navbarWidth }}>
      {children}
    </NavbarContext.Provider>
  );
}

export function useNavbar() {
  const context = useContext(NavbarContext);
  if (!context) {
    throw new Error("useNavbar must be used within a NavbarProvider");
  }
  return context;
} 