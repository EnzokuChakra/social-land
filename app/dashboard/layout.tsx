"use client";

import Navbar from "@/components/Navbar";
import { ProfileProvider } from "@/lib/contexts/profile-context";
import { NavbarProvider } from "@/lib/hooks/use-navbar";
import { useNavbar } from "@/lib/hooks/use-navbar";
import { cn } from "@/lib/utils";

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useNavbar();
  
  return (
    <div className="flex min-h-screen bg-white dark:bg-black">
      <Navbar />
      <main className={cn(
        "flex-1 transition-all duration-300 ease-in-out",
        "md:ml-[88px] lg:ml-[245px]",
        isCollapsed && "lg:ml-[88px]",
        "w-full md:w-[calc(100%-88px)] lg:w-[calc(100%-245px)]",
        isCollapsed && "lg:w-[calc(100%-88px)]"
      )}>
        {children}
      </main>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProfileProvider>
      <NavbarProvider>
        <DashboardLayoutContent>
          {children}
        </DashboardLayoutContent>
      </NavbarProvider>
    </ProfileProvider>
  );
}
