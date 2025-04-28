"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useMediaQuery } from "./use-media-query";

interface NavbarContextType {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
  navbarWidth: number;
}

const NavbarContext = createContext<NavbarContextType | undefined>(undefined);

export function NavbarProvider({ children }: { children: ReactNode }) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [isCollapsed, setIsCollapsed] = useState(isMobile);
  const [navbarWidth, setNavbarWidth] = useState(isMobile ? 0 : 240);

  useEffect(() => {
    setIsCollapsed(isMobile);
    setNavbarWidth(isMobile ? 0 : 240);
  }, [isMobile]);

  return (
    <NavbarContext.Provider value={{ isCollapsed, setIsCollapsed, navbarWidth }}>
      {children}
    </NavbarContext.Provider>
  );
}

export function useNavbar() {
  const context = useContext(NavbarContext);
  if (context === undefined) {
    throw new Error("useNavbar must be used within a NavbarProvider");
  }
  return context;
} 