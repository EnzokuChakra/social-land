"use client";

import Navbar from "@/components/Navbar";
import { ProfileProvider } from "@/lib/contexts/profile-context";
import { NavbarProvider } from "@/lib/hooks/use-navbar";
import { HydrationSafeDiv } from "@/components/HydrationSafeDiv";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProfileProvider>
      <NavbarProvider>
        <HydrationSafeDiv className="relative min-h-screen">
          <Navbar />
          {children}
        </HydrationSafeDiv>
      </NavbarProvider>
    </ProfileProvider>
  );
}
