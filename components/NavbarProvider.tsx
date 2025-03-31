"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface NavbarContextType {
  navbarWidth: number;
  setNavbarWidth: (width: number) => void;
}

const NavbarContext = createContext<NavbarContextType | undefined>(undefined);

export function useNavbar() {
  const context = useContext(NavbarContext);
  if (context === undefined) {
    throw new Error("useNavbar must be used within a NavbarProvider");
  }
  return context;
}

interface NavbarProviderProps {
  children: ReactNode;
}

export function NavbarProvider({ children }: NavbarProviderProps) {
  const [navbarWidth, setNavbarWidth] = useState(240); // Default width in pixels

  return (
    <NavbarContext.Provider value={{ navbarWidth, setNavbarWidth }}>
      {children}
    </NavbarContext.Provider>
  );
} 