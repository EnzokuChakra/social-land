"use client";

import { useNavbar } from "@/lib/hooks/use-navbar";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { cn } from "@/lib/utils";
import AdminNav from "./AdminNav";

export default function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useNavbar();
  const isMobile = useMediaQuery("(max-width: 768px)");

  return (
    <div className={cn(
      "flex flex-col min-h-screen bg-white dark:bg-black",
      "transition-all duration-300 ease-in-out"
    )}>
      <div className="flex-1 container max-w-7xl mx-auto px-4 py-6 lg:px-8">
        <AdminNav />
        <main className="mt-6">
          {children}
        </main>
      </div>
    </div>
  );
} 